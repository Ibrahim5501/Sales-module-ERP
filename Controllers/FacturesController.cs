using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using example2.Data;
using example2.Models;
using example2.DTOs;
using example2.Services;
using Microsoft.AspNetCore.Hosting;
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
        private readonly IPdfService _pdfService;
        private readonly IWebHostEnvironment _env;

        public FacturesController(ApplicationDbContext context, IPdfService pdfService, IWebHostEnvironment env)
        {
            _context = context;
            _pdfService = pdfService;
            _env = env;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<FactureDto>>> Get()
        {
            var factures = await _context.Factures
                .Include(f => f.Partenaire)
                .Include(f => f.Devis)
                    .ThenInclude(d => d.Lignes)
                        .ThenInclude(l => l.Produit)
                .OrderByDescending(f => f.DateFacture)
                .ToListAsync();
            return Ok(factures.Select(MapToDto));
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<FactureDto>> GetById(int id)
        {
            var fact = await _context.Factures
                .Include(f => f.Partenaire)
                .Include(f => f.Devis)
                    .ThenInclude(d => d.Lignes)
                        .ThenInclude(l => l.Produit)
                .FirstOrDefaultAsync(f => f.Id_Facture == id);
            if (fact == null) return NotFound(new { message = "Facture non trouvée." });
            return Ok(MapToDto(fact));
        }

        [HttpGet("{id}/pdf")]
        [AllowAnonymous]
        public async Task<ActionResult> GetPdf(int id)
        {
            var fact = await _context.Factures
                .Include(f => f.Partenaire)
                .Include(f => f.Devis)
                    .ThenInclude(d => d.Lignes)
                        .ThenInclude(l => l.Produit)
                .FirstOrDefaultAsync(f => f.Id_Facture == id);

            if (fact == null) return NotFound(new { message = "Facture non trouvée." });

            byte[] pdfBytes = _pdfService.GenerateFacturePdf(fact);
            var fileName = $"Facture_{fact.NumeroFacture ?? fact.Id_Facture.ToString()}.pdf";
            return File(pdfBytes, "application/pdf", fileName);
        }

        [HttpPost("{id}/annuler")]
        public async Task<ActionResult<FactureDto>> Annuler(int id)
        {
            var fact = await _context.Factures
                .Include(f => f.Partenaire)
                .Include(f => f.Devis)
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
                .Include(f => f.Devis)
                    .ThenInclude(d => d.Lignes)
                        .ThenInclude(l => l.Produit)
                .FirstOrDefaultAsync(f => f.Id_Facture == id);
            if (fact == null || fact.Statut == FactureStatut.Payee || fact.Statut == FactureStatut.Annulee)
                return BadRequest(new { message = "Règlement impossible. La facture n'existe pas ou est déjà payée/annulée." });

            decimal restant = fact.MontantRestant;
            decimal paiementEfficace = Math.Min(request.Montant, restant);

            fact.MontantPaye += paiementEfficace;
            fact.Statut = fact.MontantRestant == 0 ? FactureStatut.Payee : FactureStatut.NonPayee;

            await _context.SaveChangesAsync();
            return Ok(MapToDto(fact));
        }

        private static FactureDto MapToDto(Facture f)
        {
            return new FactureDto
            {
                Id_Facture    = f.Id_Facture,
                NumeroFacture = f.NumeroFacture,
                Id_Devis      = f.Id_Devis,
                NumeroDevis   = f.Devis?.NumeroDevis,
                Id_Partenaire = f.Id_Partenaire,
                NomPartenaire = f.Partenaire != null
                    ? $"{f.Partenaire.Nom} ({f.Partenaire.Entreprise})"
                    : $"Partenaire #{f.Id_Partenaire}",
                DateFacture   = f.DateFacture,
                DateEcheance  = f.DateEcheance,
                MontantHT     = f.MontantHT,
                MontantTVA    = f.MontantTVA,
                MontantTotal  = f.MontantTotal,
                MontantPaye   = f.MontantPaye,
                MontantRestant = f.MontantRestant,
                Statut        = f.Statut,
                Lignes        = f.Devis?.Lignes?.Select(l => new DevisLigneDto
                {
                    Id_DevisLigne     = l.Id_DevisLigne,
                    Description       = l.Description,
                    Quantite          = l.Quantite,
                    DureeSecondes     = l.DureeSecondes,
                    PrixUniversitaire = l.PrixUniversitaire,
                    TauxTVA           = l.TauxTVA,
                    Remise            = l.Remise,
                    TypeRemise        = l.TypeRemise,
                    MontantHT         = l.MontantHT,
                    MontantTTC        = l.MontantTTC,
                    Id_Produit        = l.Id_Produit,
                    Designation       = l.Produit?.Designation ?? "Produit",
                    Emission          = l.Emission
                }).ToList() ?? new List<DevisLigneDto>()
            };
        }
    }

    public class PayRequest
    {
        public decimal Montant { get; set; }
    }
}
