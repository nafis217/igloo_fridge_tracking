IF OBJECT_ID(N'dbo.LoginUsers', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.LoginUsers
    (
        [ID] INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_LoginUsers PRIMARY KEY,
        [UserName] NVARCHAR(100) NOT NULL,
        [Pass] NVARCHAR(200) NOT NULL,
        [CompanyID] INT NOT NULL
    );

    CREATE UNIQUE INDEX UX_LoginUsers_UserName_CompanyID
        ON dbo.LoginUsers ([UserName], [CompanyID]);
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM dbo.LoginUsers
    WHERE [UserName] = N'admin'
      AND [CompanyID] = 1
)
BEGIN
    INSERT INTO dbo.LoginUsers ([UserName], [Pass], [CompanyID])
    VALUES (N'admin', N'1234', 1);
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_LoginUser
    @UserName NVARCHAR(100),
    @Pass NVARCHAR(200),
    @CompanyID INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP (1)
        [ID] AS Id,
        [UserName],
        [CompanyID] AS CompanyId
    FROM dbo.LoginUsers
    WHERE [UserName] = @UserName
      AND [Pass] = @Pass
      AND (@CompanyID IS NULL OR [CompanyID] = @CompanyID)
    ORDER BY [ID];
END;
GO
