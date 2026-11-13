import { randomUUID } from "node:crypto";
import { env } from "../../config/index.js";
import { logger } from "../../common/utils/logger.js";
import { PaymentsRepository } from "./payments.repository.js";
import { DarajaRequestError, PaymentsService } from "./payments.service.js";
import { getMpesaReconciliationSchedule } from "./mpesaReconciliationPolicy.js";
import { registerMpesaReconciliationWakeListener } from "./mpesaReconciliationSignal.js";

export class MpesaReconciliationWorker {
  private timer?: NodeJS.Timeout;
  private running = false;
  private wakeRequested = false;
  private unregisterWakeListener?: () => void;
  private readonly workerId = `mpesa-worker-${randomUUID()}`;

  constructor(
    private readonly repository = new PaymentsRepository(),
    private readonly paymentsService = new PaymentsService(repository),
  ) {}

  start() {
    if (!env.MPESA_RECONCILIATION_ENABLED) {
      logger.info("M-Pesa reconciliation worker disabled by configuration.");
      return;
    }
    if (this.timer) return;
    logger.info("M-Pesa reconciliation worker enabled", {
      intervalSeconds: env.MPESA_RECONCILIATION_INTERVAL_SECONDS,
      maxAttempts: env.MPESA_RECONCILIATION_MAX_ATTEMPTS,
    });
    this.unregisterWakeListener = registerMpesaReconciliationWakeListener(() => this.wake());
    this.timer = setInterval(() => void this.runOnce(), env.MPESA_RECONCILIATION_INTERVAL_SECONDS * 1000);
    void this.runOnce();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    this.unregisterWakeListener?.();
    this.unregisterWakeListener = undefined;
  }

  wake() {
    this.wakeRequested = true;
    if (!this.running) void this.runOnce();
  }

  async runOnce() {
    if (this.running) return;
    this.running = true;
    this.wakeRequested = false;
    try {
      const callbackProcessed = await this.processCallbacks();
      // A successful callback may itself require a Daraja STK query. Do not
      // also start reconciliation queries in the same sweep.
      if (callbackProcessed) return;
      await this.reconcileTransactions();
    } catch (error) {
      logger.error("M-Pesa reconciliation worker cycle failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      this.running = false;
      if (this.wakeRequested) {
        queueMicrotask(() => {
          if (!this.running && this.wakeRequested) void this.runOnce();
        });
      }
    }
  }

  private async processCallbacks(): Promise<boolean> {
    const now = new Date();
    const leaseUntil = new Date(now.getTime() + env.MPESA_RECONCILIATION_LEASE_SECONDS * 1000);
    const event = await this.repository.claimNextCallbackInboxEvent(this.workerId, now, leaseUntil);
    if (!event) return false;
    logger.info("MPESA callback claimed", {
      callbackInboxEventId: event.id,
      checkoutRequestId: event.checkoutRequestId,
    });
    try {
      await this.paymentsService.processCallbackInboxEvent(event.id);
    } catch (error) {
      logger.error("M-Pesa callback worker failed", {
        callbackEventId: event.id,
        checkoutRequestId: event.checkoutRequestId,
        error: error instanceof Error ? error.message : String(error),
      });
      if (error instanceof DarajaRequestError && error.providerStatus === 429) {
        const nextAttemptAt = new Date(Date.now() + (error.retryAfterMs ?? 5 * 60_000));
        await this.repository.deferDueCallbackInboxEvents(new Date(), nextAttemptAt);
        await this.repository.deferDueMpesaTransactions(new Date(), nextAttemptAt);
        logger.warn("Deferred M-Pesa callbacks because Daraja rate-limited status queries", {
          retryAt: nextAttemptAt.toISOString(),
        });
      }
    }
    return true;
  }

  private async reconcileTransactions() {
    const now = new Date();
    const leaseUntil = new Date(now.getTime() + env.MPESA_RECONCILIATION_LEASE_SECONDS * 1000);
    // Process one status query per worker cycle instead of bursting through a
    // batch, which can trigger Daraja's rate limits when several payments are pending.
    const ids = await this.repository.listDueMpesaTransactionIds(now, 1);
    for (const id of ids) {
      const transaction = await this.repository.claimMpesaTransaction(id, this.workerId, now, leaseUntil);
      if (!transaction) continue;
      try {
        await this.paymentsService.reverifyMpesaTransaction(id, { source: "worker" });
        await this.repository.releaseReconciliationLease(id, this.workerId);
      } catch (error) {
        const rateLimited = error instanceof DarajaRequestError && error.providerStatus === 429;
        const schedule = getMpesaReconciliationSchedule({
          attemptCount: transaction.reconciliationAttemptCount,
          maxAttempts: env.MPESA_RECONCILIATION_MAX_ATTEMPTS,
          retryAfterMs: rateLimited ? (error.retryAfterMs ?? 5 * 60_000) : undefined,
        });
        const recordedFailure = await this.repository.recordReconciliationFailure(id, {
          nextAttemptAt: schedule.nextAttemptAt,
          error: error instanceof Error ? error.message : String(error),
          manualReview: schedule.manualReview,
          countAttempt: true,
          leaseOwner: this.workerId,
        });
        if (recordedFailure.count !== 1) {
          await this.repository.releaseReconciliationLease(id, this.workerId);
          logger.warn("Skipped stale M-Pesa reconciliation failure after a concurrent terminal update", {
            paymentTransactionId: id,
            checkoutRequestId: transaction.externalRequestId,
          });
          continue;
        }
        if (rateLimited) {
          const retryAt = schedule.nextAttemptAt ?? new Date(Date.now() + 5 * 60_000);
          await this.repository.deferDueMpesaTransactions(new Date(), retryAt);
          logger.warn("Deferred M-Pesa reconciliation because Daraja rate-limited status queries", {
            checkoutRequestId: transaction.externalRequestId,
            retryAt: retryAt.toISOString(),
          });
          return;
        }
        logger.error("M-Pesa reconciliation failed", {
          paymentTransactionId: id,
          checkoutRequestId: transaction.externalRequestId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
}
