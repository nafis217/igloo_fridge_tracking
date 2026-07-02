SET NOCOUNT ON;
GO

IF OBJECT_ID('dbo.ShopOwners', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.ShopOwners
    (
        Id NVARCHAR(64) NOT NULL CONSTRAINT PK_ShopOwners PRIMARY KEY,
        ShopName NVARCHAR(200) NOT NULL,
        OwnerName NVARCHAR(200) NULL,
        Phone NVARCHAR(50) NULL,
        Address NVARCHAR(500) NULL,
        District NVARCHAR(100) NULL,
        Latitude DECIMAL(18, 6) NULL,
        Longitude DECIMAL(18, 6) NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_ShopOwners_CreatedAt DEFAULT (GETUTCDATE())
    );
END;
GO

IF COL_LENGTH('dbo.ShopOwners', 'District') IS NULL
    ALTER TABLE dbo.ShopOwners ADD District NVARCHAR(100) NULL;
GO

IF OBJECT_ID('dbo.Fridges', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.Fridges
    (
        Id NVARCHAR(64) NOT NULL CONSTRAINT PK_Fridges PRIMARY KEY,
        SerialNumber NVARCHAR(100) NOT NULL,
        Status NVARCHAR(30) NOT NULL CONSTRAINT DF_Fridges_Status DEFAULT ('ACTIVE'),
        Model NVARCHAR(100) NULL,
        Capacity INT NULL,
        InstallDate DATETIME2 NULL,
        QrCode NVARCHAR(256) NOT NULL,
        CurrentOwnerId NVARCHAR(64) NULL,
        LastScannedAt DATETIME2 NULL,
        LastLatitude DECIMAL(18, 6) NULL,
        LastLongitude DECIMAL(18, 6) NULL,
        LastAddress NVARCHAR(500) NULL,
        Version INT NOT NULL CONSTRAINT DF_Fridges_Version DEFAULT (1),
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Fridges_CreatedAt DEFAULT (GETUTCDATE()),
        UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_Fridges_UpdatedAt DEFAULT (GETUTCDATE())
    );
END;
GO

IF COL_LENGTH('dbo.Fridges', 'Capacity') IS NULL
    ALTER TABLE dbo.Fridges ADD Capacity INT NULL;
IF COL_LENGTH('dbo.Fridges', 'InstallDate') IS NULL
    ALTER TABLE dbo.Fridges ADD InstallDate DATETIME2 NULL;
IF COL_LENGTH('dbo.Fridges', 'QrCode') IS NULL
    ALTER TABLE dbo.Fridges ADD QrCode NVARCHAR(256) NULL;
IF COL_LENGTH('dbo.Fridges', 'LastScannedAt') IS NULL
    ALTER TABLE dbo.Fridges ADD LastScannedAt DATETIME2 NULL;
IF COL_LENGTH('dbo.Fridges', 'LastLatitude') IS NULL
    ALTER TABLE dbo.Fridges ADD LastLatitude DECIMAL(18, 6) NULL;
IF COL_LENGTH('dbo.Fridges', 'LastLongitude') IS NULL
    ALTER TABLE dbo.Fridges ADD LastLongitude DECIMAL(18, 6) NULL;
IF COL_LENGTH('dbo.Fridges', 'LastAddress') IS NULL
    ALTER TABLE dbo.Fridges ADD LastAddress NVARCHAR(500) NULL;
IF COL_LENGTH('dbo.Fridges', 'Version') IS NULL
    ALTER TABLE dbo.Fridges ADD Version INT NOT NULL CONSTRAINT DF_Fridges_Version DEFAULT (1) WITH VALUES;
GO

UPDATE dbo.Fridges
SET QrCode = 'fridge:' + Id
WHERE QrCode IS NULL OR LTRIM(RTRIM(QrCode)) = '';

UPDATE dbo.Fridges
SET InstallDate = CreatedAt
WHERE InstallDate IS NULL;

UPDATE dbo.Fridges
SET Status = 'REPAIR'
WHERE UPPER(Status) = 'MAINTENANCE';
GO

ALTER TABLE dbo.Fridges ALTER COLUMN QrCode NVARCHAR(256) NOT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.Fridges') AND name = 'UX_Fridges_SerialNumber')
    CREATE UNIQUE INDEX UX_Fridges_SerialNumber ON dbo.Fridges (SerialNumber);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.Fridges') AND name = 'UX_Fridges_QrCode')
    CREATE UNIQUE INDEX UX_Fridges_QrCode ON dbo.Fridges (QrCode);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Fridges_ShopOwners_CurrentOwnerId')
    ALTER TABLE dbo.Fridges WITH CHECK
        ADD CONSTRAINT FK_Fridges_ShopOwners_CurrentOwnerId
        FOREIGN KEY (CurrentOwnerId) REFERENCES dbo.ShopOwners (Id) ON DELETE SET NULL;
GO

IF OBJECT_ID('dbo.FridgeScans', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.FridgeScans
    (
        Id NVARCHAR(64) NOT NULL CONSTRAINT PK_FridgeScans PRIMARY KEY,
        FridgeId NVARCHAR(64) NOT NULL,
        ScannedAt DATETIME2 NOT NULL CONSTRAINT DF_FridgeScans_ScannedAt DEFAULT (GETUTCDATE()),
        Latitude DECIMAL(18, 6) NULL,
        Longitude DECIMAL(18, 6) NULL,
        Address NVARCHAR(500) NULL,
        Notes NVARCHAR(1000) NULL
    );
END;
GO

IF COL_LENGTH('dbo.FridgeScans', 'Address') IS NULL
    ALTER TABLE dbo.FridgeScans ADD Address NVARCHAR(500) NULL;
IF COL_LENGTH('dbo.FridgeScans', 'Notes') IS NULL
    ALTER TABLE dbo.FridgeScans ADD Notes NVARCHAR(1000) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.FridgeScans') AND name = 'IX_FridgeScans_FridgeId')
    CREATE INDEX IX_FridgeScans_FridgeId ON dbo.FridgeScans (FridgeId);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_FridgeScans_Fridges_FridgeId')
    ALTER TABLE dbo.FridgeScans WITH CHECK
        ADD CONSTRAINT FK_FridgeScans_Fridges_FridgeId
        FOREIGN KEY (FridgeId) REFERENCES dbo.Fridges (Id) ON DELETE CASCADE;
GO

IF OBJECT_ID('dbo.FridgeTransfers', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.FridgeTransfers
    (
        Id NVARCHAR(64) NOT NULL CONSTRAINT PK_FridgeTransfers PRIMARY KEY,
        FridgeId NVARCHAR(64) NOT NULL,
        FromOwnerId NVARCHAR(64) NULL,
        ToOwnerId NVARCHAR(64) NOT NULL,
        TransferredAt DATETIME2 NOT NULL CONSTRAINT DF_FridgeTransfers_TransferredAt DEFAULT (GETUTCDATE()),
        Latitude DECIMAL(18, 6) NULL,
        Longitude DECIMAL(18, 6) NULL,
        Address NVARCHAR(500) NULL,
        Notes NVARCHAR(1000) NULL,
        FridgeVersion INT NOT NULL CONSTRAINT DF_FridgeTransfers_FridgeVersion DEFAULT (1)
    );
END;
GO

IF COL_LENGTH('dbo.FridgeTransfers', 'Latitude') IS NULL
    ALTER TABLE dbo.FridgeTransfers ADD Latitude DECIMAL(18, 6) NULL;
IF COL_LENGTH('dbo.FridgeTransfers', 'Longitude') IS NULL
    ALTER TABLE dbo.FridgeTransfers ADD Longitude DECIMAL(18, 6) NULL;
IF COL_LENGTH('dbo.FridgeTransfers', 'Address') IS NULL
    ALTER TABLE dbo.FridgeTransfers ADD Address NVARCHAR(500) NULL;
IF COL_LENGTH('dbo.FridgeTransfers', 'Notes') IS NULL
    ALTER TABLE dbo.FridgeTransfers ADD Notes NVARCHAR(1000) NULL;
IF COL_LENGTH('dbo.FridgeTransfers', 'FridgeVersion') IS NULL
    ALTER TABLE dbo.FridgeTransfers ADD FridgeVersion INT NOT NULL CONSTRAINT DF_FridgeTransfers_FridgeVersion DEFAULT (1) WITH VALUES;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.FridgeTransfers') AND name = 'IX_FridgeTransfers_FridgeId')
    CREATE INDEX IX_FridgeTransfers_FridgeId ON dbo.FridgeTransfers (FridgeId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.FridgeTransfers') AND name = 'IX_FridgeTransfers_FromOwnerId')
    CREATE INDEX IX_FridgeTransfers_FromOwnerId ON dbo.FridgeTransfers (FromOwnerId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.FridgeTransfers') AND name = 'IX_FridgeTransfers_ToOwnerId')
    CREATE INDEX IX_FridgeTransfers_ToOwnerId ON dbo.FridgeTransfers (ToOwnerId);
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_FridgeTransfers_Fridges_FridgeId')
    ALTER TABLE dbo.FridgeTransfers WITH CHECK
        ADD CONSTRAINT FK_FridgeTransfers_Fridges_FridgeId
        FOREIGN KEY (FridgeId) REFERENCES dbo.Fridges (Id) ON DELETE CASCADE;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_FridgeTransfers_ShopOwners_FromOwnerId')
    ALTER TABLE dbo.FridgeTransfers WITH CHECK
        ADD CONSTRAINT FK_FridgeTransfers_ShopOwners_FromOwnerId
        FOREIGN KEY (FromOwnerId) REFERENCES dbo.ShopOwners (Id);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_FridgeTransfers_ShopOwners_ToOwnerId')
    ALTER TABLE dbo.FridgeTransfers WITH CHECK
        ADD CONSTRAINT FK_FridgeTransfers_ShopOwners_ToOwnerId
        FOREIGN KEY (ToOwnerId) REFERENCES dbo.ShopOwners (Id);
GO
