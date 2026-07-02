using System.Data;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using WebApplication2.Data;

namespace WebApplication2.Controllers;

[ApiController]
[EnableCors("ReactFrontend")]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IConfiguration _configuration;
    private readonly AppDbContext _dbContext;

    public AuthController(IConfiguration configuration, AppDbContext dbContext)
    {
        _configuration = configuration;
        _dbContext = dbContext;
    }

    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login(LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new { message = "Username and password are required." });
        }

        var configuredUsername = _configuration["Auth:Username"];
        var configuredPassword = _configuration["Auth:Password"];

        if (!string.IsNullOrWhiteSpace(_configuration.GetConnectionString("DefaultConnection")))
        {
            try
            {
                var isValid = await ValidateLoginAsync(request);

                if (!isValid)
                {
                    return Unauthorized(new LoginResponse(false, "Invalid username or password."));
                }

                return Ok(new LoginResponse(true, "Login successful."));
            }
            catch (Exception ex) when (ex is SqlException or InvalidOperationException or TimeoutException)
            {
                if (!string.IsNullOrWhiteSpace(configuredUsername) && !string.IsNullOrWhiteSpace(configuredPassword))
                {
                    if (!string.Equals(request.Username, configuredUsername, StringComparison.Ordinal)
                        || !string.Equals(request.Password, configuredPassword, StringComparison.Ordinal))
                    {
                        return Unauthorized(new { message = "Invalid username or password." });
                    }

                    return Ok(new LoginResponse(true, "Login successful."));
                }

                return Problem("Database login validation is unavailable.");
            }
        }

        if (string.IsNullOrWhiteSpace(configuredUsername) || string.IsNullOrWhiteSpace(configuredPassword))
        {
            return Problem("Login credentials are not configured.");
        }

        if (!string.Equals(request.Username, configuredUsername, StringComparison.Ordinal)
            || !string.Equals(request.Password, configuredPassword, StringComparison.Ordinal))
        {
            return Unauthorized(new { message = "Invalid username or password." });
        }

        return Ok(new LoginResponse(true, "Login successful."));
    }

    private async Task<bool> ValidateLoginAsync(LoginRequest request)
    {
        var connection = _dbContext.Database.GetDbConnection();

        if (connection.State != ConnectionState.Open)
        {
            await connection.OpenAsync(HttpContext.RequestAborted);
        }

        await using var command = connection.CreateCommand();
        command.CommandText = @"
            SELECT CASE WHEN EXISTS (
                SELECT 1
                FROM dbo.TestLoginUsers
                WHERE UserName = @UserName
                  AND [Pass] = @Pass
                  AND (@CompanyID IS NULL OR CompanyID = @CompanyID)
            ) THEN 1 ELSE 0 END;";
        command.CommandType = CommandType.Text;

        AddParameter(command, "@UserName", request.Username.Trim());
        AddParameter(command, "@Pass", request.Password);
        AddParameter(command, "@CompanyID", request.CompanyId is > 0 ? request.CompanyId.Value : DBNull.Value);

        var result = await command.ExecuteScalarAsync(HttpContext.RequestAborted);

        if (result is null || result == DBNull.Value)
        {
            return false;
        }

        return Convert.ToBoolean(result);
    }

    private static void AddParameter(IDbCommand command, string name, object value)
    {
        var parameter = command.CreateParameter();
        parameter.ParameterName = name;
        parameter.Value = value;
        command.Parameters.Add(parameter);
    }
}

public sealed record LoginRequest(string Username, string Password, int? CompanyId = null);

public sealed record LoginResponse(bool IsValid, string Message);
