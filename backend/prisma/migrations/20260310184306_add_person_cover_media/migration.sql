-- AlterTable
ALTER TABLE `person` ADD COLUMN `coverHeight` INTEGER NULL,
    ADD COLUMN `coverImageUrl` VARCHAR(500) NULL,
    ADD COLUMN `coverMimeType` VARCHAR(100) NULL,
    ADD COLUMN `coverSizeBytes` INTEGER NULL,
    ADD COLUMN `coverStorageKey` VARCHAR(255) NULL,
    ADD COLUMN `coverWidth` INTEGER NULL;
