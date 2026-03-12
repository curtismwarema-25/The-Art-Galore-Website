-- Expand status enum to allow value migration
ALTER TABLE `Order`
    MODIFY `status` ENUM(
        'PENDING',
        'PAID',
        'FAILED',
        'EXPIRED',
        'REFUNDED',
        'PENDING_PAYMENT',
        'PAYMENT_SUBMITTED',
        'PAYMENT_VERIFIED',
        'PAYMENT_REJECTED'
    ) NOT NULL DEFAULT 'PENDING';

-- Add guest tracking + verification timing columns
ALTER TABLE `Order`
    ADD COLUMN `publicToken` VARCHAR(191) NULL,
    ADD COLUMN `verificationSubmittedAt` DATETIME(3) NULL;

-- Map legacy statuses into the new lifecycle
UPDATE `Order` SET `status` = 'PENDING_PAYMENT' WHERE `status` = 'PENDING';
UPDATE `Order` SET `status` = 'PAYMENT_REJECTED' WHERE `status` = 'FAILED';
UPDATE `Order` SET `status` = 'PAID' WHERE `status` = 'REFUNDED';

-- Finalize lifecycle enum
ALTER TABLE `Order`
    MODIFY `status` ENUM(
        'PENDING_PAYMENT',
        'PAYMENT_SUBMITTED',
        'PAYMENT_VERIFIED',
        'PAYMENT_REJECTED',
        'PAID',
        'EXPIRED'
    ) NOT NULL DEFAULT 'PENDING_PAYMENT';

-- Backfill and enforce public order token
UPDATE `Order`
SET `publicToken` = CONCAT('legacy_ord_', REPLACE(`id`, '-', ''))
WHERE `publicToken` IS NULL;

ALTER TABLE `Order`
    MODIFY `publicToken` VARCHAR(191) NOT NULL;

CREATE UNIQUE INDEX `Order_publicToken_key` ON `Order`(`publicToken`);

-- Add public ticket token for guest retrieval
ALTER TABLE `Ticket`
    ADD COLUMN `publicTicketToken` VARCHAR(191) NULL;

UPDATE `Ticket`
SET `publicTicketToken` = CONCAT('legacy_tkt_', REPLACE(`id`, '-', ''))
WHERE `publicTicketToken` IS NULL;

ALTER TABLE `Ticket`
    MODIFY `publicTicketToken` VARCHAR(191) NOT NULL;

CREATE UNIQUE INDEX `Ticket_publicTicketToken_key` ON `Ticket`(`publicTicketToken`);

-- Manual payment submission + admin verification queue
CREATE TABLE `PaymentProofSubmission` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `paymentMethod` ENUM('MPESA', 'CARD', 'BANK', 'MANUAL') NOT NULL,
    `payerName` VARCHAR(191) NOT NULL,
    `phoneNumber` VARCHAR(32) NOT NULL,
    `amountPaid` DECIMAL(12, 2) NOT NULL,
    `transactionReference` VARCHAR(191) NOT NULL,
    `screenshotUrl` VARCHAR(500) NULL,
    `screenshotStorageKey` VARCHAR(255) NULL,
    `screenshotMimeType` VARCHAR(100) NULL,
    `screenshotSizeBytes` INTEGER NULL,
    `notes` TEXT NULL,
    `verificationStatus` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `verificationNote` VARCHAR(500) NULL,
    `submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reviewedAt` DATETIME(3) NULL,
    `reviewedByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PaymentProofSubmission_orderId_submittedAt_idx`(`orderId`, `submittedAt`),
    INDEX `PaymentProofSubmission_verificationStatus_submittedAt_idx`(`verificationStatus`, `submittedAt`),
    INDEX `PaymentProofSubmission_reviewedByUserId_reviewedAt_idx`(`reviewedByUserId`, `reviewedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `PaymentProofSubmission`
    ADD CONSTRAINT `PaymentProofSubmission_orderId_fkey`
        FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`)
        ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `PaymentProofSubmission`
    ADD CONSTRAINT `PaymentProofSubmission_reviewedByUserId_fkey`
        FOREIGN KEY (`reviewedByUserId`) REFERENCES `AuthUser`(`id`)
        ON DELETE SET NULL ON UPDATE CASCADE;

-- Publicly visible manual payment instructions
ALTER TABLE `SiteSettings`
    ADD COLUMN `manualPaymentEnabled` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `bankAccountName` VARCHAR(191) NULL,
    ADD COLUMN `bankAccountNumber` VARCHAR(64) NULL,
    ADD COLUMN `bankName` VARCHAR(191) NULL,
    ADD COLUMN `bankBranch` VARCHAR(191) NULL,
    ADD COLUMN `mpesaPaybill` VARCHAR(32) NULL,
    ADD COLUMN `mpesaAccountInstructions` VARCHAR(500) NULL,
    ADD COLUMN `supportContactText` VARCHAR(255) NULL,
    ADD COLUMN `mpesaComingSoonMessage` VARCHAR(255) NOT NULL DEFAULT 'Automated M-Pesa checkout coming soon';
