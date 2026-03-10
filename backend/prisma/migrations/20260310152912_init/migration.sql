-- CreateTable
CREATE TABLE `AuthUser` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'STAFF', 'MODERATOR') NOT NULL DEFAULT 'STAFF',
    `status` ENUM('ACTIVE', 'DISABLED') NOT NULL DEFAULT 'ACTIVE',
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AuthUser_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Person` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `headline` VARCHAR(191) NULL,
    `bio` TEXT NOT NULL,
    `medium` VARCHAR(191) NULL,
    `profileImageUrl` VARCHAR(500) NULL,
    `profileStorageKey` VARCHAR(255) NULL,
    `profileMimeType` VARCHAR(100) NULL,
    `profileSizeBytes` INTEGER NULL,
    `profileWidth` INTEGER NULL,
    `profileHeight` INTEGER NULL,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('DRAFT', 'ACTIVE', 'HIDDEN', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Person_slug_key`(`slug`),
    INDEX `Person_status_displayOrder_idx`(`status`, `displayOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PersonRole` (
    `id` VARCHAR(191) NOT NULL,
    `personId` VARCHAR(191) NOT NULL,
    `role` ENUM('LEADERSHIP', 'MEMBER', 'ARTIST') NOT NULL,
    `title` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PersonRole_role_idx`(`role`),
    UNIQUE INDEX `PersonRole_personId_role_key`(`personId`, `role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PersonFeaturedWork` (
    `id` VARCHAR(191) NOT NULL,
    `personId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PersonFeaturedWork_personId_sortOrder_idx`(`personId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Event` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `eventType` VARCHAR(100) NOT NULL,
    `summary` VARCHAR(500) NOT NULL,
    `description` TEXT NOT NULL,
    `startAt` DATETIME(3) NOT NULL,
    `endAt` DATETIME(3) NOT NULL,
    `timezone` VARCHAR(64) NOT NULL,
    `venueName` VARCHAR(191) NOT NULL,
    `capacity` INTEGER NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'CANCELLED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `heroImageUrl` VARCHAR(500) NULL,
    `heroStorageKey` VARCHAR(255) NULL,
    `heroMimeType` VARCHAR(100) NULL,
    `heroSizeBytes` INTEGER NULL,
    `heroWidth` INTEGER NULL,
    `heroHeight` INTEGER NULL,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Event_slug_key`(`slug`),
    INDEX `Event_status_startAt_idx`(`status`, `startAt`),
    INDEX `Event_startAt_idx`(`startAt`),
    INDEX `Event_endAt_idx`(`endAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EventLineupItem` (
    `id` VARCHAR(191) NOT NULL,
    `eventId` VARCHAR(191) NOT NULL,
    `personId` VARCHAR(191) NULL,
    `displayName` VARCHAR(191) NOT NULL,
    `roleLabel` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EventLineupItem_eventId_sortOrder_idx`(`eventId`, `sortOrder`),
    INDEX `EventLineupItem_personId_idx`(`personId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EventHighlight` (
    `id` VARCHAR(191) NOT NULL,
    `eventId` VARCHAR(191) NOT NULL,
    `text` VARCHAR(255) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EventHighlight_eventId_sortOrder_idx`(`eventId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EventParticipation` (
    `id` VARCHAR(191) NOT NULL,
    `eventId` VARCHAR(191) NOT NULL,
    `personId` VARCHAR(191) NOT NULL,
    `participationRole` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EventParticipation_personId_idx`(`personId`),
    UNIQUE INDEX `EventParticipation_eventId_personId_key`(`eventId`, `personId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Partner` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `partnershipType` VARCHAR(100) NULL,
    `website` VARCHAR(500) NULL,
    `logoText` VARCHAR(16) NULL,
    `logoUrl` VARCHAR(500) NULL,
    `logoStorageKey` VARCHAR(255) NULL,
    `logoMimeType` VARCHAR(100) NULL,
    `logoSizeBytes` INTEGER NULL,
    `status` ENUM('DRAFT', 'ACTIVE', 'HIDDEN', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Partner_slug_key`(`slug`),
    INDEX `Partner_status_displayOrder_idx`(`status`, `displayOrder`),
    INDEX `Partner_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PartnerPlacement` (
    `id` VARCHAR(191) NOT NULL,
    `partnerId` VARCHAR(191) NOT NULL,
    `context` ENUM('HOMEPAGE', 'DIRECTORY', 'EVENT') NOT NULL,
    `contextKey` VARCHAR(191) NOT NULL,
    `eventId` VARCHAR(191) NULL,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PartnerPlacement_context_isActive_displayOrder_idx`(`context`, `isActive`, `displayOrder`),
    INDEX `PartnerPlacement_eventId_context_idx`(`eventId`, `context`),
    UNIQUE INDEX `PartnerPlacement_partnerId_context_contextKey_key`(`partnerId`, `context`, `contextKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TicketTier` (
    `id` VARCHAR(191) NOT NULL,
    `eventId` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `description` TEXT NULL,
    `price` DECIMAL(12, 2) NOT NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'KES',
    `availableQuantity` INTEGER NOT NULL,
    `maxPerOrder` INTEGER NULL,
    `saleStartAt` DATETIME(3) NULL,
    `saleEndAt` DATETIME(3) NULL,
    `status` ENUM('DRAFT', 'ACTIVE', 'SOLD_OUT', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TicketTier_slug_key`(`slug`),
    INDEX `TicketTier_eventId_status_saleStartAt_idx`(`eventId`, `status`, `saleStartAt`),
    INDEX `TicketTier_eventId_sortOrder_idx`(`eventId`, `sortOrder`),
    UNIQUE INDEX `TicketTier_eventId_name_key`(`eventId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TicketTierPerk` (
    `id` VARCHAR(191) NOT NULL,
    `ticketTierId` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TicketTierPerk_ticketTierId_sortOrder_idx`(`ticketTierId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BuyerProfile` (
    `id` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(32) NOT NULL,
    `email` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `BuyerProfile_phone_idx`(`phone`),
    INDEX `BuyerProfile_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Order` (
    `id` VARCHAR(191) NOT NULL,
    `orderNumber` VARCHAR(40) NOT NULL,
    `eventId` VARCHAR(191) NOT NULL,
    `buyerId` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING_PAYMENT', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED') NOT NULL DEFAULT 'PENDING_PAYMENT',
    `currency` VARCHAR(3) NOT NULL DEFAULT 'KES',
    `subtotalAmount` DECIMAL(12, 2) NOT NULL,
    `totalAmount` DECIMAL(12, 2) NOT NULL,
    `ticketDeliveryStatus` ENUM('PENDING', 'SENT', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `placedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `paidAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `refundedAt` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Order_orderNumber_key`(`orderNumber`),
    INDEX `Order_eventId_status_createdAt_idx`(`eventId`, `status`, `createdAt`),
    INDEX `Order_buyerId_createdAt_idx`(`buyerId`, `createdAt`),
    INDEX `Order_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrderItem` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `ticketTierId` VARCHAR(191) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `unitPrice` DECIMAL(12, 2) NOT NULL,
    `lineTotal` DECIMAL(12, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `OrderItem_orderId_idx`(`orderId`),
    INDEX `OrderItem_ticketTierId_idx`(`ticketTierId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Ticket` (
    `id` VARCHAR(191) NOT NULL,
    `ticketNumber` VARCHAR(50) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `orderItemId` VARCHAR(191) NOT NULL,
    `eventId` VARCHAR(191) NOT NULL,
    `ticketTierId` VARCHAR(191) NOT NULL,
    `buyerId` VARCHAR(191) NOT NULL,
    `status` ENUM('ACTIVE', 'CHECKED_IN', 'REVOKED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    `qrCodeValue` VARCHAR(255) NOT NULL,
    `issuedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `revokedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Ticket_ticketNumber_key`(`ticketNumber`),
    UNIQUE INDEX `Ticket_qrCodeValue_key`(`qrCodeValue`),
    INDEX `Ticket_eventId_status_idx`(`eventId`, `status`),
    INDEX `Ticket_orderId_idx`(`orderId`),
    INDEX `Ticket_buyerId_idx`(`buyerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TicketCheckIn` (
    `id` VARCHAR(191) NOT NULL,
    `ticketId` VARCHAR(191) NOT NULL,
    `checkedInByUserId` VARCHAR(191) NULL,
    `method` ENUM('QR', 'MANUAL') NOT NULL,
    `checkpointLabel` VARCHAR(100) NULL,
    `notes` VARCHAR(255) NULL,
    `checkedInAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TicketCheckIn_ticketId_checkedInAt_idx`(`ticketId`, `checkedInAt`),
    INDEX `TicketCheckIn_checkedInAt_idx`(`checkedInAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PaymentTransaction` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `provider` ENUM('MPESA', 'CARD', 'BANK', 'MANUAL') NOT NULL,
    `status` ENUM('INITIATED', 'PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'REFUNDED') NOT NULL DEFAULT 'INITIATED',
    `amount` DECIMAL(12, 2) NOT NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'KES',
    `idempotencyKey` VARCHAR(191) NULL,
    `providerReference` VARCHAR(191) NULL,
    `externalRequestId` VARCHAR(191) NULL,
    `externalTransactionId` VARCHAR(191) NULL,
    `resultCode` VARCHAR(32) NULL,
    `resultMessage` VARCHAR(255) NULL,
    `rawRequest` JSON NULL,
    `rawResponse` JSON NULL,
    `rawCallback` JSON NULL,
    `initiatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PaymentTransaction_idempotencyKey_key`(`idempotencyKey`),
    INDEX `PaymentTransaction_orderId_status_createdAt_idx`(`orderId`, `status`, `createdAt`),
    INDEX `PaymentTransaction_provider_providerReference_idx`(`provider`, `providerReference`),
    INDEX `PaymentTransaction_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GalleryImage` (
    `id` VARCHAR(191) NOT NULL,
    `eventId` VARCHAR(191) NOT NULL,
    `caption` VARCHAR(255) NOT NULL,
    `imageUrl` VARCHAR(500) NOT NULL,
    `storageKey` VARCHAR(255) NOT NULL,
    `mimeType` VARCHAR(100) NOT NULL,
    `sizeBytes` INTEGER NULL,
    `width` INTEGER NULL,
    `height` INTEGER NULL,
    `altText` VARCHAR(255) NULL,
    `featured` BOOLEAN NOT NULL DEFAULT false,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `GalleryImage_eventId_sortOrder_idx`(`eventId`, `sortOrder`),
    INDEX `GalleryImage_eventId_featured_isActive_idx`(`eventId`, `featured`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommunityUpload` (
    `id` VARCHAR(191) NOT NULL,
    `eventId` VARCHAR(191) NOT NULL,
    `alias` VARCHAR(120) NOT NULL,
    `submitterEmail` VARCHAR(191) NULL,
    `submitterPhone` VARCHAR(32) NULL,
    `consentGiven` BOOLEAN NOT NULL DEFAULT false,
    `imageUrl` VARCHAR(500) NOT NULL,
    `storageKey` VARCHAR(255) NOT NULL,
    `mimeType` VARCHAR(100) NOT NULL,
    `sizeBytes` INTEGER NULL,
    `width` INTEGER NULL,
    `height` INTEGER NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastReviewedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CommunityUpload_eventId_status_submittedAt_idx`(`eventId`, `status`, `submittedAt`),
    INDEX `CommunityUpload_status_submittedAt_idx`(`status`, `submittedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommunityUploadReview` (
    `id` VARCHAR(191) NOT NULL,
    `uploadId` VARCHAR(191) NOT NULL,
    `reviewerId` VARCHAR(191) NOT NULL,
    `decision` ENUM('APPROVED', 'REJECTED') NOT NULL,
    `notes` VARCHAR(500) NULL,
    `reviewedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CommunityUploadReview_uploadId_reviewedAt_idx`(`uploadId`, `reviewedAt`),
    INDEX `CommunityUploadReview_reviewerId_reviewedAt_idx`(`reviewerId`, `reviewedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SiteSettings` (
    `id` VARCHAR(191) NOT NULL,
    `settingsKey` VARCHAR(32) NOT NULL DEFAULT 'default',
    `siteName` VARCHAR(191) NOT NULL,
    `tagline` VARCHAR(255) NOT NULL,
    `footerText` TEXT NOT NULL,
    `contactEmail` VARCHAR(191) NOT NULL,
    `contactPhone` VARCHAR(32) NOT NULL,
    `whatsappLink` VARCHAR(500) NOT NULL,
    `instagramUrl` VARCHAR(500) NOT NULL,
    `tiktokUrl` VARCHAR(500) NOT NULL,
    `xUrl` VARCHAR(500) NOT NULL,
    `facebookUrl` VARCHAR(500) NOT NULL,
    `heroTitle` VARCHAR(191) NOT NULL,
    `heroSubtitle` TEXT NOT NULL,
    `featuredEventId` VARCHAR(191) NULL,
    `defaultMetaTitle` VARCHAR(191) NOT NULL,
    `defaultMetaDescription` TEXT NOT NULL,
    `defaultSocialPreviewImageUrl` VARCHAR(500) NOT NULL,
    `privacyPolicyLink` VARCHAR(500) NOT NULL,
    `termsLink` VARCHAR(500) NOT NULL,
    `refundPolicyLink` VARCHAR(500) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SiteSettings_settingsKey_key`(`settingsKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NewsletterSubscription` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `status` ENUM('ACTIVE', 'UNSUBSCRIBED') NOT NULL DEFAULT 'ACTIVE',
    `source` VARCHAR(64) NULL,
    `subscribedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `unsubscribedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `NewsletterSubscription_email_key`(`email`),
    INDEX `NewsletterSubscription_status_subscribedAt_idx`(`status`, `subscribedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PersonRole` ADD CONSTRAINT `PersonRole_personId_fkey` FOREIGN KEY (`personId`) REFERENCES `Person`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PersonFeaturedWork` ADD CONSTRAINT `PersonFeaturedWork_personId_fkey` FOREIGN KEY (`personId`) REFERENCES `Person`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EventLineupItem` ADD CONSTRAINT `EventLineupItem_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EventLineupItem` ADD CONSTRAINT `EventLineupItem_personId_fkey` FOREIGN KEY (`personId`) REFERENCES `Person`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EventHighlight` ADD CONSTRAINT `EventHighlight_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EventParticipation` ADD CONSTRAINT `EventParticipation_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EventParticipation` ADD CONSTRAINT `EventParticipation_personId_fkey` FOREIGN KEY (`personId`) REFERENCES `Person`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartnerPlacement` ADD CONSTRAINT `PartnerPlacement_partnerId_fkey` FOREIGN KEY (`partnerId`) REFERENCES `Partner`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartnerPlacement` ADD CONSTRAINT `PartnerPlacement_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TicketTier` ADD CONSTRAINT `TicketTier_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TicketTierPerk` ADD CONSTRAINT `TicketTierPerk_ticketTierId_fkey` FOREIGN KEY (`ticketTierId`) REFERENCES `TicketTier`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_buyerId_fkey` FOREIGN KEY (`buyerId`) REFERENCES `BuyerProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_ticketTierId_fkey` FOREIGN KEY (`ticketTierId`) REFERENCES `TicketTier`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Ticket` ADD CONSTRAINT `Ticket_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Ticket` ADD CONSTRAINT `Ticket_orderItemId_fkey` FOREIGN KEY (`orderItemId`) REFERENCES `OrderItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Ticket` ADD CONSTRAINT `Ticket_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Ticket` ADD CONSTRAINT `Ticket_ticketTierId_fkey` FOREIGN KEY (`ticketTierId`) REFERENCES `TicketTier`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Ticket` ADD CONSTRAINT `Ticket_buyerId_fkey` FOREIGN KEY (`buyerId`) REFERENCES `BuyerProfile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TicketCheckIn` ADD CONSTRAINT `TicketCheckIn_ticketId_fkey` FOREIGN KEY (`ticketId`) REFERENCES `Ticket`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TicketCheckIn` ADD CONSTRAINT `TicketCheckIn_checkedInByUserId_fkey` FOREIGN KEY (`checkedInByUserId`) REFERENCES `AuthUser`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PaymentTransaction` ADD CONSTRAINT `PaymentTransaction_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GalleryImage` ADD CONSTRAINT `GalleryImage_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommunityUpload` ADD CONSTRAINT `CommunityUpload_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommunityUploadReview` ADD CONSTRAINT `CommunityUploadReview_uploadId_fkey` FOREIGN KEY (`uploadId`) REFERENCES `CommunityUpload`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommunityUploadReview` ADD CONSTRAINT `CommunityUploadReview_reviewerId_fkey` FOREIGN KEY (`reviewerId`) REFERENCES `AuthUser`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SiteSettings` ADD CONSTRAINT `SiteSettings_featuredEventId_fkey` FOREIGN KEY (`featuredEventId`) REFERENCES `Event`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
