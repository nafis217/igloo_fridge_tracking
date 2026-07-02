using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebApplication2.Data;

namespace WebApplication2.Controllers;

[ApiController]
[Route("api/reports")]
public class ReportsController : ControllerBase
{
    private readonly AppDbContext _dbContext;

    public ReportsController(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet("summary")]
    [HttpGet("/api/dashboard")]
    public async Task<IActionResult> Summary()
    {
        var statuses = await _dbContext.Fridges
            .AsNoTracking()
            .Select(fridge => fridge.Status)
            .ToListAsync(HttpContext.RequestAborted);

        var byStatus = statuses
            .Select(NormalizeStatus)
            .GroupBy(status => status)
            .ToDictionary(group => group.Key, group => group.Count());

        foreach (var knownStatus in new[] { "ACTIVE", "REPAIR", "INACTIVE" })
        {
            byStatus.TryAdd(knownStatus, 0);
        }

        var ownerLocations = await _dbContext.Fridges
            .AsNoTracking()
            .Where(fridge => fridge.CurrentOwner != null)
            .Select(fridge => new
            {
                fridge.CurrentOwner!.District,
                fridge.CurrentOwner.Address
            })
            .ToListAsync(HttpContext.RequestAborted);

        var byDistrict = ownerLocations
            .Select(location => ResolveDistrict(location.District, location.Address))
            .GroupBy(district => district)
            .ToDictionary(group => group.Key, group => group.Count());

        var totalFridges = statuses.Count;
        var activeFridges = byStatus["ACTIVE"];
        var repairFridges = byStatus["REPAIR"];
        var inactiveFridges = byStatus["INACTIVE"];
        var totalShopOwners = await _dbContext.ShopOwners.CountAsync(HttpContext.RequestAborted);
        var totalScans = await _dbContext.FridgeScans.CountAsync(HttpContext.RequestAborted);
        var totalTransfers = await _dbContext.FridgeTransfers.CountAsync(HttpContext.RequestAborted);

        var recentScans = await _dbContext.FridgeScans
            .AsNoTracking()
            .OrderByDescending(scan => scan.ScannedAt)
            .Take(10)
            .Select(scan => new
            {
                scan.Id,
                scan.FridgeId,
                scan.ScannedAt,
                scan.Latitude,
                scan.Longitude,
                scan.Address,
                scan.Notes
            })
            .ToListAsync(HttpContext.RequestAborted);

        return Ok(new
        {
            total = totalFridges,
            byStatus,
            byDistrict,
            totalFridges,
            activeFridges,
            repairFridges,
            maintenanceFridges = repairFridges,
            inactiveFridges,
            totalShopOwners,
            totalScans,
            totalTransfers,
            fridges = new
            {
                total = totalFridges,
                active = activeFridges,
                repair = repairFridges,
                maintenance = repairFridges,
                inactive = inactiveFridges
            },
            shopOwners = new
            {
                total = totalShopOwners
            },
            statusCounts = new
            {
                active = activeFridges,
                repair = repairFridges,
                maintenance = repairFridges,
                inactive = inactiveFridges
            },
            recentScans
        });
    }

    private static string NormalizeStatus(string? status)
    {
        if (string.IsNullOrWhiteSpace(status))
        {
            return "UNKNOWN";
        }

        var normalized = status.Trim().ToUpperInvariant();
        return normalized == "MAINTENANCE" ? "REPAIR" : normalized;
    }

    private static string ResolveDistrict(string? district, string? address)
    {
        if (!string.IsNullOrWhiteSpace(district))
        {
            return district.Trim();
        }

        if (string.IsNullOrWhiteSpace(address))
        {
            return "Unknown";
        }

        return address
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .LastOrDefault() ?? "Unknown";
    }
}
