import { randomUUID } from "node:crypto";
import { env } from "../../config/index.js";
import { logger } from "../../common/utils/logger.js";
import { PaymentsRepository } from "./payments.repository.js";
import { DarajaRequestError, PaymentsService } from "./payments.service.js";

export class MpesaReconciliationWorker {
  private timer?: NodeJS.Timeout;
  private running = false;
  private readonly workerId = `mpesa-worker-${randomUUID()}`;

  constructor(
    private readonly repository = new PaymentsRepository(),
    private readonly paymentsService = new PaymentsService(repository),
  ) {}

  start() {
    if (!env.MPESA_RECONCILIATION_ENABLED || this.timer) return;
    this.timer = setInterval(() => void this.runOnce(), env.MPESA_RECONCILIATION_INTERVAL_SECONDS * 1000);
    void this.runOnce();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  async runOnce() {
    if (this.running) return;
    this.running = true;
    try {
      const callbackProcessed = await this.processCallbacks();
      // A successful callback may itself require a Daraja STK query. Do not
      // also start reconciliation queries in the same sweep.
      if (callbackProcessed) return;
      await this.reconcileTransactions();
    } finally {
      this.running = false;
    }
  }

  private async processCallbacks(): Promise<boolean> {
    const now = new Date();
    const leaseUntil = new Date(now.getTime() + env.MPESA_RECONCILIATION_LEASE_SECONDS * 1000);
    const event = await this.repository.claimNextCallbackInboxEvent(this.workerId, now, leaseUntil);
    if (!event) return false;
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
        await this.paymentsService.reverifyMpesaTransaction(id);
        await this.repository.releaseReconciliationLease(id);
      } catch (error) {
        const rateLimited = error instanceof DarajaRequestError && error.providerStatus === 429;
        const attempts = transaction.reconciliationAttemptCount + 1;
        const backoffMinutes = [0.5, 2, 5, 15, 30, 60][Math.min(attempts - 1, 5)] ?? 60;
        const nextAttemptAt = new Date(Date.now() + (rateLimited ? (error.retryAfterMs ?? 5 * 60_000) : backoffMinutes * 60_000));
        await this.repository.recordReconciliationFailure(id, {
          nextAttemptAt,
          error: error instanceof Error ? error.message : String(error),
          manualReview: !rateLimited && attempts >= env.MPESA_RECONCILIATION_MAX_ATTEMPTS,
          countAttempt: !rateLimited,
        });
        if (rateLimited) {
          await this.repository.deferDueMpesaTransactions(new Date(), nextAttemptAt);
          logger.warn("Deferred M-Pesa reconciliation because Daraja rate-limited status queries", {
            checkoutRequestId: transaction.externalRequestId,
            retryAt: nextAttemptAt.toISOString(),
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
