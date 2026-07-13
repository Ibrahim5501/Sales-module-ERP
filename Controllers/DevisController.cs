using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using example2.Data;
using example2.Models;
using example2.DTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace example2.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DevisController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public DevisController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/Devis
        [HttpGet]
        public async Task<ActionResult<IEnumerable<DevisDto>>> Get()
        {
            var list = await _context.Devis
                .Include(d => d.Lignes)
                .OrderByDescending(d => d.DateDevis)
                .ToListAsync();
            return Ok(list.Select(MapToDto));
        }

        // GET: api/Devis/5
        [HttpGet("{id}")]
        public async Task<ActionResult<DevisDto>> GetById(int id)
        {
            var devis = await _context.Devis
                .Include(d => d.Lignes)
                .FirstOrDefaultAsync(d => d.Id_Devis == id);

            if (devis == null)
                return NotFound(new { message = "Devis non trouvé." });

            return Ok(MapToDto(devis));
        }

        // POST: api/Devis
        [HttpPost]
        public async Task<ActionResult<DevisDto>> Create(DevisCreateDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var now = DateTime.Now;

            var devis = new Devis
            {
                Id_Partenaire = dto.Id_Partenaire,
                DateDevis = now,
                DateValidite = now.AddDays(30),
                Statut = DevisStatut.Brouillon,
                Lignes = dto.Lignes.Select(l => new DevisLigne
                {
                    Description = l.Description,
                    Quantite = l.Quantite,
                    PrixUniversitaire = l.PrixUniversitaire,
                    TauxTVA = l.TauxTVA,
                    Remise = l.Remise,
                    Id_Produit = l.Id_Produit
                }).ToList()
            };

            decimal totalHT = 0;
            decimal totalTTC = 0;

            foreach (var ligne in devis.Lignes)
            {
                decimal remise = ligne.PrixUniversitaire * (ligne.Remise / 100m);
                ligne.MontantHT = (ligne.PrixUniversitaire - remise) * ligne.Quantite;
                ligne.MontantTTC = ligne.MontantHT * (1 + ligne.TauxTVA / 100m);
                totalHT += ligne.MontantHT;
                totalTTC += ligne.MontantTTC;
            }

            devis.MontantHT = totalHT;
            devis.MontantTTC = totalTTC;
            devis.MontantTVA = totalTTC - totalHT;

            int next = (_context.Devis.Max(d => (int?)d.Id_Devis) ?? 0) + 1;

            devis.NumeroDevis = $"DEV-{now.Year}-{next:D3}";

            _context.Devis.Add(devis);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = devis.Id_Devis }, MapToDto(devis));
        }

        // PUT: api/Devis/5
        [HttpPut("{id}")]
        public async Task<ActionResult<DevisDto>> Update(int id, DevisCreateDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var existing = await _context.Devis
                .Include(d => d.Lignes)
                .FirstOrDefaultAsync(d => d.Id_Devis == id);

            if (existing == null)
                return NotFound(new { message = "Devis non trouvé." });

            if (existing.Statut != DevisStatut.Brouillon)
                return BadRequest(new { message = "Seuls les devis en brouillon peuvent être modifiés." });

            existing.Id_Partenaire = dto.Id_Partenaire;

            _context.DevisLignes.RemoveRange(existing.Lignes);

            existing.Lignes = dto.Lignes.Select(l => new DevisLigne
            {
                Description = l.Description,
                Quantite = l.Quantite,
                PrixUniversitaire = l.PrixUniversitaire,
                TauxTVA = l.TauxTVA,
                Remise = l.Remise,
                Id_Produit = l.Id_Produit
            }).ToList();

            decimal totalHT = 0;
            decimal totalTTC = 0;

            foreach (var ligne in existing.Lignes)
            {
                decimal remise = ligne.PrixUniversitaire * (ligne.Remise / 100m);
                ligne.MontantHT = (ligne.PrixUniversitaire - remise) * ligne.Quantite;
                ligne.MontantTTC = ligne.MontantHT * (1 + ligne.TauxTVA / 100m);
                totalHT += ligne.MontantHT;
                totalTTC += ligne.MontantTTC;
            }

            existing.MontantHT = totalHT;
            existing.MontantTTC = totalTTC;
            existing.MontantTVA = totalTTC - totalHT;

            await _context.SaveChangesAsync();

            return Ok(MapToDto(existing));
        }

        // DELETE: api/Devis/5
        [HttpDelete("{id}")]
        public async Task<ActionResult> Delete(int id)
        {
            var devis = await _context.Devis
                .Include(d => d.Lignes)
                .FirstOrDefaultAsync(d => d.Id_Devis == id);

            if (devis == null)
                return NotFound(new { message = "Devis non trouvé." });

            if (devis.Statut != DevisStatut.Brouillon)
                return BadRequest(new { message = "Seuls les devis en brouillon peuvent être supprimés." });

            _context.DevisLignes.RemoveRange(devis.Lignes);
            _context.Devis.Remove(devis);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Devis supprimé." });
        }

        // POST: api/Devis/5/valider
        [HttpPost("{id}/valider")]
        public async Task<ActionResult<DevisDto>> Valider(int id)
        {
            var devis = await _context.Devis
                .Include(d => d.Lignes)
                .FirstOrDefaultAsync(d => d.Id_Devis == id);

            if (devis == null)
                return NotFound(new { message = "Devis non trouvé." });

            if (devis.Statut != DevisStatut.Brouillon)
                return BadRequest(new { message = "Seuls les devis en brouillon peuvent être validés." });

            devis.Statut = DevisStatut.Envoye;
            await _context.SaveChangesAsync();

            return Ok(MapToDto(devis));
        }

        // POST: api/Devis/5/annuler
        [HttpPost("{id}/annuler")]
        public async Task<ActionResult<DevisDto>> Annuler(int id)
        {
            var devis = await _context.Devis
                .Include(d => d.Lignes)
                .FirstOrDefaultAsync(d => d.Id_Devis == id);

            if (devis == null)
                return NotFound(new { message = "Devis non trouvé." });

            if (devis.Statut == DevisStatut.Accepte)
                return BadRequest(new { message = "Impossible d'annuler un devis accepté." });

            devis.Statut = DevisStatut.Refuse;
            await _context.SaveChangesAsync();

            return Ok(MapToDto(devis));
        }

        // POST: api/Devis/5/accepter
        [HttpPost("{id}/accepter")]
        public async Task<ActionResult<CommandeDto>> Accepter(int id)
        {
            var devis = await _context.Devis
                .Include(d => d.Lignes)
                .FirstOrDefaultAsync(d => d.Id_Devis == id);

            if (devis == null)
                return NotFound(new { message = "Devis non trouvé." });

            if (devis.Statut != DevisStatut.Envoye)
                return BadRequest(new { message = "Le devis doit être envoyé/validé avant d'être accepté." });

            devis.Statut = DevisStatut.Accepte;

            var commande = new Commande
            {
                NumeroCommande = "",
                Id_Partenaire = devis.Id_Partenaire,
                Id_Devis = devis.Id_Devis,
                DateCommande = DateTime.Now,
                Statut = CommandeStatut.EnAttente,
                MontantHT = devis.MontantHT,
                MontantTTC = devis.MontantTTC,
                Lignes = devis.Lignes.Select(l => new CommandeLigne
                {
                    Description = l.Description,
                    Id_Produit = l.Id_Produit,
                    Quantite = l.Quantite,
                    PrixUniversitaire = l.PrixUniversitaire,
                    Remise = l.Remise,
                    TauxTVA = l.TauxTVA,
                    MontantHT = l.MontantHT,
                    MontantTTC = l.MontantTTC
                }).ToList()
            };

            _context.Commandes.Add(commande);
            await _context.SaveChangesAsync();

            commande.NumeroCommande = $"CMD-2026-{commande.Id_Commande:D3}";
            await _context.SaveChangesAsync();

            return Ok(new CommandeDto
            {
                Id_Commande = commande.Id_Commande,
                Id_Partenaire = commande.Id_Partenaire,
                Id_Devis = commande.Id_Devis,
                NumeroCommande = commande.NumeroCommande,
                DateCommande = commande.DateCommande,
                MontantHT = commande.MontantHT,
                MontantTTC = commande.MontantTTC,
                Statut = commande.Statut,
                Lignes = commande.Lignes.Select(l => new CommandeLigneDto
                {
                    Id_CommandeLigne = l.Id_CommandeLigne,
                    Description = l.Description,
                    Quantite = l.Quantite,
                    PrixUniversitaire = l.PrixUniversitaire,
                    TauxTVA = l.TauxTVA,
                    Remise = l.Remise,
                    MontantHT = l.MontantHT,
                    MontantTTC = l.MontantTTC,
                    Id_Produit = l.Id_Produit
                }).ToList()
            });
        }

        private static DevisDto MapToDto(Devis d)
        {
            return new DevisDto
            {
                Id_Devis = d.Id_Devis,
                NumeroDevis = d.NumeroDevis,
                Id_Partenaire = d.Id_Partenaire,
                DateDevis = d.DateDevis,
                DateValidite = d.DateValidite,
                Statut = d.Statut,
                MontantHT = d.MontantHT,
                MontantTTC = d.MontantTTC,
                MontantTVA = d.MontantTVA,
                Lignes = d.Lignes.Select(l => new DevisLigneDto
                {
                    Id_DevisLigne = l.Id_DevisLigne,
                    Description = l.Description,
                    Quantite = l.Quantite,
                    PrixUniversitaire = l.PrixUniversitaire,
                    TauxTVA = l.TauxTVA,
                    Remise = l.Remise,
                    MontantHT = l.MontantHT,
                    MontantTTC = l.MontantTTC,
                    Id_Produit = l.Id_Produit
                }).ToList()
            };
        }
    }
}