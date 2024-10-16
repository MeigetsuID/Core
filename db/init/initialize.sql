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
CREATE TABLE `token` (
    `AccessToken` VARCHAR(128) NOT NULL,
    `RefreshToken` VARCHAR(128) NOT NULL,
    `VirtualID` VARCHAR(36) NOT NULL,
    `Scopes` TEXT NOT NULL,
    `AExpiresAt` DATETIME NOT NULL,
    `RExpiresAt` DATETIME NOT NULL,

    UNIQUE INDEX `token_AccessToken_key`(`AccessToken`),
    UNIQUE INDEX `token_RefreshToken_key`(`RefreshToken`),
    PRIMARY KEY (`AccessToken`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `application` ADD CONSTRAINT `application_DeveloperID_fkey` FOREIGN KEY (`DeveloperID`) REFERENCES `masteruserrecord`(`ID`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `virtualid` ADD CONSTRAINT `virtualid_ID_fkey` FOREIGN KEY (`ID`) REFERENCES `masteruserrecord`(`ID`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `virtualid` ADD CONSTRAINT `virtualid_AppID_fkey` FOREIGN KEY (`AppID`) REFERENCES `application`(`AppID`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `token` ADD CONSTRAINT `token_VirtualID_fkey` FOREIGN KEY (`VirtualID`) REFERENCES `virtualid`(`VirtualID`) ON DELETE CASCADE ON UPDATE CASCADE;

GRANT SELECT,INSERT,UPDATE,DELETE ON meigetsuid.* TO mgidsrv;

INSERT INTO masteruserrecord (ID, UserID, UserName, MailAddress, Password, AccountType) VALUES ('4010404006753', 'meigetsu2020', '明月', 'c06ff413e2ff7d9d797cefe94e2e8f3198f2395bd998ef22462e08c2a41601fa041bada1f59ea49c67e1fa722ad3f2d7b20324ac008c9a87fb5e79310b9b2a973e953359d6090a41cc7e42c7eb87595d0ca394a91b0aa365c5faefb511bf371417c177dffafb3c51bc66d18d2c3ed253ecaad439235132d338035e78ff9f672eb130c0e9cd79ec9cc92736351dcde1d4ece417fa26b5cedfe09c50f9551b7003c7fa24df5fc918a743e65216358fe23c', 'A5AA9BC17006B56277A40890A058C9229DE6544C', 0);
