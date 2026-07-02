using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebApplication2.Data;
using WebApplication2.Models;

namespace WebApplication2.Controllers;

[ApiController]
[Route("api/fridges")]
public class FridgesController : ControllerBase
{
    private readonly AppDbContext _dbContext;

    public FridgesController(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    public async Task<ActionResult<FridgeListResponse>> GetAll(
        [FromQuery] string? search,
        [FromQuery] string? status,
        [FromQuery] int? page,
        [FromQuery] int? pageSize)
    {
        var query = _dbContext.Fridges
            .AsNoTracking()
            .Include(fridge => fridge.CurrentOwner)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalizedSearch = search.Trim().ToLower();
            query = query.Where(fridge =>
                fridge.Id.ToLower().Contains(normalizedSearch)
                || fridge.SerialNumber.ToLower().Contains(normalizedSearch)
                || fridge.QrCode.ToLower().Contains(normalizedSearch)
                || (fridge.Model != null && fridge.Model.ToLower().Contains(normalizedSearch))
                || (fridge.CurrentOwner != null && fridge.CurrentOwner.ShopName.ToLower().Contains(normalizedSearch)));
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            var normalizedStatus = NormalizeStatus(status);
            query = normalizedStatus == "REPAIR"
                ? query.Where(fridge => fridge.Status == "REPAIR" || fridge.Status == "MAINTENANCE")
                : query.Where(fridge => fridge.Status == normalizedStatus);
        }

        var currentPage = Math.Max(page ?? 1, 1);
        var take = Math.Clamp(pageSize ?? 50, 1, 500);
        var total = await query.CountAsync(HttpContext.RequestAborted);
        var fetchCount = (int)Math.Min((long)currentPage * take, int.MaxValue);
        var skip = (int)Math.Min((long)(currentPage - 1) * take, int.MaxValue);
        var fetchedFridges = await query
            .OrderBy(fridge => fridge.SerialNumber)
            .Take(fetchCount)
            .ToListAsync(HttpContext.RequestAborted);
        var fridges = fetchedFridges
            .Skip(skip)
            .Take(take);

        return Ok(new FridgeListResponse(
            fridges.Select(fridge => ToResponse(fridge, includeHistory: false)).ToList(),
            total,
            currentPage,
            take));
    }

