using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using example2.Data;
using example2.Models;
using example2.DTOs;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;

namespace example2.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Route("api/clients")]
    [Authorize]
    public class PartenairesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public PartenairesController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<PartenaireDto>>> Get()
        {
            var partenaires = await _context.Partenaires.OrderByDescending(c => c.Id_Partenaire).ToListAsync();
            var dtos = partenaires.Select(c => new PartenaireDto
            {
                Id_Partenaire = c.Id_Partenaire,
                Nom = c.Nom,
                Entreprise = c.Entreprise,
                Email = c.Email,
                Telephone = c.Telephone,
                Adresse = c.Adresse
            });
            return Ok(dtos);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<PartenaireDto>> GetById(int id)
        {
            var client = await _context.Partenaires.FirstOrDefaultAsync(c => c.Id_Partenaire == id);
            if (client == null) return NotFound(new { message = "Client non trouvé." });

            var dto = new PartenaireDto
            {
                Id_Partenaire = client.Id_Partenaire,
                Nom = client.Nom,
                Entreprise = client.Entreprise,
                Email = client.Email,
                Telephone = client.Telephone,
                Adresse = client.Adresse
            };
            return Ok(dto);
        }

        [HttpPost]
        public async Task<ActionResult<PartenaireDto>> Create(PartenaireCreateDto clientDto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var client = new Partenaire
            {
                Nom = clientDto.Nom,
                Entreprise = clientDto.Entreprise,
                Email = clientDto.Email,
                Telephone = clientDto.Telephone,
                Adresse = clientDto.Adresse
            };

            _context.Partenaires.Add(client);
            await _context.SaveChangesAsync();

            var createdDto = new PartenaireDto
            {
                Id_Partenaire = client.Id_Partenaire,
                Nom = client.Nom,
                Entreprise = client.Entreprise,
                Email = client.Email,
                Telephone = client.Telephone,
                Adresse = client.Adresse
            };

            return CreatedAtAction(nameof(GetById), new { id = client.Id_Partenaire }, createdDto);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<PartenaireDto>> Update(int id, PartenaireUpdateDto clientDto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var existing = await _context.Partenaires.FirstOrDefaultAsync(c => c.Id_Partenaire == id);
            if (existing == null) return NotFound(new { message = "Client non trouvé." });

            existing.Nom = clientDto.Nom;
            existing.Entreprise = clientDto.Entreprise;
            existing.Email = clientDto.Email;
            existing.Telephone = clientDto.Telephone;
            existing.Adresse = clientDto.Adresse;

            await _context.SaveChangesAsync();

            var updatedDto = new PartenaireDto
            {
                Id_Partenaire = existing.Id_Partenaire,
                Nom = existing.Nom,
                Entreprise = existing.Entreprise,
                Email = existing.Email,
                Telephone = existing.Telephone,
                Adresse = existing.Adresse
            };

            return Ok(updatedDto);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var client = await _context.Partenaires
                .Include(p => p.Devis)
                .Include(p => p.Commandes)
                .Include(p => p.Factures)
                .FirstOrDefaultAsync(p => p.Id_Partenaire == id);

            if (client == null)
                return NotFound(new { message = "Client non trouvé." });

            // Prevent deletion if the client is used
            if ((client.Devis?.Any() ?? false) ||
                (client.Commandes?.Any() ?? false) ||
                (client.Factures?.Any() ?? false))
            {
                return BadRequest(new
                {
                    message = "Impossible de supprimer ce client car il est lié à un ou plusieurs devis, commandes ou factures."
                });
            }

            _context.Partenaires.Remove(client);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Client supprimé avec succès."
            });
        }
    }
}
