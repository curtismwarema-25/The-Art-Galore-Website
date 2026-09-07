-- Mission 02: durable M-Pesa callbacks, recoverable payment state, and idempotent ticket fulfillment.

ALTER TABLE `Order`
    ADD COLUMN `ticketFulfillmentStatus` ENUM('PENDING', 'PROCESSING', 'COMPLETE', 'FAILED', 'MANUAL_REVIEW') NOT NULL DEFAULT 'PENDING',
    ADD COLUMN `ticketFulfillmentAttemptCount` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `ticketFulfillmentNextAttemptAt` DATETIME(3) NULL,
    ADD COLUMN `ticketFulfillmentLastError` VARCHAR(500) NULL,
    ADD COLUMN `ticketFulfillmentLockedAt` DATETIME(3) NULL,
    ADD COLUMN `ticketFulfillmentLockedBy` VARCHAR(191) NULL;

ALTER TABLE `Ticket`
    ADD COLUMN `sequenceNumber` INTEGER NULL;

CREATE TEMPORARY TABLE `TicketSequenceBackfill` AS
SELECT `id`, ROW_NUMBER() OVER (PARTITION BY `orderItemId` ORDER BY `issuedAt`, `id`) AS `sequenceNumber`
FROM `Ticket`;

UPDATE `Ticket` AS t
JOIN `TicketSequenceBackfill` AS b ON b.`id` = t.`id`
SET t.`sequenceNumber` = b.`sequenceNumber`;

DROP TEMPORARY TABLE `TicketSequenceBackfill`;

ALTER TABLE `Ticket`
    MODIFY COLUMN `sequenceNumber` INTEGER NOT NULL;

CREATE UNIQUE INDEX `Ticket_orderItemId_sequenceNumber_key`
    ON `Ticket`(`orderItemId`, `sequenceNumber`);

ALTER TABLE `PaymentTransaction`
    MODIFY COLUMN `status` ENUM('INITIATED', 'PENDING', 'AMBIGUOUS', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'REFUNDED') NOT NULL DEFAULT 'INITIATED',
    ADD COLUMN `payerPhone` VARCHAR(32) NULL,
    ADD COLUMN `providerAccountKey` VARCHAR(191) NULL,
    ADD COLUMN `merchantRequestId` VARCHAR(191) NULL,
    ADD COLUMN `providerReceipt` VARCHAR(191) NULL,
    ADD COLUMN `providerConfirmedAt` DATETIME(3) NULL,
    ADD COLUMN `reconciliationAttemptCount` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `nextReconciliationAt` DATETIME(3) NULL,
    ADD COLUMN `reconciliationLockedAt` DATETIME(3) NULL,
    ADD COLUMN `reconciliationLockedBy` VARCHAR(191) NULL,
    ADD COLUMN `lastReconciliationError` VARCHAR(500) NULL;

-- Existing M-Pesa rows receive a deterministic legacy scope. Duplicate values intentionally
-- cause this migration to fail rather than silently deleting or merging payment history.
UPDATE `PaymentTransaction`
SET `providerAccountKey` = CONCAT('legacy-', `provider`)
WHERE `provider` = 'MPESA' AND `providerAccountKey` IS NULL;

CREATE INDEX `PaymentTransaction_status_nextReconciliationAt_idx`
    ON `PaymentTransaction`(`status`, `nextReconciliationAt`);

CREATE UNIQUE INDEX `PT_provider_account_request_key`
    ON `PaymentTransaction`(`provider`, `providerAccountKey`, `externalRequestId`);

CREATE UNIQUE INDEX `PT_provider_account_receipt_key`
    ON `PaymentTransaction`(`provider`, `providerAccountKey`, `providerReceipt`);

CREATE TABLE `PaymentCallbackInbox` (
    `id` VARCHAR(191) NOT NULL,
    `provider` ENUM('MPESA', 'CARD', 'BANK', 'MANUAL') NOT NULL,
    `providerAccountKey` VARCHAR(191) NULL,
    `eventKey` CHAR(64) NOT NULL,
    `payloadHash` CHAR(64) NOT NULL,
    `checkoutRequestId` VARCHAR(191) NULL,
    `merchantRequestId` VARCHAR(191) NULL,
    `providerReceipt` VARCHAR(191) NULL,
    `resultCode` VARCHAR(32) NULL,
    `resultDescription` VARCHAR(255) NULL,
    `payload` JSON NOT NULL,
    `status` ENUM('RECEIVED', 'PROCESSING', 'PROCESSED', 'RETRYABLE_FAILED', 'MANUAL_REVIEW', 'INVALID') NOT NULL DEFAULT 'RECEIVED',
    `attemptCount` INTEGER NOT NULL DEFAULT 0,
    `nextAttemptAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lockedAt` DATETIME(3) NULL,
    `lockedBy` VARCHAR(191) NULL,
    `lastError` VARCHAR(500) NULL,
    `requiresManualReview` BOOLEAN NOT NULL DEFAULT false,
    `correlationId` VARCHAR(191) NULL,
    `paymentTransactionId` VARCHAR(191) NULL,
    `receivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processingStartedAt` DATETIME(3) NULL,
    `processedAt` DATETIME(3) NULL,
    `failedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PaymentCallbackInbox_eventKey_key`(`eventKey`),
    INDEX `PaymentCallbackInbox_status_nextAttemptAt_idx`(`status`, `nextAttemptAt`),
    INDEX `PaymentCallbackInbox_checkoutRequestId_receivedAt_idx`(`checkoutRequestId`, `receivedAt`),
    INDEX `PaymentCallbackInbox_paymentTransactionId_receivedAt_idx`(`paymentTransactionId`, `receivedAt`),
    INDEX `PaymentCallbackInbox_lockedAt_status_idx`(`lockedAt`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `PaymentCallbackInbox`
    ADD CONSTRAINT `PaymentCallbackInbox_paymentTransactionId_fkey`
        FOREIGN KEY (`paymentTransactionId`) REFERENCES `PaymentTransaction`(`id`)
        ON DELETE SET NULL ON UPDATE CASCADE;
