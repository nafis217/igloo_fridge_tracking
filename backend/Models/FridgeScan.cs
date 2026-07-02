namespace WebApplication2.Models;

public class FridgeScan
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");

    public string FridgeId { get; set; } = string.Empty;

    public Fridge? Fridge { get; set; }

    public DateTime ScannedAt { get; set; } = DateTime.UtcNow;

    public decimal? Latitude { get; set; }

    public decimal? Longitude { get; set; }

    public string? Address { get; set; }

    public string? Notes { get; set; }
}
