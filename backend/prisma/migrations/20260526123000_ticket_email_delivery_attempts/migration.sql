ALTER TABLE `Order`
    ADD COLUMN `ticketDeliveryAttemptCount` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `ticketDeliveryLastAttemptAt` DATETIME(3) NULL,
    ADD COLUMN `ticketDeliveryNextRetryAt` DATETIME(3) NULL,
    ADD COLUMN `ticketDeliveryLastError` VARCHAR(500) NULL;

CREATE TABLE `TicketEmailDeliveryAttempt` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `trigger` ENUM('INITIAL', 'AUTOMATIC', 'MANUAL') NOT NULL,
    `status` ENUM('SENT', 'FAILED', 'SKIPPED') NOT NULL,
    `recipient` VARCHAR(191) NULL,
    `attemptNumber` INTEGER NOT NULL,
    `messageId` VARCHAR(255) NULL,
    `errorSummary` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `Order_ticketDeliveryStatus_ticketDeliveryNextRetryAt_idx` ON `Order`(`ticketDeliveryStatus`, `ticketDeliveryNextRetryAt`);
CREATE INDEX `TicketEmailDeliveryAttempt_orderId_createdAt_idx` ON `TicketEmailDeliveryAttempt`(`orderId`, `createdAt`);
CREATE INDEX `TicketEmailDeliveryAttempt_status_createdAt_idx` ON `TicketEmailDeliveryAttempt`(`status`, `createdAt`);
CREATE INDEX `TicketEmailDeliveryAttempt_trigger_createdAt_idx` ON `TicketEmailDeliveryAttempt`(`trigger`, `createdAt`);

ALTER TABLE `TicketEmailDeliveryAttempt`
    ADD CONSTRAINT `TicketEmailDeliveryAttempt_orderId_fkey`
    FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
