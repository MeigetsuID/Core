-- CreateTable
CREATE TABLE `masteruserrecord` (
    `ID` VARCHAR(13) NOT NULL,
    `UserID` VARCHAR(20) NOT NULL,
    `UserName` TEXT NOT NULL,
    `MailAddress` TEXT NOT NULL,
    `Password` VARCHAR(128) NOT NULL,
    `AccountType` TINYINT UNSIGNED NOT NULL,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `masteruserrecord_ID_key`(`ID`),
    UNIQUE INDEX `masteruserrecord_UserID_key`(`UserID`),
    PRIMARY KEY (`ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `application` (
    `AppID` VARCHAR(36) NOT NULL,
    `AppName` TEXT NOT NULL,
    `DeveloperID` VARCHAR(13) NOT NULL,

    UNIQUE INDEX `application_AppID_key`(`AppID`),
    PRIMARY KEY (`AppID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `virtualid` (
    `VirtualID` VARCHAR(36) NOT NULL,
    `ID` VARCHAR(13) NOT NULL,
    `AppID` VARCHAR(36) NOT NULL,

    UNIQUE INDEX `virtualid_VirtualID_key`(`VirtualID`),
    PRIMARY KEY (`VirtualID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `accesstoken` (
    `Token` VARCHAR(128) NOT NULL,
    `VirtualID` VARCHAR(36) NOT NULL,
    `Scopes` TEXT NOT NULL,
    `ExpiresAt` DATETIME NOT NULL,

    UNIQUE INDEX `accesstoken_Token_key`(`Token`),
    PRIMARY KEY (`Token`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refreshtoken` (
    `Token` VARCHAR(128) NOT NULL,
    `VirtualID` VARCHAR(36) NOT NULL,
    `Scopes` TEXT NOT NULL,
    `ExpiresAt` DATETIME NOT NULL,

    UNIQUE INDEX `refreshtoken_Token_key`(`Token`),
    PRIMARY KEY (`Token`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `application` ADD CONSTRAINT `application_DeveloperID_fkey` FOREIGN KEY (`DeveloperID`) REFERENCES `masteruserrecord`(`ID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `virtualid` ADD CONSTRAINT `virtualid_ID_fkey` FOREIGN KEY (`ID`) REFERENCES `masteruserrecord`(`ID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `accesstoken` ADD CONSTRAINT `accesstoken_VirtualID_fkey` FOREIGN KEY (`VirtualID`) REFERENCES `virtualid`(`VirtualID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refreshtoken` ADD CONSTRAINT `refreshtoken_VirtualID_fkey` FOREIGN KEY (`VirtualID`) REFERENCES `virtualid`(`VirtualID`) ON DELETE RESTRICT ON UPDATE CASCADE;

GRANT SELECT,INSERT,UPDATE,DELETE ON meigetsuid.* TO mgidsrv;
