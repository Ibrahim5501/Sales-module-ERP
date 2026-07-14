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
        }
    }
}
