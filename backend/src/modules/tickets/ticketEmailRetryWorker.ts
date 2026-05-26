import { logger } from "../../common/utils/logger.js";
import { env } from "../../config/index.js";
import { TicketsService } from "./tickets.service.js";

export class TicketEmailRetryWorker {
  private sweepHandle: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;

  constructor(private readonly ticketsService: TicketsService = new TicketsService()) {}

  start() {
    if (!env.EMAIL_DELIVERY_RETRY_ENABLED) {
      logger.info("Ticket email retry worker disabled by configuration.");
      return;
    }

    this.sweepHandle = setInterval(() => {
      void this.runOnce();
    }, env.EMAIL_DELIVERY_RETRY_SWEEP_INTERVAL_SECONDS * 1000);

    void this.runOnce();
  }

  stop() {
    if (!this.sweepHandle) return;
    clearInterval(this.sweepHandle);
    this.sweepHandle = null;
  }

  async runOnce() {
    if (this.isRunning || !env.EMAIL_DELIVERY_ENABLED || !env.EMAIL_DELIVERY_RETRY_ENABLED) {
      return;
    }

    this.isRunning = true;

    try {
      const orderIds = await this.ticketsService.listDueTicketEmailDeliveryOrderIds(new Date());

      for (const orderId of orderIds) {
        try {
          await this.ticketsService.attemptTicketEmailDelivery(orderId, "AUTOMATIC");
        } catch (error) {
          logger.error("Automatic ticket email retry failed", {
            orderId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      if (orderIds.length > 0) {
        logger.info("Ticket email retry sweep completed", { processed: orderIds.length });
      }
    } finally {
      this.isRunning = false;
    }
  }
}
