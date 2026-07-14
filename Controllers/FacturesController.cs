using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using example2.Data;
using example2.Models;
using example2.DTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;

namespace example2.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class FacturesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public FacturesController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<FactureDto>>> Get()
        {
            var factures = await _context.Factures
                .Include(f => f.Partenaire)
                .Include(f => f.Commande)
                .OrderByDescending(f => f.DateFacture)
                .ToListAsync();
            return Ok(factures.Select(MapToDto));
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<FactureDto>> GetById(int id)
        {
            var fact = await _context.Factures
                .Include(f => f.Partenaire)
                .Include(f => f.Commande)
                .FirstOrDefaultAsync(f => f.Id_Facture == id);
            if (fact == null) return NotFound(new { message = "Facture non trouvée." });
            return Ok(MapToDto(fact));
        }

        [HttpPost("{id}/annuler")]
        public async Task<ActionResult<FactureDto>> Annuler(int id)
        {
            var fact = await _context.Factures
                .Include(f => f.Partenaire)
                .Include(f => f.Commande)
                .FirstOrDefaultAsync(f => f.Id_Facture == id);
            if (fact == null || fact.Statut == FactureStatut.Annulee)
                return BadRequest(new { message = "Annulation impossible. La facture n'existe pas ou est déjà annulée." });
            fact.Statut = FactureStatut.Annulee;
            await _context.SaveChangesAsync();
            return Ok(MapToDto(fact));
        }

        [HttpPost("{id}/regler")]
        public async Task<ActionResult<FactureDto>> Regler(int id, [FromBody] PayRequest request)
        {
            if (request == null || request.Montant <= 0)
                return BadRequest(new { message = "Le montant du règlement doit être supérieur à 0." });

            var fact = await _context.Factures
                .Include(f => f.Partenaire)
                .Include(f => f.Commande)
                .FirstOrDefaultAsync(f => f.Id_Facture == id);
            if (fact == null || fact.Statut == FactureStatut.Payee || fact.Statut == FactureStatut.Annulee)
                return BadRequest(new { message = "Règlement impossible. La facture n'existe pas ou est déjà payée/annulée." });

            decimal restant = fact.MontantRestant;
            decimal paiementEfficace = Math.Min(request.Montant, restant);

            fact.MontantPaye += paiementEfficace;

            if (fact.MontantRestant == 0)
            {
                fact.Statut = FactureStatut.Payee;

                if (fact.Id_Commande > 0)
                {
                    var cmd = await _context.Commandes.FirstOrDefaultAsync(c => c.Id_Commande == fact.Id_Commande);
                    if (cmd != null)
                    {
                        cmd.Statut = CommandeStatut.Cloturee;
                    }
                }
            }
            else
            {
                fact.Statut = FactureStatut.NonPayee;
            }

            await _context.SaveChangesAsync();
            return Ok(MapToDto(fact));
        }

        private static FactureDto MapToDto(Facture f)
        {
            return new FactureDto
            {
                Id_Facture = f.Id_Facture,
                NumeroFacture = f.NumeroFacture,
                Id_Commande = f.Id_Commande,
                NumeroCommande = f.Commande != null ? f.Commande.NumeroCommande : null,
                Id_Partenaire = f.Id_Partenaire,
                NomPartenaire = f.Partenaire != null ? $"{f.Partenaire.Nom} ({f.Partenaire.Entreprise})" : $"Partenaire #{f.Id_Partenaire}",
                DateFacture = f.DateFacture,
                DateEcheance = f.DateEcheance,
                MontantTotal = f.MontantTotal,
                MontantPaye = f.MontantPaye,
                MontantRestant = f.MontantRestant,
                Statut = f.Statut
            };
        }
    }

    public class PayRequest
    {
        public decimal Montant { get; set; }
    }
}
