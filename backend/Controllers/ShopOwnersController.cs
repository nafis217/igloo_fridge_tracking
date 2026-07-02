using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebApplication2.Data;
using WebApplication2.Models;

namespace WebApplication2.Controllers;

[ApiController]
[Route("api/shop-owners")]
public class ShopOwnersController : ControllerBase
{
    private readonly AppDbContext _dbContext;

    public ShopOwnersController(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ShopOwnerResponse>>> GetAll([FromQuery] string? search)
    {
        var query = _dbContext.ShopOwners
            .AsNoTracking()
            .Include(owner => owner.Fridges)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalizedSearch = search.Trim().ToLower();
            query = query.Where(owner =>
                owner.ShopName.ToLower().Contains(normalizedSearch)
                || (owner.OwnerName != null && owner.OwnerName.ToLower().Contains(normalizedSearch))
                || (owner.Phone != null && owner.Phone.Contains(normalizedSearch))
                || (owner.Address != null && owner.Address.ToLower().Contains(normalizedSearch)));
        }

        var owners = await query
            .OrderBy(owner => owner.ShopName)
            .ToListAsync();

        return Ok(owners.Select(ToResponse));
    }

    [HttpPost]
    public async Task<ActionResult<ShopOwnerResponse>> Create(CreateShopOwnerRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.ShopName))
        {
            return BadRequest(new { message = "Shop name is required." });
        }

        var owner = new ShopOwner
        {
            ShopName = request.ShopName.Trim(),
            OwnerName = request.OwnerName,
            Phone = request.Phone,
            Address = request.Address,
            District = request.District,
            Latitude = request.Latitude,
            Longitude = request.Longitude
        };

        _dbContext.ShopOwners.Add(owner);
        await _dbContext.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = owner.Id }, ToResponse(owner));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ShopOwnerResponse>> GetById(string id)
    {
        var owner = await _dbContext.ShopOwners
            .AsNoTracking()
            .Include(item => item.Fridges)
            .FirstOrDefaultAsync(item => item.Id == id);

        if (owner is null)
        {
            return NotFound(new { message = "Shop owner was not found." });
        }

        return Ok(ToResponse(owner));
    }

    private static ShopOwnerResponse ToResponse(ShopOwner owner)
    {
        return new ShopOwnerResponse(
            owner.Id,
            owner.ShopName,
            owner.OwnerName,
            owner.Phone,
            owner.Address,
            owner.District,
            owner.Latitude,
            owner.Longitude,
            owner.Fridges.Count,
            owner.CreatedAt);
    }
}

public sealed class CreateShopOwnerRequest
{
    public string? Id { get; init; }

    public string ShopName { get; init; } = string.Empty;

    public string? OwnerName { get; init; }

    public string? Phone { get; init; }

    public string? Address { get; init; }

    public string? District { get; init; }

    public decimal? Latitude { get; init; }

    public decimal? Longitude { get; init; }
}

public sealed record ShopOwnerResponse(
    string Id,
    string ShopName,
    string? OwnerName,
    string? Phone,
    string? Address,
    string? District,
    decimal? Latitude,
    decimal? Longitude,
    int FridgeCount,
    DateTime CreatedAt);
