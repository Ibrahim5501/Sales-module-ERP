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
        }
    }
}
