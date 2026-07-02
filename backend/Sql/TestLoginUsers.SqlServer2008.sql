IF OBJECT_ID('dbo.TestLoginUsers', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.TestLoginUsers
    (
        ID INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_TestLoginUsers PRIMARY KEY,
        UserName NVARCHAR(100) NOT NULL,
        [Pass] NVARCHAR(200) NOT NULL,
        CompanyID INT NOT NULL
    );
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM dbo.TestLoginUsers
    WHERE UserName = N'admin'
      AND CompanyID = 1
)
BEGIN
    INSERT INTO dbo.TestLoginUsers (UserName, [Pass], CompanyID)
    VALUES (N'admin', N'1234', 1);
END;
GO

IF OBJECT_ID('dbo.usp_TestLoginUser', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_TestLoginUser;
GO

CREATE PROCEDURE dbo.usp_TestLoginUser
    @UserName NVARCHAR(100),
    @Pass NVARCHAR(200),
    @CompanyID INT
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1
        FROM dbo.TestLoginUsers
        WHERE UserName = @UserName
          AND [Pass] = @Pass
          AND CompanyID = @CompanyID
    )
    BEGIN
        SELECT CAST(1 AS BIT) AS IsValid;
    END
    ELSE
    BEGIN
        SELECT CAST(0 AS BIT) AS IsValid;
    END
END;
GO
