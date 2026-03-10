/*
  Warnings:

  - You are about to drop the column `cancelledAt` on the `order` table. All the data in the column will be lost.
  - You are about to alter the column `status` on the `order` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(8))` to `Enum(EnumId(8))`.
  - Added the required column `buyerFullName` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `buyerPhone` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `reservationExpiresAt` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `order` DROP COLUMN `cancelledAt`,
    ADD COLUMN `buyerEmail` VARCHAR(191) NULL,
    ADD COLUMN `buyerFullName` VARCHAR(191) NOT NULL,
    ADD COLUMN `buyerPhone` VARCHAR(32) NOT NULL,
    ADD COLUMN `expiredAt` DATETIME(3) NULL,
    ADD COLUMN `reservationExpiresAt` DATETIME(3) NOT NULL,
    MODIFY `status` ENUM('PENDING', 'PAID', 'FAILED', 'EXPIRED', 'REFUNDED') NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX `Order_status_reservationExpiresAt_idx` ON `Order`(`status`, `reservationExpiresAt`);

-- CreateIndex
CREATE INDEX `Order_buyerPhone_createdAt_idx` ON `Order`(`buyerPhone`, `createdAt`);
