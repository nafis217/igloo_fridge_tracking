using Microsoft.EntityFrameworkCore;
using WebApplication2.Models;

namespace WebApplication2.Data;

public static class DatabaseSeeder
{
    public static async Task SeedAsync(IServiceProvider serviceProvider)
    {
        var dbContext = serviceProvider.GetRequiredService<AppDbContext>();

        await dbContext.Database.EnsureCreatedAsync();

        if (await dbContext.ShopOwners.AnyAsync())
        {
            return;
        }

        var owners = new[]
        {
            new ShopOwner
            {
                Id = "owner-001",
                ShopName = "Gulshan Cold Corner",
                OwnerName = "Rahim Uddin",
                Phone = "01700000001",
                Address = "Gulshan, Dhaka",
                District = "Dhaka",
                Latitude = 23.8103m,
                Longitude = 90.4125m
            },
            new ShopOwner
            {
                Id = "owner-002",
                ShopName = "Banani Super Shop",
                OwnerName = "Karim Ahmed",
                Phone = "01700000002",
                Address = "Banani, Dhaka",
                District = "Dhaka",
                Latitude = 23.7937m,
                Longitude = 90.4066m
            },
            new ShopOwner
            {
                Id = "owner-003",
                ShopName = "Dhanmondi Retail Point",
                OwnerName = "Nusrat Jahan",
                Phone = "01700000003",
                Address = "Dhanmondi, Dhaka",
                District = "Dhaka",
                Latitude = 23.7465m,
                Longitude = 90.3760m
            }
        };

        dbContext.ShopOwners.AddRange(owners);

        dbContext.Fridges.AddRange(
            new Fridge
            {
                Id = "fridge-001",
                SerialNumber = "FR-1001",
                Status = "ACTIVE",
                Model = "IG-300",
                Capacity = 300,
                InstallDate = DateTime.UtcNow.Date.AddMonths(-8),
                QrCode = "fridge:fridge-001",
                CurrentOwnerId = owners[0].Id
            },
            new Fridge
            {
                Id = "fridge-002",
                SerialNumber = "FR-1002",
                Status = "ACTIVE",
                Model = "IG-450",
                Capacity = 450,
                InstallDate = DateTime.UtcNow.Date.AddMonths(-6),
                QrCode = "fridge:fridge-002",
                CurrentOwnerId = owners[1].Id
            },
            new Fridge
            {
                Id = "fridge-003",
                SerialNumber = "FR-1003",
                Status = "REPAIR",
                Model = "IG-300",
                Capacity = 300,
                InstallDate = DateTime.UtcNow.Date.AddMonths(-4),
                QrCode = "fridge:fridge-003",
                CurrentOwnerId = owners[2].Id
            });

        await dbContext.SaveChangesAsync();
    }
}
