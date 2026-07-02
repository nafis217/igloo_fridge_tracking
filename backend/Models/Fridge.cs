namespace WebApplication2.Models;

public class Fridge
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");

    public string SerialNumber { get; set; } = string.Empty;

    public string Status { get; set; } = "ACTIVE";

    public string? Model { get; set; }

    public int? Capacity { get; set; }

    public DateTime? InstallDate { get; set; }

    public string QrCode { get; set; } = string.Empty;

    public string? CurrentOwnerId { get; set; }

    public ShopOwner? CurrentOwner { get; set; }

    public DateTime? LastScannedAt { get; set; }

    public decimal? LastLatitude { get; set; }

    public decimal? LastLongitude { get; set; }

    public string? LastAddress { get; set; }

    public int Version { get; set; } = 1;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public List<FridgeScan> Scans { get; set; } = [];

    public List<FridgeTransfer> Transfers { get; set; } = [];
}
