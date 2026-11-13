ALTER TABLE `SiteSettings`
    ADD COLUMN `aboutTitle` VARCHAR(191) NULL,
    ADD COLUMN `aboutIntro` TEXT NULL,
    ADD COLUMN `aboutBody` TEXT NULL,
    ADD COLUMN `aboutImage` VARCHAR(500) NULL,
    ADD COLUMN `contactTitle` VARCHAR(191) NULL,
    ADD COLUMN `contactIntro` TEXT NULL,
    ADD COLUMN `privacyPolicyContent` TEXT NULL,
    ADD COLUMN `termsContent` TEXT NULL,
    ADD COLUMN `refundPolicyContent` TEXT NULL;
