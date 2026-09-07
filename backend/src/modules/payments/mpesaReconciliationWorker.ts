import { randomUUID } from "node:crypto";
import { env } from "../../config/index.js";
import { logger } from "../../common/utils/logger.js";
import { PaymentsRepository } from "./payments.repository.js";
import { PaymentsService } from "./payments.service.js";

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
      await this.processCallbacks();
      await this.reconcileTransactions();
    } finally {
      this.running = false;
    }
  }

  private async processCallbacks() {
    const now = new Date();
    const leaseUntil = new Date(now.getTime() + env.MPESA_RECONCILIATION_LEASE_SECONDS * 1000);
    for (let count = 0; count < 20; count += 1) {
      const event = await this.repository.claimNextCallbackInboxEvent(this.workerId, now, leaseUntil);
      if (!event) return;
      try {
        await this.paymentsService.processCallbackInboxEvent(event.id);
      } catch (error) {
        logger.error("M-Pesa callback worker failed", {
          callbackEventId: event.id,
          checkoutRequestId: event.checkoutRequestId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  private async reconcileTransactions() {
    const now = new Date();
    const leaseUntil = new Date(now.getTime() + env.MPESA_RECONCILIATION_LEASE_SECONDS * 1000);
    const ids = await this.repository.listDueMpesaTransactionIds(now, 20);
    for (const id of ids) {
      const transaction = await this.repository.claimMpesaTransaction(id, this.workerId, now, leaseUntil);
      if (!transaction) continue;
      try {
        await this.paymentsService.reverifyMpesaTransaction(id);
        await this.repository.releaseReconciliationLease(id);
      } catch (error) {
        const attempts = transaction.reconciliationAttemptCount + 1;
        const backoffMinutes = [0.5, 2, 5, 15, 30, 60][Math.min(attempts - 1, 5)] ?? 60;
        await this.repository.recordReconciliationFailure(id, {
          nextAttemptAt: new Date(Date.now() + backoffMinutes * 60 * 1000),
          error: error instanceof Error ? error.message : String(error),
          manualReview: attempts >= env.MPESA_RECONCILIATION_MAX_ATTEMPTS,
        });
        logger.error("M-Pesa reconciliation failed", {
          paymentTransactionId: id,
          checkoutRequestId: transaction.externalRequestId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
}
