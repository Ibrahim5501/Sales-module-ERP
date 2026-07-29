using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using example2.Data;
using example2.Models;
using example2.DTOs;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Authorization;

namespace example2.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class CompanySettingsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IWebHostEnvironment _env;

        public CompanySettingsController(ApplicationDbContext context, IWebHostEnvironment env)
        {
            _context = context;
            _env = env;
        }

        // GET: api/CompanySettings
        [HttpGet]
        [AllowAnonymous]
        public async Task<ActionResult<CompanySettingsDto>> Get()
        {
            var settings = await _context.CompanySettings.FirstOrDefaultAsync();
            if (settings == null)
            {
                settings = new CompanySettings();
                _context.CompanySettings.Add(settings);
                await _context.SaveChangesAsync();
            }

            return Ok(MapToDto(settings));
        }

        // PUT: api/CompanySettings
        [HttpPut]
        public async Task<ActionResult<CompanySettingsDto>> Update([FromBody] CompanySettingsDto dto)
        {
            var settings = await _context.CompanySettings.FirstOrDefaultAsync();
            if (settings == null)
            {
                settings = new CompanySettings();
                _context.CompanySettings.Add(settings);
            }

            settings.NomEntreprise = dto.NomEntreprise ?? "DIGI ERP";
            settings.Activite = dto.Activite;
            settings.Adresse = dto.Adresse;
            settings.Telephone = dto.Telephone;
            settings.Email = dto.Email;
            settings.MatriculeFiscal = dto.MatriculeFiscal;
            settings.RIB = dto.RIB;
            settings.PiedDePage = dto.PiedDePage;
            if (!string.IsNullOrEmpty(dto.LogoUrl))
            {
                settings.LogoUrl = dto.LogoUrl;
            }

            await _context.SaveChangesAsync();
            return Ok(MapToDto(settings));
        }

        // POST: api/CompanySettings/logo
        [HttpPost("logo")]
        public async Task<IActionResult> UploadLogo(IFormFile logoFile)
        {
            if (logoFile == null || logoFile.Length == 0)
                return BadRequest(new { message = "Aucun fichier fourni." });

            var uploadsFolder = Path.Combine(_env.WebRootPath, "uploads");
            if (!Directory.Exists(uploadsFolder))
            {
                Directory.CreateDirectory(uploadsFolder);
            }

            var fileExt = Path.GetExtension(logoFile.FileName);
            var fileName = $"logo_{DateTime.Now.Ticks}{fileExt}";
            var filePath = Path.Combine(uploadsFolder, fileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await logoFile.CopyToAsync(stream);
            }

            var logoUrl = $"/uploads/{fileName}";

            var settings = await _context.CompanySettings.FirstOrDefaultAsync();
            if (settings == null)
            {
                settings = new CompanySettings();
                _context.CompanySettings.Add(settings);
            }

            settings.LogoUrl = logoUrl;
            await _context.SaveChangesAsync();

            return Ok(new { logoUrl = logoUrl, message = "Logo téléversé avec succès." });
        }

        private static CompanySettingsDto MapToDto(CompanySettings s)
        {
            return new CompanySettingsDto
            {
                Id = s.Id,
                NomEntreprise = s.NomEntreprise,
                Activite = s.Activite,
                Adresse = s.Adresse,
                Telephone = s.Telephone,
                Email = s.Email,
                MatriculeFiscal = s.MatriculeFiscal,
                RIB = s.RIB,
                LogoUrl = s.LogoUrl,
                PiedDePage = s.PiedDePage
            };
        }
    }
}
