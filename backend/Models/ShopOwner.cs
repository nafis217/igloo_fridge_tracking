namespace WebApplication2.Models;

public class ShopOwner
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");

    public string ShopName { get; set; } = string.Empty;

    public string? OwnerName { get; set; }

    public string? Phone { get; set; }

    public string? Address { get; set; }

    public string? District { get; set; }

    public decimal? Latitude { get; set; }

    public decimal? Longitude { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public List<Fridge> Fridges { get; set; } = [];
}
