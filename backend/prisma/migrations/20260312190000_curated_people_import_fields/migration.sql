ALTER TABLE `Person`
    ADD COLUMN `preferredName` VARCHAR(191) NULL,
    ADD COLUMN `pronunciation` VARCHAR(191) NULL,
    ADD COLUMN `email` VARCHAR(191) NULL,
    ADD COLUMN `phone` VARCHAR(64) NULL,
    ADD COLUMN `city` VARCHAR(191) NULL,
    ADD COLUMN `preferredContactMethod` VARCHAR(64) NULL,
    ADD COLUMN `shortBio` TEXT NULL,
    ADD COLUMN `quote` VARCHAR(500) NULL,
    ADD COLUMN `artistStatement` TEXT NULL,
    ADD COLUMN `primaryArtForm` VARCHAR(191) NULL,
    ADD COLUMN `secondaryArtForm` VARCHAR(191) NULL,
    ADD COLUMN `yearsPracticing` VARCHAR(191) NULL,
    ADD COLUMN `importedFrom` VARCHAR(100) NULL,
    ADD COLUMN `consentGiven` BOOLEAN NULL,
    ADD COLUMN `importMetadata` JSON NULL;

CREATE INDEX `Person_email_idx` ON `Person`(`email`);
