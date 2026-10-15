ALTER TABLE `PaymentTransaction`
    ADD COLUMN `reconciliationRequiresManualReview` BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX `PaymentTransaction_orderId_provider_status_idx`
    ON `PaymentTransaction`(`orderId`, `provider`, `status`);
