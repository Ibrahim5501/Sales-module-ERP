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
    public class DevisController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IPdfService _pdfService;
        private readonly IEmailService _emailService;
        private readonly IWebHostEnvironment _env;

        public DevisController(ApplicationDbContext context, IPdfService pdfService, IEmailService emailService, IWebHostEnvironment env)
        {
            _context = context;
            _pdfService = pdfService;
            _emailService = emailService;
            _env = env;
        }

        // GET: api/Devis
        [HttpGet]
        public async Task<ActionResult<IEnumerable<DevisDto>>> Get()
        {
            var list = await _context.Devis
                .Include(d => d.Lignes)
                    .ThenInclude(l => l.Produit)
                .Include(d => d.Partenaire)
                .Include(d => d.User)
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
                    .ThenInclude(l => l.Produit)
                .Include(d => d.Partenaire)
                .Include(d => d.User)
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

            // Extract creator user from token
            int? currentUserId = null;
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (int.TryParse(userIdClaim, out int uid))
            {
                currentUserId = uid;
            }
            else
            {
                var userEmail = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;
                if (!string.IsNullOrEmpty(userEmail))
                {
                    var u = await _context.Users.FirstOrDefaultAsync(x => x.Email == userEmail);
                    if (u != null) currentUserId = u.Id;
                }
            }

            var devis = new Devis
            {
                Id_Partenaire = dto.Id_Partenaire,
                AdresseFacturation = dto.AdresseFacturation,
                AdresseLivraison = dto.AdresseLivraison,
                ModePaiement = dto.ModePaiement ?? "Virement Bancaire",
                RemiseGlobale = dto.RemiseGlobale,
                TypeRemiseGlobale = string.IsNullOrEmpty(dto.TypeRemiseGlobale) ? "Pourcentage" : dto.TypeRemiseGlobale,
                Id_User = currentUserId,
                DateDevis = now,
                DateValidite = dto.DateValidite,
                Statut = DevisStatut.Brouillon,
                Lignes = dto.Lignes.Select(l => new DevisLigne
                {
                    Description = l.Description,
                    Quantite = l.Quantite,
                    PrixUniversitaire = l.PrixUniversitaire,
                    TauxTVA = l.TauxTVA,
                    Remise = l.Remise,
                    TypeRemise = string.IsNullOrEmpty(l.TypeRemise) ? "Pourcentage" : l.TypeRemise,
                    Id_Produit = l.Id_Produit
                }).ToList()
            };

            CalculateDevisTotals(devis);

            int next = (_context.Devis.Max(d => (int?)d.Id_Devis) ?? 0) + 1;
            devis.NumeroDevis = $"DEV-{now.Year}-{next:D3}";

            _context.Devis.Add(devis);
            await _context.SaveChangesAsync();

            devis = await _context.Devis
                .Include(d => d.Partenaire)
                .Include(d => d.User)
                .Include(d => d.Lignes)
                    .ThenInclude(l => l.Produit)
                .FirstAsync(d => d.Id_Devis == devis.Id_Devis);

            return CreatedAtAction(nameof(GetById), new { id = devis.Id_Devis }, MapToDto(devis));
        }

        // PUT: api/Devis/5
        [HttpPut("{id}")]
        public async Task<ActionResult<DevisDto>> Update(int id, DevisCreateDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var existing = await _context.Devis
                .Include(d => d.Lignes)
                    .ThenInclude(l => l.Produit)
                .Include(d => d.User)
                .FirstOrDefaultAsync(d => d.Id_Devis == id);

            if (existing == null)
                return NotFound(new { message = "Devis non trouvé." });

            if (existing.Statut != DevisStatut.Brouillon)
                return BadRequest(new { message = "Seuls les devis en brouillon peuvent être modifiés." });

            existing.Id_Partenaire = dto.Id_Partenaire;
            existing.AdresseFacturation = dto.AdresseFacturation;
            existing.AdresseLivraison = dto.AdresseLivraison;
            existing.DateValidite = dto.DateValidite;
            existing.ModePaiement = dto.ModePaiement ?? existing.ModePaiement;
            existing.RemiseGlobale = dto.RemiseGlobale;
            existing.TypeRemiseGlobale = string.IsNullOrEmpty(dto.TypeRemiseGlobale) ? "Pourcentage" : dto.TypeRemiseGlobale;

            _context.DevisLignes.RemoveRange(existing.Lignes);

            existing.Lignes = dto.Lignes.Select(l => new DevisLigne
            {
                Description = l.Description,
                Quantite = l.Quantite,
                PrixUniversitaire = l.PrixUniversitaire,
                TauxTVA = l.TauxTVA,
                Remise = l.Remise,
                TypeRemise = string.IsNullOrEmpty(l.TypeRemise) ? "Pourcentage" : l.TypeRemise,
                Id_Produit = l.Id_Produit
            }).ToList();

            CalculateDevisTotals(existing);

            await _context.SaveChangesAsync();
            existing.Partenaire = await _context.Partenaires.FirstOrDefaultAsync(p => p.Id_Partenaire == existing.Id_Partenaire);

            return Ok(MapToDto(existing));
        }

        // DELETE: api/Devis/5
        [HttpDelete("{id}")]
        public async Task<ActionResult> Delete(int id)
        {
            var devis = await _context.Devis
                .Include(d => d.Lignes)
                    .ThenInclude(l => l.Produit)
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
                    .ThenInclude(l => l.Produit)
                .Include(d => d.Partenaire)
                .FirstOrDefaultAsync(d => d.Id_Devis == id);

            if (devis == null)
                return NotFound(new { message = "Devis non trouvé." });

            if (devis.Statut != DevisStatut.Brouillon)
                return BadRequest(new { message = "Seuls les devis en brouillon peuvent être validés." });

            devis.Statut = DevisStatut.Envoye;
            await _context.SaveChangesAsync();

            // Generate PDF file & save to disk
            byte[] pdfBytes = _pdfService.GenerateDevisPdf(devis);
            _pdfService.SaveDevisPdf(devis, _env.WebRootPath);

            // Send email to client if email exists
            if (devis.Partenaire != null && !string.IsNullOrWhiteSpace(devis.Partenaire.Email))
            {
                await _emailService.SendDevisEmailAsync(devis.Partenaire.Email, devis.Partenaire.Nom, devis, pdfBytes);
            }

            return Ok(MapToDto(devis));
        }

        // POST: api/Devis/5/envoyer
        [HttpPost("{id}/envoyer")]
        public async Task<ActionResult> Envoyer(int id)
        {
            var devis = await _context.Devis
                .Include(d => d.Lignes)
                    .ThenInclude(l => l.Produit)
                .Include(d => d.Partenaire)
                .FirstOrDefaultAsync(d => d.Id_Devis == id);

            if (devis == null)
                return NotFound(new { message = "Devis non trouvé." });

            if (devis.Statut == DevisStatut.Brouillon)
            {
                devis.Statut = DevisStatut.Envoye;
                await _context.SaveChangesAsync();
            }

            // Generate PDF file & save to disk
            byte[] pdfBytes = _pdfService.GenerateDevisPdf(devis);
            string pdfUrl = _pdfService.SaveDevisPdf(devis, _env.WebRootPath);

            // Send email to client
            string emailClient = devis.Partenaire?.Email ?? "";
            string nomClient = devis.Partenaire?.Nom ?? "Client";

            var emailResult = await _emailService.SendDevisEmailAsync(emailClient, nomClient, devis, pdfBytes);

            return Ok(new
            {
                message = emailResult.Message,
                pdfUrl = pdfUrl,
                devis = MapToDto(devis)
            });
        }

        // GET: api/Devis/5/pdf
        [HttpGet("{id}/pdf")]
        [AllowAnonymous]
        public async Task<ActionResult> GetPdf(int id)
        {
            var devis = await _context.Devis
                .Include(d => d.Lignes)
                    .ThenInclude(l => l.Produit)
                .Include(d => d.Partenaire)
                .FirstOrDefaultAsync(d => d.Id_Devis == id);

            if (devis == null)
                return NotFound(new { message = "Devis non trouvé." });

            byte[] pdfBytes = _pdfService.GenerateDevisPdf(devis);
            var fileName = $"Devis_{devis.NumeroDevis ?? devis.Id_Devis.ToString()}.pdf";
            return File(pdfBytes, "application/pdf", fileName);
        }

        // POST: api/Devis/5/annuler
        [HttpPost("{id}/annuler")]
        public async Task<ActionResult<DevisDto>> Annuler(int id)
        {
            var devis = await _context.Devis
                .Include(d => d.Lignes)
                    .ThenInclude(l => l.Produit)
                .Include(d => d.Partenaire)
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
                    .ThenInclude(l => l.Produit)
                .Include(d => d.Partenaire)
                .FirstOrDefaultAsync(d => d.Id_Devis == id);

            if (devis == null)
                return NotFound(new { message = "Devis non trouvé." });

            if (devis.Statut != DevisStatut.Envoye && devis.Statut != DevisStatut.Brouillon)
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
                MontantTVA = devis.MontantTVA,
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

            var client = devis.Partenaire ?? await _context.Partenaires.FirstOrDefaultAsync(p => p.Id_Partenaire == commande.Id_Partenaire);

            // Generate PDFs for Devis and Commande
            _pdfService.SaveDevisPdf(devis, _env.WebRootPath);
            commande.Partenaire = client;
            commande.Devis = devis;
            _pdfService.SaveCommandePdf(commande, _env.WebRootPath);

            return Ok(new CommandeDto
            {
                Id_Commande = commande.Id_Commande,
                Id_Partenaire = commande.Id_Partenaire,
                NomPartenaire = client != null ? $"{client.Nom} ({client.Entreprise})" : $"Partenaire #{commande.Id_Partenaire}",
                Id_Devis = commande.Id_Devis,
                NumeroDevis = devis.NumeroDevis,
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

        private static void CalculateDevisTotals(Devis devis)
        {
            decimal subtotalHT = 0;
            decimal totalTVA = 0;

            foreach (var ligne in devis.Lignes)
            {
                decimal montantRemiseLigne = 0;
                if (ligne.TypeRemise == "MontantFixe")
                {
                    montantRemiseLigne = ligne.Remise;
                }
                else
                {
                    montantRemiseLigne = (ligne.PrixUniversitaire * ligne.Quantite) * (ligne.Remise / 100m);
                }

                ligne.MontantHT = (ligne.PrixUniversitaire * ligne.Quantite) - montantRemiseLigne;
                if (ligne.MontantHT < 0) ligne.MontantHT = 0;

                decimal tvaLigne = ligne.MontantHT * (ligne.TauxTVA / 100m);
                ligne.MontantTTC = ligne.MontantHT + tvaLigne;

                subtotalHT += ligne.MontantHT;
                totalTVA += tvaLigne;
            }

            decimal remiseGlobaleMontant = 0;
            if (devis.TypeRemiseGlobale == "MontantFixe")
            {
                remiseGlobaleMontant = devis.RemiseGlobale;
            }
            else
            {
                remiseGlobaleMontant = subtotalHT * (devis.RemiseGlobale / 100m);
            }

            devis.MontantHT = subtotalHT - remiseGlobaleMontant;
            if (devis.MontantHT < 0) devis.MontantHT = 0;

            decimal ratio = subtotalHT > 0 ? (devis.MontantHT / subtotalHT) : 1m;
            devis.MontantTVA = totalTVA * ratio;
            devis.MontantTTC = devis.MontantHT + devis.MontantTVA;
        }

        private static DevisDto MapToDto(Devis d)
        {
            return new DevisDto
            {
                Id_Devis = d.Id_Devis,
                NumeroDevis = d.NumeroDevis,
                Id_Partenaire = d.Id_Partenaire,
                NomPartenaire = d.Partenaire != null ? $"{d.Partenaire.Nom} ({d.Partenaire.Entreprise})" : $"Partenaire #{d.Id_Partenaire}",
                AdresseFacturation = d.AdresseFacturation,
                AdresseLivraison = d.AdresseLivraison,
                ModePaiement = d.ModePaiement ?? "Virement Bancaire",
                RemiseGlobale = d.RemiseGlobale,
                TypeRemiseGlobale = string.IsNullOrEmpty(d.TypeRemiseGlobale) ? "Pourcentage" : d.TypeRemiseGlobale,
                DateDevis = d.DateDevis,
                DateValidite = d.DateValidite,
                Statut = d.Statut,
                MontantHT = d.MontantHT,
                MontantTTC = d.MontantTTC,
                MontantTVA = d.MontantTVA,
                Id_User = d.Id_User,
                CreatedByEmail = d.User?.Email ?? "N/A",
                Lignes = d.Lignes.Select(l => new DevisLigneDto
                {
                    Id_DevisLigne = l.Id_DevisLigne,
                    Description = l.Description,
                    Quantite = l.Quantite,
                    PrixUniversitaire = l.PrixUniversitaire,
                    TauxTVA = l.TauxTVA,
                    Remise = l.Remise,
                    TypeRemise = string.IsNullOrEmpty(l.TypeRemise) ? "Pourcentage" : l.TypeRemise,
                    MontantHT = l.MontantHT,
                    MontantTTC = l.MontantTTC,
                    Id_Produit = l.Id_Produit,
                    Designation = l.Produit?.Designation ?? "Produit",
                }).ToList()
            };
        }
    }
}