using Microsoft.EntityFrameworkCore;
using WebApplication2.Models;

namespace WebApplication2.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<Fridge> Fridges => Set<Fridge>();

    public DbSet<ShopOwner> ShopOwners => Set<ShopOwner>();

    public DbSet<FridgeScan> FridgeScans => Set<FridgeScan>();

    public DbSet<FridgeTransfer> FridgeTransfers => Set<FridgeTransfer>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Fridge>()
            .HasIndex(fridge => fridge.SerialNumber)
            .IsUnique();

        modelBuilder.Entity<Fridge>()
            .HasIndex(fridge => fridge.QrCode)
            .IsUnique();

        modelBuilder.Entity<Fridge>()
            .HasOne(fridge => fridge.CurrentOwner)
            .WithMany(owner => owner.Fridges)
            .HasForeignKey(fridge => fridge.CurrentOwnerId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<FridgeScan>()
            .HasOne(scan => scan.Fridge)
            .WithMany(fridge => fridge.Scans)
            .HasForeignKey(scan => scan.FridgeId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<FridgeTransfer>()
            .HasOne(transfer => transfer.Fridge)
            .WithMany(fridge => fridge.Transfers)
            .HasForeignKey(transfer => transfer.FridgeId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<FridgeTransfer>()
            .HasOne(transfer => transfer.FromOwner)
            .WithMany()
            .HasForeignKey(transfer => transfer.FromOwnerId)
            .OnDelete(DeleteBehavior.NoAction);

        modelBuilder.Entity<FridgeTransfer>()
            .HasOne(transfer => transfer.ToOwner)
            .WithMany()
            .HasForeignKey(transfer => transfer.ToOwnerId)
            .OnDelete(DeleteBehavior.NoAction);

        modelBuilder.Entity<ShopOwner>()
            .Property(owner => owner.Latitude)
            .HasPrecision(18, 6);

        modelBuilder.Entity<ShopOwner>()
            .Property(owner => owner.Longitude)
            .HasPrecision(18, 6);

        modelBuilder.Entity<FridgeScan>()
            .Property(scan => scan.Latitude)
            .HasPrecision(18, 6);

        modelBuilder.Entity<FridgeScan>()
            .Property(scan => scan.Longitude)
            .HasPrecision(18, 6);

        modelBuilder.Entity<FridgeTransfer>()
            .Property(transfer => transfer.Latitude)
            .HasPrecision(18, 6);

        modelBuilder.Entity<FridgeTransfer>()
            .Property(transfer => transfer.Longitude)
            .HasPrecision(18, 6);

        modelBuilder.Entity<Fridge>()
            .Property(fridge => fridge.LastLatitude)
            .HasPrecision(18, 6);

        modelBuilder.Entity<Fridge>()
            .Property(fridge => fridge.LastLongitude)
            .HasPrecision(18, 6);
    }
}