    [HttpPost]
    public async Task<ActionResult<FridgeResponse>> Create(CreateFridgeRequest request)
    {
        var serialNumber = string.IsNullOrWhiteSpace(request.SerialNumber)
            ? $"FR-{Guid.NewGuid():N}"[..11].ToUpperInvariant()
            : request.SerialNumber.Trim();

        if (await _dbContext.Fridges.AnyAsync(
                fridge => fridge.SerialNumber == serialNumber,
                HttpContext.RequestAborted))
        {
            return Conflict(new { message = "A fridge with this serial number already exists." });
        }

        var ownerResult = await ResolveOwner(request);

        if (ownerResult.Error is not null)
        {
            return BadRequest(new { message = ownerResult.Error });
        }

        var fridge = new Fridge
        {
            SerialNumber = serialNumber,
            Status = NormalizeStatus(request.Status),
            Model = request.Model?.Trim(),
            Capacity = request.Capacity,
            InstallDate = request.InstallDate ?? request.InstalledAt ?? DateTime.UtcNow,
            CurrentOwner = ownerResult.Owner,
            CurrentOwnerId = ownerResult.Owner?.Id,
            Version = 1
        };

        fridge.QrCode = $"fridge:{fridge.Id}";

        _dbContext.Fridges.Add(fridge);
        await _dbContext.SaveChangesAsync(HttpContext.RequestAborted);

        var created = await FindFridge(fridge.Id, asNoTracking: true, includeHistory: true);
        return CreatedAtAction(nameof(GetById), new { id = fridge.Id }, ToResponse(created!, includeHistory: true));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<FridgeResponse>> GetById(string id)
    {
        var fridge = await FindFridge(id, asNoTracking: true, includeHistory: true);

        if (fridge is null)
        {
            return NotFound(new { message = "Fridge was not found." });
        }

        return Ok(ToResponse(fridge, includeHistory: true));
    }

    [HttpGet("{id}/qr-code")]
    public async Task<IActionResult> GetQrCode(string id)
    {
        var fridge = await FindFridge(id, asNoTracking: true);

        if (fridge is null)
        {
            return NotFound(new { message = "Fridge was not found." });
        }

        return Ok(new
        {
            fridgeId = fridge.Id,
            fridge.SerialNumber,
            fridge.QrCode
        });
    }

    [HttpPost("scan")]
    public async Task<ActionResult<ScanResultResponse>> ScanByQrCode(QrScanRequest request)
    {
        var qrCode = request.QrCode ?? request.Code ?? request.Value;

        if (string.IsNullOrWhiteSpace(qrCode))
        {
            return BadRequest(new { message = "A QR code is required." });
        }

        var fridge = await FindFridgeByQrCode(qrCode.Trim());

        if (fridge is null)
        {
            return NotFound(new { message = "No fridge matches this QR code." });
        }

        return Ok(await RecordScan(fridge, request));
    }

    [HttpPost("{id}/scan")]
    public async Task<ActionResult<ScanResultResponse>> Scan(string id, ScanRequest request)
    {
        var fridge = await FindFridge(id);

        if (fridge is null)
        {
            return NotFound(new { message = "Fridge was not found." });
        }

        return Ok(await RecordScan(fridge, request));
    }

    [HttpPost("{id}/transfer")]
    public async Task<ActionResult<FridgeResponse>> Transfer(string id, TransferFridgeRequest request)
    {
        var fridge = await FindFridge(id);

        if (fridge is null)
        {
            return NotFound(new { message = "Fridge was not found." });
        }

        var expectedVersion = request.ExpectedVersion ?? request.Version;

        if (expectedVersion.HasValue && expectedVersion.Value != fridge.Version)
        {
            return Conflict(new
            {
                message = "The fridge was changed by another request. Refresh and try again.",
                currentVersion = fridge.Version
            });
        }

        var toOwnerId = request.ToOwnerId ?? request.ShopOwnerId ?? request.NewOwnerId;

        if (string.IsNullOrWhiteSpace(toOwnerId))
        {
            return BadRequest(new { message = "A target shop owner id is required." });
        }

        var owner = await _dbContext.ShopOwners
            .FirstOrDefaultAsync(item => item.Id == toOwnerId, HttpContext.RequestAborted);

        if (owner is null)
        {
            return BadRequest(new { message = "Target shop owner was not found." });
        }

        var nextVersion = fridge.Version + 1;
        var transfer = new FridgeTransfer
        {
            FridgeId = fridge.Id,
            FromOwnerId = fridge.CurrentOwnerId,
            ToOwnerId = owner.Id,
            TransferredAt = request.TransferredAt ?? DateTime.UtcNow,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            Address = request.Address?.Trim(),
            Notes = request.Notes?.Trim(),
            FridgeVersion = nextVersion
        };

        fridge.CurrentOwnerId = owner.Id;
        fridge.CurrentOwner = owner;
        fridge.LastLatitude = request.Latitude ?? fridge.LastLatitude;
        fridge.LastLongitude = request.Longitude ?? fridge.LastLongitude;
        fridge.LastAddress = request.Address?.Trim() ?? fridge.LastAddress;
        fridge.Version = nextVersion;
        fridge.UpdatedAt = DateTime.UtcNow;

        _dbContext.FridgeTransfers.Add(transfer);
        await _dbContext.SaveChangesAsync(HttpContext.RequestAborted);

        var updated = await FindFridge(fridge.Id, asNoTracking: true, includeHistory: true);
        return Ok(ToResponse(updated!, includeHistory: true));
    }

    private async Task<(ShopOwner? Owner, string? Error)> ResolveOwner(CreateFridgeRequest request)
    {
        if (!string.IsNullOrWhiteSpace(request.CurrentOwnerId))
        {
            var existingOwner = await _dbContext.ShopOwners
                .FirstOrDefaultAsync(owner => owner.Id == request.CurrentOwnerId, HttpContext.RequestAborted);

            return existingOwner is null
                ? (null, "Current owner was not found.")
                : (existingOwner, null);
        }

        if (request.Owner is null)
        {
            return (null, null);
        }

        if (!string.IsNullOrWhiteSpace(request.Owner.Id))
        {
            var existingOwner = await _dbContext.ShopOwners
                .FirstOrDefaultAsync(owner => owner.Id == request.Owner.Id, HttpContext.RequestAborted);

            if (existingOwner is not null)
            {
                return (existingOwner, null);
            }
        }

        if (string.IsNullOrWhiteSpace(request.Owner.ShopName))
        {
            return (null, "The nested owner must include shopName.");
        }

        var owner = new ShopOwner
        {
            Id = string.IsNullOrWhiteSpace(request.Owner.Id)
                ? Guid.NewGuid().ToString("N")
                : request.Owner.Id.Trim(),
            ShopName = request.Owner.ShopName.Trim(),
            OwnerName = request.Owner.OwnerName?.Trim(),
            Phone = request.Owner.Phone?.Trim(),
            Address = request.Owner.Address?.Trim(),
            District = request.Owner.District?.Trim(),
            Latitude = request.Owner.Latitude,
            Longitude = request.Owner.Longitude
        };

        _dbContext.ShopOwners.Add(owner);
        return (owner, null);
    }

    private async Task<ScanResultResponse> RecordScan(Fridge fridge, ScanRequest request)
    {
        var scannedAt = request.ScannedAt ?? DateTime.UtcNow;
        var scan = new FridgeScan
        {
            FridgeId = fridge.Id,
            ScannedAt = scannedAt,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            Address = request.Address?.Trim(),
            Notes = request.Notes?.Trim()
        };

        fridge.LastScannedAt = scannedAt;
        fridge.LastLatitude = request.Latitude ?? fridge.LastLatitude;
        fridge.LastLongitude = request.Longitude ?? fridge.LastLongitude;
        fridge.LastAddress = request.Address?.Trim() ?? fridge.LastAddress;
        fridge.Version += 1;
        fridge.UpdatedAt = DateTime.UtcNow;

        _dbContext.FridgeScans.Add(scan);
        await _dbContext.SaveChangesAsync(HttpContext.RequestAborted);

        var updated = await FindFridge(fridge.Id, asNoTracking: true, includeHistory: true);
        return new ScanResultResponse(ToScanResponse(scan), ToResponse(updated!, includeHistory: true));
    }

    private async Task<Fridge?> FindFridge(
        string id,
        bool asNoTracking = false,
        bool includeHistory = false)
    {
        var query = FridgeQuery(asNoTracking, includeHistory);
        return await query.FirstOrDefaultAsync(
            fridge => fridge.Id == id || fridge.SerialNumber == id,
            HttpContext.RequestAborted);
    }

    private async Task<Fridge?> FindFridgeByQrCode(string qrCode)
    {
        var idFromQrCode = qrCode.StartsWith("fridge:", StringComparison.OrdinalIgnoreCase)
            ? qrCode["fridge:".Length..]
            : qrCode;

        return await FridgeQuery(asNoTracking: false, includeHistory: false)
            .FirstOrDefaultAsync(
                fridge => fridge.QrCode == qrCode
                    || fridge.Id == idFromQrCode
                    || fridge.SerialNumber == qrCode,
                HttpContext.RequestAborted);
    }

    private IQueryable<Fridge> FridgeQuery(bool asNoTracking, bool includeHistory)
    {
        IQueryable<Fridge> query = _dbContext.Fridges
            .Include(fridge => fridge.CurrentOwner);

        if (includeHistory)
        {
            query = query
                .Include(fridge => fridge.Scans)
                .Include(fridge => fridge.Transfers)
                    .ThenInclude(transfer => transfer.FromOwner)
                .Include(fridge => fridge.Transfers)
                    .ThenInclude(transfer => transfer.ToOwner);
        }

        return asNoTracking ? query.AsNoTracking() : query;
    }

    private static string NormalizeStatus(string? status)
    {
        if (string.IsNullOrWhiteSpace(status))
        {
            return "ACTIVE";
        }

        var normalized = status.Trim().ToUpperInvariant();
        return normalized == "MAINTENANCE" ? "REPAIR" : normalized;
    }

    private static FridgeResponse ToResponse(Fridge fridge, bool includeHistory)
    {
        var owner = ToOwnerResponse(fridge.CurrentOwner);
        var scans = includeHistory
            ? fridge.Scans.OrderByDescending(scan => scan.ScannedAt).Select(ToScanResponse).ToList()
            : [];
        var transfers = includeHistory
            ? fridge.Transfers.OrderByDescending(transfer => transfer.TransferredAt).Select(ToTransferResponse).ToList()
            : [];

        return new FridgeResponse(
            fridge.Id,
            fridge.SerialNumber,
            NormalizeStatus(fridge.Status),
            fridge.Model,
            fridge.Capacity,
            fridge.InstallDate,
            fridge.QrCode,
            owner,
            owner,
            fridge.LastScannedAt,
            fridge.LastLatitude,
            fridge.LastLongitude,
            fridge.LastAddress,
            fridge.Version,
            scans,
            transfers,
            fridge.CreatedAt,
            fridge.UpdatedAt);
    }

    private static OwnerResponse? ToOwnerResponse(ShopOwner? owner)
    {
        return owner is null
            ? null
            : new OwnerResponse(
                owner.Id,
                owner.ShopName,
                owner.OwnerName,
                owner.Phone,
                owner.Address,
                owner.District,
                owner.Latitude,
                owner.Longitude,
                owner.CreatedAt);
    }

    private static FridgeScanResponse ToScanResponse(FridgeScan scan)
    {
        return new FridgeScanResponse(
            scan.Id,
            scan.FridgeId,
            scan.ScannedAt,
            scan.Latitude,
            scan.Longitude,
            scan.Address,
            scan.Notes);
    }

    private static FridgeTransferResponse ToTransferResponse(FridgeTransfer transfer)
    {
        return new FridgeTransferResponse(
            transfer.Id,
            transfer.FridgeId,
            transfer.FromOwnerId,
            transfer.ToOwnerId,
            ToOwnerResponse(transfer.FromOwner),
            ToOwnerResponse(transfer.ToOwner),
            transfer.TransferredAt,
            transfer.Latitude,
            transfer.Longitude,
            transfer.Address,
            transfer.Notes,
            transfer.FridgeVersion);
    }
}

public sealed class CreateFridgeRequest
{
    public string? SerialNumber { get; init; }

