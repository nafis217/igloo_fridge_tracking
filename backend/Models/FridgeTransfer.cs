namespace WebApplication2.Models;

public class FridgeTransfer
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");

    public string FridgeId { get; set; } = string.Empty;

    public Fridge? Fridge { get; set; }

    public string? FromOwnerId { get; set; }

    public ShopOwner? FromOwner { get; set; }

    public string ToOwnerId { get; set; } = string.Empty;

    public ShopOwner? ToOwner { get; set; }

    public DateTime TransferredAt { get; set; } = DateTime.UtcNow;

    public decimal? Latitude { get; set; }

    public decimal? Longitude { get; set; }

    public string? Address { get; set; }

    public string? Notes { get; set; }

    public int FridgeVersion { get; set; }
}
