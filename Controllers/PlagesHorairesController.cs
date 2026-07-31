using example2.Data;
using example2.DTOs;
using example2.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace example2.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PlagesHorairesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public PlagesHorairesController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/PlagesHoraires
        [HttpGet]
        public async Task<ActionResult<IEnumerable<PlageHoraireDto>>> Get()
        {
            var list = await _context.PlagesHoraires
                .OrderBy(p => p.Id_PlageHoraire)
                .Select(p => new PlageHoraireDto
                {
                    Id_PlageHoraire = p.Id_PlageHoraire,
                    Nom = p.Nom,
                    HeureDebut = p.HeureDebut,
                    HeureFin = p.HeureFin,
                    Description = p.Description,
                    Actif = p.Actif
                })
                .ToListAsync();

            return Ok(list);
        }

        // GET: api/PlagesHoraires/5
        [HttpGet("{id}")]
        public async Task<ActionResult<PlageHoraireDto>> GetById(int id)
        {
            var p = await _context.PlagesHoraires.FindAsync(id);
            if (p == null)
                return NotFound(new { message = "Plage horaire non trouvée." });

            return Ok(new PlageHoraireDto
            {
                Id_PlageHoraire = p.Id_PlageHoraire,
                Nom = p.Nom,
                HeureDebut = p.HeureDebut,
                HeureFin = p.HeureFin,
                Description = p.Description,
                Actif = p.Actif
            });
        }

        // POST: api/PlagesHoraires
        [HttpPost]
        public async Task<ActionResult<PlageHoraireDto>> Post([FromBody] PlageHoraireCreateDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var p = new PlageHoraire
            {
                Nom = dto.Nom,
                HeureDebut = dto.HeureDebut,
                HeureFin = dto.HeureFin,
                Description = dto.Description,
                Actif = dto.Actif
            };

            _context.PlagesHoraires.Add(p);
            await _context.SaveChangesAsync();

            var result = new PlageHoraireDto
            {
                Id_PlageHoraire = p.Id_PlageHoraire,
                Nom = p.Nom,
                HeureDebut = p.HeureDebut,
                HeureFin = p.HeureFin,
                Description = p.Description,
                Actif = p.Actif
            };

            return CreatedAtAction(nameof(GetById), new { id = p.Id_PlageHoraire }, result);
        }

        // PUT: api/PlagesHoraires/5
        [HttpPut("{id}")]
        public async Task<IActionResult> Put(int id, [FromBody] PlageHoraireUpdateDto dto)
        {
            var p = await _context.PlagesHoraires.FindAsync(id);
            if (p == null)
                return NotFound(new { message = "Plage horaire non trouvée." });

            p.Nom = dto.Nom;
            p.HeureDebut = dto.HeureDebut;
            p.HeureFin = dto.HeureFin;
            p.Description = dto.Description;
            p.Actif = dto.Actif;

            await _context.SaveChangesAsync();

            return NoContent();
        }

        // DELETE: api/PlagesHoraires/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var p = await _context.PlagesHoraires.FindAsync(id);
            if (p == null)
                return NotFound(new { message = "Plage horaire non trouvée." });

            _context.PlagesHoraires.Remove(p);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