    public string? Status { get; init; }

    public string? Model { get; init; }

    public int? Capacity { get; init; }

    public DateTime? InstallDate { get; init; }

    public DateTime? InstalledAt { get; init; }

    public string? CurrentOwnerId { get; init; }

    public CreateShopOwnerRequest? Owner { get; init; }
}

public class ScanRequest
{
    public decimal? Latitude { get; init; }

    public decimal? Longitude { get; init; }

    public string? Address { get; init; }

    public string? Notes { get; init; }

    public DateTime? ScannedAt { get; init; }
}

public sealed class QrScanRequest : ScanRequest
{
    public string? QrCode { get; init; }

    public string? Code { get; init; }

    public string? Value { get; init; }
}

public sealed class TransferFridgeRequest
{
    public string? ToOwnerId { get; init; }

    public string? ShopOwnerId { get; init; }

    public string? NewOwnerId { get; init; }

    public decimal? Latitude { get; init; }

    public decimal? Longitude { get; init; }

    public string? Address { get; init; }

    public string? Notes { get; init; }

    public int? Version { get; init; }

    public int? ExpectedVersion { get; init; }

    public DateTime? TransferredAt { get; init; }
}

public sealed record FridgeListResponse(
    IReadOnlyList<FridgeResponse> Items,
    int Total,
    int Page,
    int PageSize);

public sealed record FridgeResponse(
    string Id,
    string SerialNumber,
    string Status,
    string? Model,
    int? Capacity,
    DateTime? InstallDate,
    string QrCode,
    OwnerResponse? CurrentOwner,
    OwnerResponse? Owner,
    DateTime? LastScannedAt,
    decimal? LastLatitude,
    decimal? LastLongitude,
    string? LastAddress,
    int Version,
    IReadOnlyList<FridgeScanResponse> Scans,
    IReadOnlyList<FridgeTransferResponse> Transfers,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record OwnerResponse(
    string Id,
    string ShopName,
    string? OwnerName,
    string? Phone,
    string? Address,
    string? District,
    decimal? Latitude,
    decimal? Longitude,
    DateTime CreatedAt);

public sealed record FridgeScanResponse(
    string Id,
    string FridgeId,
    DateTime ScannedAt,
    decimal? Latitude,
    decimal? Longitude,
    string? Address,
    string? Notes);

public sealed record ScanResultResponse(
    FridgeScanResponse Scan,
    FridgeResponse Fridge);

public sealed record FridgeTransferResponse(
    string Id,
    string FridgeId,
    string? FromOwnerId,
    string ToOwnerId,
    OwnerResponse? FromOwner,
    OwnerResponse? ToOwner,
    DateTime TransferredAt,
    decimal? Latitude,
    decimal? Longitude,
    string? Address,
    string? Notes,
    int Version);
