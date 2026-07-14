using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using example2.Data;
using example2.Models;
using System.Threading.Tasks;
using System;

using UserEntity = example2.Models.User;

namespace example2.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _config;

        public AuthController(ApplicationDbContext context, IConfiguration config)
        {
            _context = context;
            _config = config;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            if (string.IsNullOrEmpty(request.Email) || string.IsNullOrEmpty(request.Password))
            {
                return BadRequest(new { message = "L'adresse email et le mot de passe sont requis." });
            }

            UserEntity? dbUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
            if (dbUser == null)
            {
                return Unauthorized(new { message = "Identifiants incorrects (email non trouvé)." });
            }

            var passwordHasher = new PasswordHasher<UserEntity>();
            var result = passwordHasher.VerifyHashedPassword(dbUser, dbUser.PasswordHash, request.Password);
            if (result == PasswordVerificationResult.Failed)
            {
                return Unauthorized(new { message = "Identifiants incorrects (mot de passe erroné)." });
            }

            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.UTF8.GetBytes(_config["Jwt:Key"]);
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, dbUser.Id.ToString()),
                    new Claim(ClaimTypes.Email, dbUser.Email),
                }),
                Expires = DateTime.UtcNow.AddDays(7),
                Issuer = _config["Jwt:Issuer"],
                Audience = _config["Jwt:Audience"],
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            var tokenString = tokenHandler.WriteToken(token);

            return Ok(new
            {
                token = tokenString,
                email = dbUser.Email,
            });
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            if (string.IsNullOrEmpty(request.Email) || string.IsNullOrEmpty(request.Password))
            {
                return BadRequest(new { message = "L'adresse email/mot de passe sont requis." });
            }

            var existingUser = await _context.Users.AnyAsync(u => u.Email == request.Email);
            if (existingUser)
            {
                return BadRequest(new { message = "Cet email est déjà utilisé." });
            }

            var newUser = new UserEntity
            {
                Email = request.Email
            };

            var passwordHasher = new PasswordHasher<UserEntity>();
            newUser.PasswordHash = passwordHasher.HashPassword(newUser, request.Password);

            _context.Users.Add(newUser);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Utilisateur enregistré avec succès.",
                user = new { id = newUser.Id, email = newUser.Email }
            });
        }
    }

    public class LoginRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class RegisterRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }
}
