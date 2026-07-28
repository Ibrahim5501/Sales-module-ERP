using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using example2.Data;
using example2.Models;
using example2.DTOs;
using example2.Services;
using Microsoft.AspNetCore.Authorization;

namespace example2.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class LivraisonsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IPdfService _pdfService;
        private readonly IWebHostEnvironment _env;

        public LivraisonsController(ApplicationDbContext context, IPdfService pdfService, IWebHostEnvironment env)
        {
            _context = context;
            _pdfService = pdfService;
            _env = env;
        }

        // GET /api/livraisons
        [HttpGet]
        public async Task<ActionResult<IEnumerable<LivraisonDto>>> Get()
        {
            var list = await _context.Livraisons
                .Include(l => l.Lignes)
                    .ThenInclude(ll => ll.Produit)
                .Include(l => l.Commande)
                    .ThenInclude(c => c!.Partenaire)
                .Include(l => l.Commande)
                    .ThenInclude(c => c!.Devis)
                .OrderByDescending(l => l.Id_Livraison)
                .ToListAsync();

            return Ok(list.Select(MapToDto));
        }

        // GET /api/livraisons/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<LivraisonDto>> GetById(int id)
        {
            var liv = await LoadLivraisonById(id);
            if (liv == null) return NotFound(new { message = "Livraison non trouvée." });
            return Ok(MapToDto(liv));
        }

        // GET /api/livraisons/commande/{commandeId}
        [HttpGet("commande/{commandeId}")]
        public async Task<ActionResult<IEnumerable<LivraisonDto>>> GetByCommande(int commandeId)
        {
            var list = await _context.Livraisons
                .Include(l => l.Lignes)
                    .ThenInclude(ll => ll.Produit)
                .Include(l => l.Commande)
                    .ThenInclude(c => c!.Partenaire)
                .Include(l => l.Commande)
                    .ThenInclude(c => c!.Devis)
                .Where(l => l.Id_Commande == commandeId)
                .ToListAsync();

            return Ok(list.Select(MapToDto));
        }

        // POST /api/livraisons — create manually
        [HttpPost]
        public async Task<ActionResult<LivraisonDto>> Create(LivraisonCreateDto dto)
        {
            var commande = await _context.Commandes
                .Include(c => c.Lignes)
                    .ThenInclude(l => l.Produit)
                .Include(c => c.Partenaire)
                .Include(c => c.Devis)
                .FirstOrDefaultAsync(c => c.Id_Commande == dto.Id_Commande);

            if (commande == null)
                return BadRequest(new { message = "Commande non trouvée." });

            if (commande.Statut == CommandeStatut.EnAttente)
                return BadRequest(new { message = "La commande doit d'abord être validée." });

            var livraison = CreateLivraisonFromCommande(commande, dto.Adresse, dto.DatePrevue, dto.DateEcheance);
            _context.Livraisons.Add(livraison);
            await _context.SaveChangesAsync();

            var created = await LoadLivraisonById(livraison.Id_Livraison);
            return CreatedAtAction(nameof(GetById), new { id = livraison.Id_Livraison }, MapToDto(created!));
        }

        // POST /api/livraisons/{id}/saisir-qte — operator inputs QteFait
        [HttpPost("{id}/saisir-qte")]
        public async Task<ActionResult<LivraisonDto>> SaisirQte(int id, SaisirQteFaitDto dto)
        {
            var liv = await LoadLivraisonById(id);
            if (liv == null) return NotFound(new { message = "Livraison non trouvée." });

            if (liv.Statut == LivraisonStatut.Livree || liv.Statut == LivraisonStatut.Annulee)
                return BadRequest(new { message = "Cette livraison est déjà clôturée ou annulée." });

            foreach (var ligneDto in dto.Lignes)
            {
                var ligne = liv.Lignes.FirstOrDefault(l => l.Id_LivraisonLigne == ligneDto.Id_LivraisonLigne);
                if (ligne == null) continue;

                if (ligneDto.QteFait < 0)
                    return BadRequest(new { message = $"La quantité livrée ne peut pas être négative pour le produit #{ligne.Id_Produit}." });
                if (ligneDto.QteFait > ligne.QteCommande)
                    return BadRequest(new { message = $"La quantité livrée ({ligneDto.QteFait}) dépasse la quantité commandée ({ligne.QteCommande})." });

                ligne.QteFait = ligneDto.QteFait;
            }

            liv.Statut = LivraisonStatut.EnCours;
            await _context.SaveChangesAsync();

            return Ok(MapToDto(liv));
        }

        // POST /api/livraisons/{id}/valider — validate, handle partial delivery
        [HttpPost("{id}/valider")]
        public async Task<ActionResult<object>> Valider(int id)
        {
            var liv = await LoadLivraisonById(id);
            if (liv == null) return NotFound(new { message = "Livraison non trouvée." });

            if (liv.Statut == LivraisonStatut.Livree || liv.Statut == LivraisonStatut.Annulee)
                return BadRequest(new { message = "Cette livraison est déjà clôturée ou annulée." });

            if (liv.Lignes.All(l => l.QteFait == 0))
                return BadRequest(new { message = "Veuillez saisir les quantités livrées avant de valider." });

            // Determine if full or partial
            bool isFullDelivery = liv.Lignes.All(l => l.QteFait >= l.QteCommande);
            bool isPartial      = !isFullDelivery && liv.Lignes.Any(l => l.QteFait > 0);

            if (!isPartial && !isFullDelivery)
                return BadRequest(new { message = "Aucune quantité n'a été livrée." });

            Livraison? secondLivraison = null;

            if (isFullDelivery)
            {
                liv.Statut = LivraisonStatut.Livree;
            }
            else
            {
                // Partial delivery
                liv.Statut = LivraisonStatut.Partielle;

                // Create second livraison for remaining quantities
                var commande = await _context.Commandes
                    .Include(c => c.Partenaire)
                    .Include(c => c.Devis)
                    .FirstOrDefaultAsync(c => c.Id_Commande == liv.Id_Commande);

                if (commande != null)
                {
                    var restantLignes = liv.Lignes
                        .Where(l => l.QteFait < l.QteCommande)
                        .ToList();

                    int nextId = (_context.Livraisons.Max(l => (int?)l.Id_Livraison) ?? 0) + 1;
                    var now = DateTime.Now;

                    secondLivraison = new Livraison
                    {
                        NumeroLivraison = $"LIV-{now.Year}-{nextId:D3}",
                        Adresse = liv.Adresse,
                        DatePrevue = now.AddDays(3),
                        DateEcheance = now.AddDays(10),
                        Statut = LivraisonStatut.EnAttente,
                        Id_Commande = liv.Id_Commande,
                        Lignes = restantLignes.Select(l => new LivraisonLigne
                        {
                            Id_Produit = l.Id_Produit,
                            QteCommande = l.QteCommande - l.QteFait,
                            QteReserve = l.QteCommande - l.QteFait,
                            QteFait = 0
                        }).ToList()
                    };

                    _context.Livraisons.Add(secondLivraison);
                }
            }

            await _context.SaveChangesAsync();

            // Generate and save the PDF
            var freshLiv = await LoadLivraisonById(id);
            _pdfService.SaveLivraisonPdf(freshLiv!, _env.WebRootPath);

            var result = new
            {
                livraison = MapToDto(freshLiv!),
                estPartielle = !isFullDelivery,
                secondeLivraison = secondLivraison != null ? new { secondLivraison.Id_Livraison, secondLivraison.NumeroLivraison } : null
            };

            return Ok(result);
        }

        // GET /api/livraisons/{id}/pdf
        [HttpGet("{id}/pdf")]
        [AllowAnonymous]
        public async Task<ActionResult> GetPdf(int id)
        {
            var liv = await LoadLivraisonById(id);
            if (liv == null) return NotFound(new { message = "Livraison non trouvée." });

            byte[] pdfBytes = _pdfService.GenerateLivraisonPdf(liv);
            var fileName = $"Livraison_{liv.NumeroLivraison ?? liv.Id_Livraison.ToString()}.pdf";
            return File(pdfBytes, "application/pdf", fileName);
        }

        // POST /api/livraisons/{id}/annuler
        [HttpPost("{id}/annuler")]
        public async Task<ActionResult<LivraisonDto>> Annuler(int id)
        {
            var liv = await _context.Livraisons
                .Include(l => l.Lignes)
                .FirstOrDefaultAsync(l => l.Id_Livraison == id);

            if (liv == null) return NotFound(new { message = "Livraison non trouvée." });

            if (liv.Statut == LivraisonStatut.Livree || liv.Statut == LivraisonStatut.Annulee)
                return BadRequest(new { message = "Impossible d'annuler une livraison déjà clôturée." });

            liv.Statut = LivraisonStatut.Annulee;
            await _context.SaveChangesAsync();

            var fresh = await LoadLivraisonById(id);
            return Ok(MapToDto(fresh!));
        }

        // ---- PRIVATE HELPERS ----

        private async Task<Livraison?> LoadLivraisonById(int id)
        {
            return await _context.Livraisons
                .Include(l => l.Lignes)
                    .ThenInclude(ll => ll.Produit)
                .Include(l => l.Commande)
                    .ThenInclude(c => c!.Partenaire)
                .Include(l => l.Commande)
                    .ThenInclude(c => c!.Devis)
                .FirstOrDefaultAsync(l => l.Id_Livraison == id);
        }

        /// <summary>Creates a Livraison entity from a Commande's lines.</summary>
        private static Livraison CreateLivraisonFromCommande(
            Commande commande,
            string adresse,
            DateTime datePrevue,
            DateTime dateEcheance)
        {
            var now = DateTime.Now;
            // We can't reliably generate the auto-number here without DB access,
            // so the caller should call SaveChanges and then update the number.
            return new Livraison
            {
                Adresse = string.IsNullOrWhiteSpace(adresse)
                    ? (commande.Devis?.AdresseLivraison ?? commande.Partenaire?.Adresse ?? string.Empty)
                    : adresse,
                DatePrevue = datePrevue == default ? now.AddDays(2) : datePrevue,
                DateEcheance = dateEcheance == default ? now.AddDays(7) : dateEcheance,
                Statut = LivraisonStatut.EnAttente,
                Id_Commande = commande.Id_Commande,
                Lignes = commande.Lignes.Select(l => new LivraisonLigne
                {
                    Id_Produit = l.Id_Produit,
                    QteCommande = l.Quantite,
                    QteReserve = l.Quantite,
                    QteFait = 0
                }).ToList()
            };
        }

        private static LivraisonDto MapToDto(Livraison l)
        {
            return new LivraisonDto
            {
                Id_Livraison    = l.Id_Livraison,
                NumeroLivraison = l.NumeroLivraison,
                Adresse         = l.Adresse,
                DatePrevue      = l.DatePrevue,
                DateEcheance    = l.DateEcheance,
                Statut          = l.Statut,
                Id_Commande     = l.Id_Commande,
                NumeroCommande  = l.Commande?.NumeroCommande,
                NomPartenaire   = l.Commande?.Partenaire != null
                    ? $"{l.Commande.Partenaire.Nom} ({l.Commande.Partenaire.Entreprise})"
                    : $"Commande #{l.Id_Commande}",
                AdresseClient   = l.Commande?.Partenaire?.Adresse,
                DevisOrigine    = l.Commande?.Devis?.NumeroDevis,
                Lignes          = l.Lignes.Select(ll => new LivraisonLigneDto
                {
                    Id_LivraisonLigne = ll.Id_LivraisonLigne,
                    Id_Produit        = ll.Id_Produit,
                    Designation       = ll.Produit?.Designation,
                    QteCommande       = ll.QteCommande,
                    QteReserve        = ll.QteReserve,
                    QteFait           = ll.QteFait
                }).ToList()
            };
        }
    }
}
