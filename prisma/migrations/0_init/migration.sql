-- CreateTable: baseline migration for existing production database schema
-- Generated from prisma/schema.prisma introspection

-- CreateEnum
CREATE TABLE IF NOT EXISTS `_prisma_migrations` (
  `id` VARCHAR(36) NOT NULL,
  `checksum` VARCHAR(64) NOT NULL,
  `finished_at` DATETIME(3) NULL,
  `migration_name` VARCHAR(255) NOT NULL,
  `logs` TEXT NULL,
  `rolled_back_at` DATETIME(3) NULL,
  `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `applied_steps_count` INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateEnum: UserRole
ALTER TABLE `users` MODIFY COLUMN `role` ENUM('ADMIN', 'DIRECTOR', 'MANAGER', 'LOAN_OFFICER', 'TELLER', 'CUSTOMER') NOT NULL DEFAULT 'CUSTOMER';

-- CreateEnum: UserStatus
ALTER TABLE `users` MODIFY COLUMN `status` ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE';

-- CreateTable: users
CREATE TABLE IF NOT EXISTS `users` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `role` ENUM('ADMIN', 'DIRECTOR', 'MANAGER', 'LOAN_OFFICER', 'TELLER', 'CUSTOMER') NOT NULL DEFAULT 'CUSTOMER',
    `status` ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
    `avatar` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: loan_products
CREATE TABLE IF NOT EXISTS `loan_products` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `loanType` ENUM('PERSONAL', 'BUSINESS', 'AGRICULTURAL', 'GROUP_SOLIDARITY') NOT NULL,
    `description` TEXT NULL,
    `interestRateMethod` ENUM('FLAT_RATE', 'DECLINING_BALANCE') NOT NULL,
    `minInterestRate` DECIMAL(10, 4) NOT NULL,
    `maxInterestRate` DECIMAL(10, 4) NOT NULL,
    `minAmount` DECIMAL(18, 2) NOT NULL,
    `maxAmount` DECIMAL(18, 2) NOT NULL,
    `minTermMonths` INTEGER NOT NULL,
    `maxTermMonths` INTEGER NOT NULL,
    `currency` ENUM('USD', 'KHR') NOT NULL DEFAULT 'USD',
    `gracePeriodDays` INTEGER NOT NULL DEFAULT 0,
    `penaltyRate` DECIMAL(10, 4) NOT NULL DEFAULT 0,
    `requiresCollateral` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `loan_products_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: loan_applications
CREATE TABLE IF NOT EXISTS `loan_applications` (
    `id` VARCHAR(191) NOT NULL,
    `applicationNumber` VARCHAR(191) NOT NULL,
    `applicantId` VARCHAR(191) NOT NULL,
    `loanProductId` VARCHAR(191) NOT NULL,
    `loanOfficerId` VARCHAR(191) NULL,
    `requestedAmount` DECIMAL(18, 2) NOT NULL,
    `approvedAmount` DECIMAL(18, 2) NULL,
    `interestRate` DECIMAL(10, 4) NOT NULL,
    `termMonths` INTEGER NOT NULL,
    `repaymentFrequency` ENUM('DAILY', 'WEEKLY', 'MONTHLY') NOT NULL DEFAULT 'MONTHLY',
    `currency` ENUM('USD', 'KHR') NOT NULL DEFAULT 'USD',
    `purpose` TEXT NULL,
    `status` ENUM('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'OFFICER_APPROVED', 'MANAGER_APPROVED', 'DIRECTOR_APPROVED', 'APPROVED', 'REJECTED', 'DISBURSED', 'CLOSED') NOT NULL DEFAULT 'DRAFT',
    `gracePeriodDays` INTEGER NOT NULL DEFAULT 0,
    `submittedAt` DATETIME(3) NULL,
    `approvedAt` DATETIME(3) NULL,
    `rejectedAt` DATETIME(3) NULL,
    `rejectionReason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `loan_applications_applicationNumber_key`(`applicationNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: documents
CREATE TABLE IF NOT EXISTS `documents` (
    `id` VARCHAR(191) NOT NULL,
    `loanApplicationId` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `originalName` VARCHAR(191) NOT NULL,
    `filePath` VARCHAR(191) NOT NULL,
    `fileSize` INTEGER NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `documentType` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: approval_workflows
CREATE TABLE IF NOT EXISTS `approval_workflows` (
    `id` VARCHAR(191) NOT NULL,
    `loanApplicationId` VARCHAR(191) NOT NULL,
    `approverId` VARCHAR(191) NOT NULL,
    `level` ENUM('OFFICER', 'MANAGER', 'DIRECTOR') NOT NULL,
    `action` ENUM('APPROVED', 'REJECTED', 'RETURNED') NOT NULL,
    `comments` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: repayment_schedules
CREATE TABLE IF NOT EXISTS `repayment_schedules` (
    `id` VARCHAR(191) NOT NULL,
    `loanApplicationId` VARCHAR(191) NOT NULL,
    `installmentNumber` INTEGER NOT NULL,
    `dueDate` DATETIME(3) NOT NULL,
    `principalAmount` DECIMAL(18, 2) NOT NULL,
    `interestAmount` DECIMAL(18, 2) NOT NULL,
    `totalAmount` DECIMAL(18, 2) NOT NULL,
    `paidAmount` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `remainingAmount` DECIMAL(18, 2) NOT NULL,
    `penaltyAmount` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `status` ENUM('PENDING', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'WAIVED') NOT NULL DEFAULT 'PENDING',
    `paidAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `repayment_schedules_loanApplicationId_installmentNumber_key`(`loanApplicationId`, `installmentNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: disbursements
CREATE TABLE IF NOT EXISTS `disbursements` (
    `id` VARCHAR(191) NOT NULL,
    `loanApplicationId` VARCHAR(191) NOT NULL,
    `disbursedById` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(18, 2) NOT NULL,
    `method` ENUM('CASH', 'BANK_TRANSFER') NOT NULL,
    `bankName` VARCHAR(191) NULL,
    `accountNumber` VARCHAR(191) NULL,
    `referenceNumber` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `notes` TEXT NULL,
    `disbursedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: repayments
CREATE TABLE IF NOT EXISTS `repayments` (
    `id` VARCHAR(191) NOT NULL,
    `loanApplicationId` VARCHAR(191) NOT NULL,
    `collectedById` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(18, 2) NOT NULL,
    `principalPortion` DECIMAL(18, 2) NOT NULL,
    `interestPortion` DECIMAL(18, 2) NOT NULL,
    `penaltyPortion` DECIMAL(18, 2) NOT NULL DEFAULT 0,
    `repaymentType` ENUM('REGULAR', 'EARLY_REPAYMENT', 'PREPAYMENT', 'PENALTY') NOT NULL DEFAULT 'REGULAR',
    `paymentMethod` VARCHAR(191) NOT NULL,
    `referenceNumber` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `paidAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey: loan_applications -> users (applicant)
ALTER TABLE `loan_applications` ADD CONSTRAINT `loan_applications_applicantId_fkey`
    FOREIGN KEY (`applicantId`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: loan_applications -> loan_products
ALTER TABLE `loan_applications` ADD CONSTRAINT `loan_applications_loanProductId_fkey`
    FOREIGN KEY (`loanProductId`) REFERENCES `loan_products`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: loan_applications -> users (loanOfficer)
ALTER TABLE `loan_applications` ADD CONSTRAINT `loan_applications_loanOfficerId_fkey`
    FOREIGN KEY (`loanOfficerId`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: documents -> loan_applications
ALTER TABLE `documents` ADD CONSTRAINT `documents_loanApplicationId_fkey`
    FOREIGN KEY (`loanApplicationId`) REFERENCES `loan_applications`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: approval_workflows -> loan_applications
ALTER TABLE `approval_workflows` ADD CONSTRAINT `approval_workflows_loanApplicationId_fkey`
    FOREIGN KEY (`loanApplicationId`) REFERENCES `loan_applications`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: approval_workflows -> users (approver)
ALTER TABLE `approval_workflows` ADD CONSTRAINT `approval_workflows_approverId_fkey`
    FOREIGN KEY (`approverId`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: repayment_schedules -> loan_applications
ALTER TABLE `repayment_schedules` ADD CONSTRAINT `repayment_schedules_loanApplicationId_fkey`
    FOREIGN KEY (`loanApplicationId`) REFERENCES `loan_applications`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: disbursements -> loan_applications
ALTER TABLE `disbursements` ADD CONSTRAINT `disbursements_loanApplicationId_fkey`
    FOREIGN KEY (`loanApplicationId`) REFERENCES `loan_applications`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: disbursements -> users (disbursedBy)
ALTER TABLE `disbursements` ADD CONSTRAINT `disbursements_disbursedById_fkey`
    FOREIGN KEY (`disbursedById`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: repayments -> loan_applications
ALTER TABLE `repayments` ADD CONSTRAINT `repayments_loanApplicationId_fkey`
    FOREIGN KEY (`loanApplicationId`) REFERENCES `loan_applications`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: repayments -> users (collectedBy)
ALTER TABLE `repayments` ADD CONSTRAINT `repayments_collectedById_fkey`
    FOREIGN KEY (`collectedById`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
