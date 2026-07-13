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
    public class CommandesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public CommandesController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<CommandeDto>>> Get()
        {
            var list = await _context.Commandes.Include(c => c.Lignes).OrderByDescending(c => c.DateCommande).ToListAsync();
            return Ok(list.Select(MapToDto));
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<CommandeDto>> GetById(int id)
        {
            var cmd = await _context.Commandes.Include(c => c.Lignes).FirstOrDefaultAsync(c => c.Id_Commande == id);
            if (cmd == null) return NotFound(new { message = "Commande non trouvée." });
            return Ok(MapToDto(cmd));
        }

        [HttpPost]
        public async Task<ActionResult<CommandeDto>> Create(CommandeCreateDto commandeDto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var now = DateTime.Now;

            var commande = new Commande
            {
                Id_Partenaire = commandeDto.Id_Partenaire,
                Id_Devis = commandeDto.Id_Devis,
                DateCommande = now,
                Statut = CommandeStatut.EnAttente,
                Lignes = commandeDto.Lignes.Select(l => new CommandeLigne
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

            foreach (var ligne in commande.Lignes)
            {
                decimal remiseMontant = ligne.PrixUniversitaire * (ligne.Remise / 100m);
                ligne.MontantHT = (ligne.PrixUniversitaire - remiseMontant) * ligne.Quantite;
                ligne.MontantTTC = ligne.MontantHT * (1 + (ligne.TauxTVA / 100m));

                totalHT += ligne.MontantHT;
                totalTTC += ligne.MontantTTC;
            }

            commande.MontantHT = totalHT;
            commande.MontantTTC = totalTTC;

            int next = (_context.Commandes.Max(d => (int?)d.Id_Commande) ?? 0) + 1;

            commande.NumeroCommande = $"CMD-{now.Year}-{next:D3}";

            _context.Commandes.Add(commande);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = commande.Id_Commande }, MapToDto(commande));
        }

        [HttpPost("{id}/valider")]
        public async Task<ActionResult<CommandeDto>> Valider(long id)
        {
            var cmd = await _context.Commandes.Include(c => c.Lignes).FirstOrDefaultAsync(c => c.Id_Commande == id);
            if (cmd == null || cmd.Statut != CommandeStatut.EnAttente)
                return BadRequest(new { message = "Impossible de valider la commande. Soit elle n'existe pas, soit elle n'est plus en statut EnAttente." });

            foreach (var ligne in cmd.Lignes)
            {
                var produit = ligne.Produit;

                if (produit == null)
                    continue;

                produit.QuantiteStock = Math.Max(
                    0,
                    produit.QuantiteStock - (int)ligne.Quantite);
            }

            cmd.Statut = CommandeStatut.Validee;
            await _context.SaveChangesAsync();
            return Ok(MapToDto(cmd));
        }

        [HttpPost("{id}/annuler")]
        public async Task<ActionResult<CommandeDto>> Annuler(long id)
        {
            var cmd = await _context.Commandes.Include(c => c.Lignes).FirstOrDefaultAsync(c => c.Id_Commande == id);
            if (cmd == null || cmd.Statut == CommandeStatut.Facutree || cmd.Statut == CommandeStatut.Cloturee || cmd.Statut == CommandeStatut.Annulee)
                return BadRequest(new { message = "Impossible d'annuler la commande. Les commandes facturées ou déjà annulées ne peuvent être modifiées." });

            if (cmd.Statut == CommandeStatut.Validee)
            {
                foreach (var ligne in cmd.Lignes)
                {
                    var produit = ligne.Produit;

                    if (produit == null)
                        continue;

                    produit.QuantiteStock = Math.Max(
                        0,
                        produit.QuantiteStock - (int)ligne.Quantite);
                }
            }

            cmd.Statut = CommandeStatut.Annulee;
            await _context.SaveChangesAsync();
            return Ok(MapToDto(cmd));
        }

        [HttpPost("{id}/facturer")]
        public async Task<ActionResult<FactureDto>> Facturer(long id)
        {
            var now = DateTime.Now;

            var cmd = await _context.Commandes.Include(c => c.Lignes).FirstOrDefaultAsync(c => c.Id_Commande == id);
            if (cmd == null || cmd.Statut != CommandeStatut.Validee)
                return BadRequest(new { message = "Impossible de générer la facture. La commande doit d'abord être validée et ne pas être déjà facturée." });

            cmd.Statut = CommandeStatut.Facutree;

            var client = await _context.Partenaires.FirstOrDefaultAsync(p => p.Id_Partenaire == cmd.Id_Partenaire);
            string nomClient = client != null ? $"{client.Nom} ({client.Entreprise})" : $"Partenaire #{cmd.Id_Partenaire}";

            var fact = new Facture
            {
                Id_Commande = cmd.Id_Commande,
                Id_Partenaire = cmd.Id_Partenaire,
                DateFacture = cmd.DateCommande,
                DateEcheance = cmd.DateCommande.AddDays(30),
                MontantTotal = cmd.MontantTTC,
                MontantPaye = 0,
                Statut = FactureStatut.NonPayee,
            };

            int next = (_context.Factures.Max(d => (int?)d.Id_Facture) ?? 0) + 1;

            fact.NumeroFacture = $"FAC-{now.Year}-{next:D3}";

            _context.Factures.Add(fact);
            await _context.SaveChangesAsync();

            var factDto = new FactureDto
            {
                Id_Facture = fact.Id_Facture,
                NumeroFacture = fact.NumeroFacture,
                Id_Commande = fact.Id_Commande,
                Id_Partenaire = fact.Id_Partenaire,
                DateFacture = fact.DateFacture,
                DateEcheance = fact.DateEcheance,
                MontantTotal = fact.MontantTotal,
                MontantPaye = fact.MontantPaye,
                MontantRestant = fact.MontantTotal - fact.MontantPaye,
                Statut = fact.Statut
            };

            return Ok(factDto);
        }

        private static CommandeDto MapToDto(Commande c)
        {
            return new CommandeDto
            {
                Id_Commande = c.Id_Commande,
                Id_Partenaire = c.Id_Partenaire,
                Id_Devis = c.Id_Devis,
                NumeroCommande = c.NumeroCommande,
                DateCommande = c.DateCommande,
                MontantHT = c.MontantHT,
                MontantTTC = c.MontantTTC,
                Statut = c.Statut,
                Lignes = c.Lignes.Select(l => new CommandeLigneDto
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
            };
        }
    }
}
