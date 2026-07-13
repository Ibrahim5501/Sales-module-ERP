using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using example2.Models;

namespace example2.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<Partenaire> Partenaires => Set<Partenaire>();
    public DbSet<Categorie> Categories => Set<Categorie>();
    public DbSet<Produit> Produits => Set<Produit>();
    public DbSet<Devis> Devis => Set<Devis>();
    public DbSet<DevisLigne> DevisLignes => Set<DevisLigne>();
    public DbSet<Commande> Commandes => Set<Commande>();
    public DbSet<CommandeLigne> CommandeLignes => Set<CommandeLigne>();
    public DbSet<Facture> Factures => Set<Facture>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        //----------------------------------------------------
        // Decimal precision
        //----------------------------------------------------
        foreach (var property in modelBuilder.Model
            .GetEntityTypes()
            .SelectMany(e => e.GetProperties())
            .Where(p => p.ClrType == typeof(decimal)
                     || p.ClrType == typeof(decimal?)))
        {
            property.SetPrecision(18);
            property.SetScale(2);
        }

        //----------------------------------------------------
        // Partenaire -> Devis
        //----------------------------------------------------
        modelBuilder.Entity<Partenaire>()
            .HasMany(p => p.Devis)
            .WithOne(d => d.Partenaire)
            .HasForeignKey(d => d.Id_Partenaire)
            .OnDelete(DeleteBehavior.Restrict);

        //----------------------------------------------------
        // Partenaire -> Commande
        //----------------------------------------------------
        modelBuilder.Entity<Partenaire>()
            .HasMany(p => p.Commandes)
            .WithOne(c => c.Partenaire)
            .HasForeignKey(c => c.Id_Partenaire)
            .OnDelete(DeleteBehavior.Restrict);

        //----------------------------------------------------
        // Categorie -> Produit
        //----------------------------------------------------
        modelBuilder.Entity<Categorie>()
            .HasMany(c => c.Produits)
            .WithOne(p => p.Categorie)
            .HasForeignKey(p => p.Id_Categorie)
            .OnDelete(DeleteBehavior.Restrict);

        //----------------------------------------------------
        // Devis -> Lignes
        //----------------------------------------------------
        modelBuilder.Entity<Devis>()
            .HasMany(d => d.Lignes)
            .WithOne(l => l.Devis)
            .HasForeignKey(l => l.Id_Devis)
            .OnDelete(DeleteBehavior.Cascade);

        //----------------------------------------------------
        // Commande -> Lignes
        //----------------------------------------------------
        modelBuilder.Entity<Commande>()
            .HasMany(c => c.Lignes)
            .WithOne(l => l.Commande)
            .HasForeignKey(l => l.Id_Commande)
            .OnDelete(DeleteBehavior.Cascade);

        //----------------------------------------------------
        // Produit -> DevisLigne
        //----------------------------------------------------
        modelBuilder.Entity<DevisLigne>()
            .HasOne(dl => dl.Produit)
            .WithMany(p => p.DevisLignes)
            .HasForeignKey(dl => dl.Id_Produit)
            .OnDelete(DeleteBehavior.Restrict);

        //----------------------------------------------------
        // Produit -> CommandeLigne
        //----------------------------------------------------
        modelBuilder.Entity<CommandeLigne>()
            .HasOne(cl => cl.Produit)
            .WithMany(p => p.CommandeLignes)
            .HasForeignKey(cl => cl.Id_Produit)
            .OnDelete(DeleteBehavior.Restrict);

        //----------------------------------------------------
        // Devis -> Commande (1-1)
        //----------------------------------------------------
        modelBuilder.Entity<Commande>()
            .HasOne(c => c.Devis)
            .WithOne(d => d.Commande)
            .HasForeignKey<Commande>(c => c.Id_Devis)
            .OnDelete(DeleteBehavior.Restrict);

        //----------------------------------------------------
        // Facture -> Commande (1-1)
        //----------------------------------------------------
        modelBuilder.Entity<Facture>()
            .HasOne(f => f.Commande)
            .WithOne(c => c.Facture)
            .HasForeignKey<Facture>(f => f.Id_Commande)
            .OnDelete(DeleteBehavior.Restrict);

        //----------------------------------------------------
        // Facture -> Partenaire (1-1)
        //----------------------------------------------------
        modelBuilder.Entity<Facture>()
            .HasOne(f => f.Partenaire)
            .WithMany(p => p.Factures)
            .HasForeignKey(f => f.Id_Partenaire)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Devis>()
            .Property(d => d.Statut)
            .HasConversion(new EnumToStringConverter<DevisStatut>());

        modelBuilder.Entity<Commande>()
            .Property(c => c.Statut)
            .HasConversion(new EnumToStringConverter<CommandeStatut>());

        modelBuilder.Entity<Facture>()
            .Property(f => f.Statut)
            .HasConversion(new EnumToStringConverter<FactureStatut>());
    }
}