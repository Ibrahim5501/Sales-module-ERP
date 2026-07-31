using example2.Models;
using Microsoft.AspNetCore.Identity;
using System.Linq;

namespace example2.Data
{
    public static class DbInitializer
    {
        public static void Initialize(ApplicationDbContext context)
        {
            context.Database.EnsureCreated();

            if (!context.Users.Any())
            {
                var user = new User
                {
                    Email = "admin@auraerp.com",
                };
                var passwordHasher = new PasswordHasher<User>();
                user.PasswordHash = passwordHasher.HashPassword(user, "Admin123!");

                context.Users.Add(user);
                context.SaveChanges();
            }

            if (!context.CompanySettings.Any())
            {
                var settings = new CompanySettings
                {
                    NomEntreprise = "DIGI ERP",
                    Activite = "Module de Ventes & Distribution",
                    Adresse = "Avenue Habib Bourguiba, Tunis",
                    Telephone = "+216 71 000 000",
                    Email = "contact@digierp.tn",
                    MatriculeFiscal = "1234567/A/M/000",
                    RIB = "01 234 567890123456789 01",
                    LogoUrl = "",
                    PiedDePage = "DIGI ERP - Document généré automatiquement"
                };
                context.CompanySettings.Add(settings);
                context.SaveChanges();
            }

            if (!context.PlagesHoraires.Any())
            {
                var plages = new[]
                {
                    new PlageHoraire { Nom = "Matinale", HeureDebut = "06:00", HeureFin = "09:00", Description = "Tranche du matin", Actif = true },
                    new PlageHoraire { Nom = "Magazine", HeureDebut = "09:00", HeureFin = "12:00", Description = "Émission mi-journée", Actif = true },
                    new PlageHoraire { Nom = "Journal Télévisé", HeureDebut = "12:00", HeureFin = "13:00", Description = "Tranche d'information", Actif = true },
                    new PlageHoraire { Nom = "Après-midi", HeureDebut = "13:00", HeureFin = "18:00", Description = "Tranche après-midi", Actif = true },
                    new PlageHoraire { Nom = "Culture", HeureDebut = "18:00", HeureFin = "20:00", Description = "Programmes culturels", Actif = true },
                    new PlageHoraire { Nom = "Prime Time", HeureDebut = "20:00", HeureFin = "22:30", Description = "Grande écoute", Actif = true },
                    new PlageHoraire { Nom = "Divertissement", HeureDebut = "22:30", HeureFin = "00:00", Description = "Fin de soirée", Actif = true }
                };
                context.PlagesHoraires.AddRange(plages);
                context.SaveChanges();
            }
        }
    }
}
