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
    public class ArticlesVariantesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public ArticlesVariantesController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/ArticlesVariantes
        [HttpGet]
        public async Task<ActionResult<IEnumerable<ArticleVarianteDto>>> Get()
        {
            var list = await _context.ArticlesVariantes
                .Include(av => av.Produit)
                .Include(av => av.PlageHoraire)
                .OrderBy(av => av.Id_Produit)
                .ThenBy(av => av.Id_PlageHoraire)
                .Select(av => new ArticleVarianteDto
                {
                    Id_ArticleVariante = av.Id_ArticleVariante,
                    Designation       = av.Designation,
                    Id_Produit        = av.Id_Produit,
                    NomProduit        = av.Produit != null ? av.Produit.Designation : "",
                    CodeProduit       = av.Produit != null ? av.Produit.Code : "",
                    Id_PlageHoraire   = av.Id_PlageHoraire,
                    NomPlageHoraire   = av.PlageHoraire != null ? av.PlageHoraire.Nom : "",
                    HeureDebut        = av.PlageHoraire != null ? av.PlageHoraire.HeureDebut : "",
                    HeureFin          = av.PlageHoraire != null ? av.PlageHoraire.HeureFin : "",
                    PrixVariante      = av.PrixVariante,
                    TauxTVA           = av.TauxTVA,
                    DureeDefaut       = av.DureeDefaut,
                    Actif             = av.Actif
                })
                .ToListAsync();

            return Ok(list);
        }

        // GET: api/ArticlesVariantes/spot/5
        // Returns only variants belonging to a specific spot (produit)
        [HttpGet("spot/{spotId}")]
        public async Task<ActionResult<IEnumerable<ArticleVarianteDto>>> GetBySpot(int spotId)
        {
            var list = await _context.ArticlesVariantes
                .Include(av => av.Produit)
                .Include(av => av.PlageHoraire)
                .Where(av => av.Id_Produit == spotId && av.Actif)
                .OrderBy(av => av.Id_PlageHoraire)
                .Select(av => new ArticleVarianteDto
                {
                    Id_ArticleVariante = av.Id_ArticleVariante,
                    Designation       = av.Designation,
                    Id_Produit        = av.Id_Produit,
                    NomProduit        = av.Produit != null ? av.Produit.Designation : "",
                    CodeProduit       = av.Produit != null ? av.Produit.Code : "",
                    Id_PlageHoraire   = av.Id_PlageHoraire,
                    NomPlageHoraire   = av.PlageHoraire != null ? av.PlageHoraire.Nom : "",
                    HeureDebut        = av.PlageHoraire != null ? av.PlageHoraire.HeureDebut : "",
                    HeureFin          = av.PlageHoraire != null ? av.PlageHoraire.HeureFin : "",
                    PrixVariante      = av.PrixVariante,
                    TauxTVA           = av.TauxTVA,
                    DureeDefaut       = av.DureeDefaut,
                    Actif             = av.Actif
                })
                .ToListAsync();

            return Ok(list);
        }

        // GET: api/ArticlesVariantes/5
        [HttpGet("{id}")]
        public async Task<ActionResult<ArticleVarianteDto>> GetById(int id)
        {
            var av = await _context.ArticlesVariantes
                .Include(a => a.Produit)
                .Include(a => a.PlageHoraire)
                .FirstOrDefaultAsync(a => a.Id_ArticleVariante == id);

            if (av == null)
                return NotFound(new { message = "Article variante non trouvé." });

            return Ok(new ArticleVarianteDto
            {
                Id_ArticleVariante = av.Id_ArticleVariante,
                Designation       = av.Designation,
                Id_Produit        = av.Id_Produit,
                NomProduit        = av.Produit?.Designation ?? "",
                CodeProduit       = av.Produit?.Code ?? "",
                Id_PlageHoraire   = av.Id_PlageHoraire,
                NomPlageHoraire   = av.PlageHoraire?.Nom ?? "",
                HeureDebut        = av.PlageHoraire?.HeureDebut ?? "",
                HeureFin          = av.PlageHoraire?.HeureFin ?? "",
                PrixVariante      = av.PrixVariante,
                TauxTVA           = av.TauxTVA,
                DureeDefaut       = av.DureeDefaut,
                Actif             = av.Actif
            });
        }

        // POST: api/ArticlesVariantes
        [HttpPost]
        public async Task<ActionResult<ArticleVarianteDto>> Post([FromBody] ArticleVarianteCreateDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // Validate FK existence
            if (!await _context.Produits.AnyAsync(p => p.Id_Produit == dto.Id_Produit))
                return BadRequest(new { message = "Spot publicitaire introuvable." });
            if (!await _context.PlagesHoraires.AnyAsync(p => p.Id_PlageHoraire == dto.Id_PlageHoraire))
                return BadRequest(new { message = "Plage horaire introuvable." });

            var entity = new ArticleVariante
            {
                Designation     = dto.Designation,
                Id_Produit      = dto.Id_Produit,
                Id_PlageHoraire = dto.Id_PlageHoraire,
                PrixVariante    = dto.PrixVariante,
                TauxTVA         = dto.TauxTVA,
                DureeDefaut     = dto.DureeDefaut,
                Actif           = dto.Actif
            };

            _context.ArticlesVariantes.Add(entity);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = entity.Id_ArticleVariante },
                new { entity.Id_ArticleVariante });
        }

        // PUT: api/ArticlesVariantes/5
        [HttpPut("{id}")]
        public async Task<IActionResult> Put(int id, [FromBody] ArticleVarianteUpdateDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var entity = await _context.ArticlesVariantes.FindAsync(id);
            if (entity == null)
                return NotFound(new { message = "Article variante non trouvé." });

            if (!await _context.Produits.AnyAsync(p => p.Id_Produit == dto.Id_Produit))
                return BadRequest(new { message = "Spot publicitaire introuvable." });
            if (!await _context.PlagesHoraires.AnyAsync(p => p.Id_PlageHoraire == dto.Id_PlageHoraire))
                return BadRequest(new { message = "Plage horaire introuvable." });

            entity.Designation     = dto.Designation;
            entity.Id_Produit      = dto.Id_Produit;
            entity.Id_PlageHoraire = dto.Id_PlageHoraire;
            entity.PrixVariante    = dto.PrixVariante;
            entity.TauxTVA         = dto.TauxTVA;
            entity.DureeDefaut     = dto.DureeDefaut;
            entity.Actif           = dto.Actif;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        // DELETE: api/ArticlesVariantes/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var entity = await _context.ArticlesVariantes.FindAsync(id);
            if (entity == null)
                return NotFound(new { message = "Article variante non trouvé." });

            _context.ArticlesVariantes.Remove(entity);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
