import "dotenv/config";
import { createApp } from "./app.js";
import { env } from "./config/index.js";
import { logger } from "./common/utils/logger.js";
import { prisma } from "./lib/prisma.js";
import { OrdersRepository } from "./modules/orders/orders.repository.js";
import { PaymentsRepository } from "./modules/payments/payments.repository.js";

async function start() {
  try {
    await prisma.$connect();
    logger.info("Prisma connected.");

    const ordersRepository = new OrdersRepository();
    const paymentsRepository = new PaymentsRepository();
    const sweepHandle = setInterval(() => {
      const now = new Date();
      Promise.all([
        ordersRepository.expirePendingOrders(now),
        paymentsRepository.markPendingMpesaTransactionsFailedForExpiredOrders(now),
      ]).catch((error) => {
        logger.error("Background payment/order sweep failed", error);
      });
    }, env.ORDER_EXPIRY_SWEEP_INTERVAL_SECONDS * 1000);

    const app = createApp();
    const server = app.listen(env.PORT, () => {
      logger.info(`Backend scaffold listening on http://localhost:${env.PORT}`);
    });

    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Shutting down...`);
      clearInterval(sweepHandle);
      server.close(async () => {
        await prisma.$disconnect();
        process.exit(0);
      });
    };

    process.on("SIGINT", () => void shutdown("SIGINT"));
    process.on("SIGTERM", () => void shutdown("SIGTERM"));
  } catch (error) {
    logger.error("Backend failed to start.", error);
    process.exit(1);
  }
}

void start();
