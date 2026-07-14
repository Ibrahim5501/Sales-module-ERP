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
    [Authorize]
    public class ProduitsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public ProduitsController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ProduitDto>>> Get()
        {
            var produits = await _context.Produits
                .Include(p => p.Categorie)
                .OrderBy(p => p.Code)
                .ToListAsync();
            var dtos = produits.Select(p => new ProduitDto
            {
                Id_Produit = p.Id_Produit,
                Code = p.Code,
                Designation = p.Designation,
                Id_Categorie = p.Id_Categorie,
                NomCategorie = p.Categorie != null ? p.Categorie.Nom : null,
                Unite = p.Unite,
                PrixUniversitaire = p.PrixUniversitaire,
                QuantiteStock = p.QuantiteStock,
                TauxTVA = p.TauxTVA,
                Actif = p.Actif
            });
            return Ok(dtos);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ProduitDto>> GetById(int id)
        {
            var prod = await _context.Produits
                .Include(p => p.Categorie)
                .FirstOrDefaultAsync(p => p.Id_Produit == id);
            if (prod == null) return NotFound(new { message = "Produit non trouvé." });

            var dto = new ProduitDto
            {
                Id_Produit = prod.Id_Produit,
                Code = prod.Code,
                Designation = prod.Designation,
                Id_Categorie = prod.Id_Categorie,
                NomCategorie = prod.Categorie != null ? prod.Categorie.Nom : null,
                Unite = prod.Unite,
                PrixUniversitaire = prod.PrixUniversitaire,
                QuantiteStock = prod.QuantiteStock,
                TauxTVA = prod.TauxTVA,
                Actif = prod.Actif
            };
            return Ok(dto);
        }

        [HttpPost]
        public async Task<ActionResult<ProduitDto>> Create(ProduitCreateDto produitDto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var produit = new Produit
            {
                Code = produitDto.Code,
                Designation = produitDto.Designation,
                Id_Categorie = produitDto.Id_Categorie,
                Unite = produitDto.Unite,
                PrixUniversitaire = produitDto.PrixUniversitaire,
                QuantiteStock = produitDto.QuantiteStock,
                Actif = produitDto.Actif
            };

            _context.Produits.Add(produit);
            await _context.SaveChangesAsync();

            var createdDto = new ProduitDto
            {
                Id_Produit = produit.Id_Produit,
                Code = produit.Code,
                Designation = produit.Designation,
                Id_Categorie = produit.Id_Categorie,
                Unite = produit.Unite,
                PrixUniversitaire = produit.PrixUniversitaire,
                QuantiteStock = produit.QuantiteStock,
                Actif = produit.Actif
            };

            return CreatedAtAction(nameof(GetById), new { id = produit.Id_Produit }, createdDto);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<ProduitDto>> Update(int id, ProduitUpdateDto produitDto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var existing = await _context.Produits.FirstOrDefaultAsync(p => p.Id_Produit == id);
            if (existing == null) return NotFound(new { message = "Produit non trouvé." });

            existing.Code = produitDto.Code;
            existing.Designation = produitDto.Designation;
            existing.Id_Categorie = produitDto.Id_Categorie;
            existing.Unite = produitDto.Unite;
            existing.PrixUniversitaire = produitDto.PrixUniversitaire;
            existing.QuantiteStock = produitDto.QuantiteStock;
            existing.Actif = produitDto.Actif;

            await _context.SaveChangesAsync();

            var updatedDto = new ProduitDto
            {
                Id_Produit = existing.Id_Produit,
                Code = existing.Code,
                Designation = existing.Designation,
                Id_Categorie = existing.Id_Categorie,
                Unite = existing.Unite,
                PrixUniversitaire = existing.PrixUniversitaire,
                QuantiteStock = existing.QuantiteStock,
                Actif = existing.Actif
            };

            return Ok(updatedDto);
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> Delete(int id)
        {
            var existing = await _context.Produits.FirstOrDefaultAsync(p => p.Id_Produit == id);
            if (existing == null) return NotFound(new { message = "Produit non trouvé." });

            _context.Produits.Remove(existing);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
