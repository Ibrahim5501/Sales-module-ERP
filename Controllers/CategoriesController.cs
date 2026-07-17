using example2.Data;
using example2.DTOs;
using example2.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;

namespace example2.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class CategoriesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public CategoriesController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/Categories
        [HttpGet]
        public async Task<ActionResult<IEnumerable<CategorieDto>>> Get()
        {
            var categories = await _context.Categories
                .OrderBy(c => c.Id_Categorie)
                .Select(c => new CategorieDto
                {
                    Id_Categorie = c.Id_Categorie,
                    Nom = c.Nom,
                    Description = c.Description,
                    Actif = c.Actif
                })
                .ToListAsync();

            return Ok(categories);
        }

        // GET: api/Categories/5
        [HttpGet("{id}")]
        public async Task<ActionResult<CategorieDto>> GetById(long id)
        {
            var categorie = await _context.Categories
                .Where(c => c.Id_Categorie == id)
                .Select(c => new CategorieDto
                {
                    Id_Categorie = c.Id_Categorie,
                    Nom = c.Nom,
                    Description = c.Description,
                    Actif = c.Actif
                })
                .FirstOrDefaultAsync();

            if (categorie == null)
                return NotFound(new { message = "Catégorie non trouvée." });

            return Ok(categorie);
        }

        // POST: api/Categories
        [HttpPost]
        public async Task<ActionResult<CategorieDto>> Post([FromBody] CategorieCreateDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var categorie = new Categorie
            {
                Nom = dto.Nom,
                Description = dto.Description,
                Actif = true
            };

            _context.Categories.Add(categorie);
            await _context.SaveChangesAsync();

            var result = new CategorieDto
            {
                Id_Categorie = categorie.Id_Categorie,
                Nom = categorie.Nom,
                Description = categorie.Description,
                Actif = categorie.Actif
            };

            return CreatedAtAction(nameof(GetById),
                new { id = categorie.Id_Categorie },
                result);
        }

        // PUT: api/Categories/5
        [HttpPut("{id}")]
        public async Task<IActionResult> Put(long id, [FromBody] CategorieUpdateDto dto)
        {
            var categorie = await _context.Categories.FindAsync(id);

            if (categorie == null)
                return NotFound(new { message = "Catégorie non trouvée." });

            categorie.Nom = dto.Nom;
            categorie.Description = dto.Description;
            categorie.Actif = dto.Actif;

            await _context.SaveChangesAsync();

            return NoContent();
        }

        // DELETE: api/Categories/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(long id)
        {
            var categorie = await _context.Categories.FindAsync(id);

            if (categorie == null)
                return NotFound(new { message = "Catégorie non trouvée." });

            _context.Categories.Remove(categorie);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}