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
    public class PlanificationSpotsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public PlanificationSpotsController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/PlanificationSpots
        [HttpGet]
        public async Task<ActionResult<IEnumerable<PlanificationSpotDto>>> Get()
        {
            var list = await _context.PlanificationSpots
                .Include(p => p.Commande)
                    .ThenInclude(c => c.Partenaire)
                .Include(p => p.Produit)
                .Include(p => p.PlageHoraire)
                .OrderBy(p => p.DateHeureDiffusion)
                .ToListAsync();

            return Ok(list.Select(MapToDto));
        }

        // GET: api/PlanificationSpots/commande/5
        [HttpGet("commande/{commandeId}")]
        public async Task<ActionResult<IEnumerable<PlanificationSpotDto>>> GetByCommande(int commandeId)
        {
            var list = await _context.PlanificationSpots
                .Include(p => p.Commande)
                    .ThenInclude(c => c.Partenaire)
                .Include(p => p.Produit)
                .Include(p => p.PlageHoraire)
                .Where(p => p.Id_Commande == commandeId)
                .OrderBy(p => p.DateHeureDiffusion)
                .ToListAsync();

            return Ok(list.Select(MapToDto));
        }

        // GET: api/PlanificationSpots/5
        [HttpGet("{id}")]
        public async Task<ActionResult<PlanificationSpotDto>> GetById(int id)
        {
            var spot = await _context.PlanificationSpots
                .Include(p => p.Commande)
                    .ThenInclude(c => c.Partenaire)
                .Include(p => p.Produit)
                .Include(p => p.PlageHoraire)
                .FirstOrDefaultAsync(p => p.Id_PlanificationSpot == id);

            if (spot == null) return NotFound(new { message = "Planification de spot non trouvée." });

            return Ok(MapToDto(spot));
        }

        // POST: api/PlanificationSpots
        [HttpPost]
        public async Task<ActionResult<PlanificationSpotDto>> Create(PlanificationSpotCreateDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var commande = await _context.Commandes
                .Include(c => c.Devis)
                .FirstOrDefaultAsync(c => c.Id_Commande == dto.Id_Commande);

            if (commande == null)
                return BadRequest(new { message = "Bon de commande non trouvé." });

            // 0. Restriction par l'intervalle de dates du Devis / Commande (Campagne)
            DateTime? dateDebut = commande.DateDebutDiffusion ?? commande.Devis?.DateDebutDiffusion;
            DateTime? dateFin   = commande.DateFinDiffusion   ?? commande.Devis?.DateFinDiffusion;

            if (dateDebut.HasValue && dto.DateHeureDiffusion.Date < dateDebut.Value.Date)
            {
                return BadRequest(new {
                    message = $"La date de diffusion ({dto.DateHeureDiffusion:dd/MM/yyyy}) est antérieure à la date de début de campagne autorisée par le devis ({dateDebut.Value:dd/MM/yyyy})."
                });
            }

            if (dateFin.HasValue && dto.DateHeureDiffusion.Date > dateFin.Value.Date)
            {
                return BadRequest(new {
                    message = $"La date de diffusion ({dto.DateHeureDiffusion:dd/MM/yyyy}) dépasse la date de fin de campagne autorisée par le devis ({dateFin.Value:dd/MM/yyyy})."
                });
            }

            // Resolve CommandeLigne / Produit for DureeSecondes and PlageHoraire
            CommandeLigne? cmdLigne = null;
            if (dto.Id_CommandeLigne.HasValue)
            {
                cmdLigne = await _context.CommandeLignes
                    .Include(cl => cl.Produit)
                    .FirstOrDefaultAsync(cl => cl.Id_CommandeLigne == dto.Id_CommandeLigne.Value);
            }
            else
            {
                cmdLigne = await _context.CommandeLignes
                    .Include(cl => cl.Produit)
                    .FirstOrDefaultAsync(cl => cl.Id_Commande == dto.Id_Commande && cl.Id_Produit == dto.Id_Produit);
            }

            int dureeSecondes = cmdLigne?.DureeSecondes > 0
                ? cmdLigne.DureeSecondes
                : (await _context.Produits.Where(p => p.Id_Produit == dto.Id_Produit).Select(p => (int?)p.DureeSecondes).FirstOrDefaultAsync() ?? 30);

            // Resolve PlageHoraire strictly from the spot (ArticleVariante or CommandeLigne.Emission or Produit)
            int? idPlage = dto.Id_PlageHoraire;
            if (!idPlage.HasValue && cmdLigne != null && !string.IsNullOrEmpty(cmdLigne.Emission))
            {
                var plageMatch = await _context.PlagesHoraires.FirstOrDefaultAsync(p => cmdLigne.Emission.Contains(p.Nom));
                if (plageMatch != null) idPlage = plageMatch.Id_PlageHoraire;
            }

            if (!idPlage.HasValue)
            {
                var variante = await _context.ArticlesVariantes.FirstOrDefaultAsync(av => av.Id_Produit == dto.Id_Produit && av.Actif);
                if (variante != null && variante.Id_PlageHoraire > 0) idPlage = variante.Id_PlageHoraire;
            }

            PlageHoraire? plage = null;
            if (idPlage.HasValue)
            {
                plage = await _context.PlagesHoraires.FirstOrDefaultAsync(p => p.Id_PlageHoraire == idPlage.Value);
            }

            // 1. Restriction par la plage horaire désignée sur le spot
            if (plage != null && plage.Actif)
            {
                var checkRange = ValidateTimeWindow(dto.DateHeureDiffusion, dureeSecondes, plage);
                if (!checkRange.isValid)
                    return BadRequest(new { message = checkRange.errorMessage });
            }

            // 2. Validation d'absence de chevauchement
            if (dto.Statut != StatutPlanificationSpot.Annule)
            {
                var conflict = await CheckOverlapConflict(dto.DateHeureDiffusion, dureeSecondes, null);
                if (conflict != null)
                {
                    return BadRequest(new
                    {
                        message = $"Conflit de créneau horaire : Un autre spot est déjà planifié pour la période du " +
                                  $"{conflict.DateHeureDiffusion:dd/MM/yyyy HH:mm:ss} au " +
                                  $"{conflict.DateHeureDiffusion.AddSeconds(conflict.DureeSecondes):HH:mm:ss}. " +
                                  $"Deux spots ne peuvent pas se chevaucher sur le même créneau."
                    });
                }
            }

            // Validate quota: cannot schedule more spots than ordered in CommandeLigne
            if (cmdLigne != null && cmdLigne.Quantite > 0)
            {
                int countPlanned = await _context.PlanificationSpots
                    .Where(ps => ps.Id_CommandeLigne == cmdLigne.Id_CommandeLigne && ps.StatutString != "Annulé")
                    .CountAsync();

                if (countPlanned >= (int)cmdLigne.Quantite)
                {
                    return BadRequest(new
                    {
                        message = $"Quota atteint : Vous avez déjà planifié {countPlanned} spot(s) sur les {((int)cmdLigne.Quantite)} ordonnés pour le spot '{cmdLigne.Description}'."
                    });
                }
            }

            var spotPlan = new PlanificationSpot
            {
                Id_Commande        = dto.Id_Commande,
                Id_CommandeLigne   = cmdLigne?.Id_CommandeLigne ?? dto.Id_CommandeLigne,
                Id_Produit         = dto.Id_Produit,
                DateHeureDiffusion = dto.DateHeureDiffusion,
                DureeSecondes      = dureeSecondes,
                Id_PlageHoraire    = idPlage,
                Statut             = dto.Statut,
                Remarques          = dto.Remarques
            };

            _context.PlanificationSpots.Add(spotPlan);
            await _context.SaveChangesAsync();

            spotPlan = await _context.PlanificationSpots
                .Include(p => p.Commande).ThenInclude(c => c.Partenaire)
                .Include(p => p.Produit)
                .Include(p => p.PlageHoraire)
                .FirstAsync(p => p.Id_PlanificationSpot == spotPlan.Id_PlanificationSpot);

            return CreatedAtAction(nameof(GetById), new { id = spotPlan.Id_PlanificationSpot }, MapToDto(spotPlan));
        }

        // PUT: api/PlanificationSpots/5
        [HttpPut("{id}")]
        public async Task<ActionResult<PlanificationSpotDto>> Update(int id, PlanificationSpotUpdateDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var existing = await _context.PlanificationSpots
                .Include(p => p.Commande).ThenInclude(c => c.Devis)
                .FirstOrDefaultAsync(p => p.Id_PlanificationSpot == id);

            if (existing == null)
                return NotFound(new { message = "Planification de spot non trouvée." });

            // 0. Restriction par l'intervalle de dates du Devis / Commande (Campagne)
            DateTime? dateDebut = existing.Commande?.DateDebutDiffusion ?? existing.Commande?.Devis?.DateDebutDiffusion;
            DateTime? dateFin   = existing.Commande?.DateFinDiffusion   ?? existing.Commande?.Devis?.DateFinDiffusion;

            if (dateDebut.HasValue && dto.DateHeureDiffusion.Date < dateDebut.Value.Date)
            {
                return BadRequest(new {
                    message = $"La date de diffusion ({dto.DateHeureDiffusion:dd/MM/yyyy}) est antérieure à la date de début de campagne autorisée ({dateDebut.Value:dd/MM/yyyy})."
                });
            }

            if (dateFin.HasValue && dto.DateHeureDiffusion.Date > dateFin.Value.Date)
            {
                return BadRequest(new {
                    message = $"La date de diffusion ({dto.DateHeureDiffusion:dd/MM/yyyy}) dépasse la date de fin de campagne autorisée ({dateFin.Value:dd/MM/yyyy})."
                });
            }

            int dureeSecondes = existing.DureeSecondes;
            int? idPlage = existing.Id_PlageHoraire;

            PlageHoraire? plage = null;
            if (idPlage.HasValue)
                plage = await _context.PlagesHoraires.FirstOrDefaultAsync(p => p.Id_PlageHoraire == idPlage.Value);

            if (plage != null && plage.Actif)
            {
                var checkRange = ValidateTimeWindow(dto.DateHeureDiffusion, dureeSecondes, plage);
                if (!checkRange.isValid)
                    return BadRequest(new { message = checkRange.errorMessage });
            }

            if (dto.Statut != StatutPlanificationSpot.Annule)
            {
                var conflict = await CheckOverlapConflict(dto.DateHeureDiffusion, dureeSecondes, id);
                if (conflict != null)
                {
                    return BadRequest(new
                    {
                        message = $"Conflit de créneau horaire : Un autre spot est déjà planifié pour la période du " +
                                  $"{conflict.DateHeureDiffusion:dd/MM/yyyy HH:mm:ss} au " +
                                  $"{conflict.DateHeureDiffusion.AddSeconds(conflict.DureeSecondes):HH:mm:ss}. " +
                                  $"Deux spots ne peuvent pas se chevaucher sur le même créneau."
                    });
                }
            }

            existing.DateHeureDiffusion = dto.DateHeureDiffusion;
            existing.Statut             = dto.Statut;
            existing.Remarques          = dto.Remarques;
            await _context.SaveChangesAsync();

            existing = await _context.PlanificationSpots
                .Include(p => p.Commande).ThenInclude(c => c.Partenaire)
                .Include(p => p.Produit)
                .Include(p => p.PlageHoraire)
                .FirstAsync(p => p.Id_PlanificationSpot == id);

            return Ok(MapToDto(existing));
        }

        // PUT: api/PlanificationSpots/5/statut
        [HttpPut("{id}/statut")]
        public async Task<ActionResult<PlanificationSpotDto>> UpdateStatut(int id, PlanificationSpotStatutUpdateDto dto)
        {
            var existing = await _context.PlanificationSpots
                .Include(p => p.Commande).ThenInclude(c => c.Partenaire)
                .Include(p => p.Produit)
                .Include(p => p.PlageHoraire)
                .FirstOrDefaultAsync(p => p.Id_PlanificationSpot == id);

            if (existing == null)
                return NotFound(new { message = "Planification de spot non trouvée." });

            // Re-activating a previously cancelled spot — check for overlaps
            if (dto.Statut != StatutPlanificationSpot.Annule && existing.Statut == StatutPlanificationSpot.Annule)
            {
                var conflict = await CheckOverlapConflict(existing.DateHeureDiffusion, existing.DureeSecondes, id);
                if (conflict != null)
                {
                    return BadRequest(new
                    {
                        message = $"Conflit de créneau horaire : Impossible de réactiver ce spot car un autre spot " +
                                  $"occupe le créneau ({conflict.DateHeureDiffusion:dd/MM/yyyy HH:mm:ss} - " +
                                  $"{conflict.DateHeureDiffusion.AddSeconds(conflict.DureeSecondes):HH:mm:ss})."
                    });
                }
            }

            existing.Statut = dto.Statut;
            await _context.SaveChangesAsync();

            return Ok(MapToDto(existing));
        }

        // DELETE: api/PlanificationSpots/5
        [HttpDelete("{id}")]
        public async Task<ActionResult> Delete(int id)
        {
            var spot = await _context.PlanificationSpots.FindAsync(id);
            if (spot == null)
                return NotFound(new { message = "Planification de spot non trouvée." });

            _context.PlanificationSpots.Remove(spot);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Planification de spot supprimée." });
        }

        // ---------------------------------------------------------------------------
        // Helpers
        // ---------------------------------------------------------------------------

        private static (bool isValid, string errorMessage) ValidateTimeWindow(
            DateTime dateHeure, int dureeSecondes, PlageHoraire plage)
        {
            if (!TimeSpan.TryParse(plage.HeureDebut, out var startRange) ||
                !TimeSpan.TryParse(plage.HeureFin, out var endRange))
                return (true, string.Empty);

            TimeSpan timeOfDayStart = dateHeure.TimeOfDay;
            TimeSpan timeOfDayEnd   = dateHeure.AddSeconds(dureeSecondes).TimeOfDay;

            if (endRange > startRange)
            {
                if (timeOfDayStart < startRange || timeOfDayStart > endRange ||
                    (timeOfDayEnd > endRange && timeOfDayEnd > timeOfDayStart))
                {
                    return (false,
                        $"L'heure de diffusion ({dateHeure:HH:mm:ss}) et sa durée ({dureeSecondes}s) " +
                        $"doivent être strictement incluses dans la plage horaire désignée '{plage.Nom}' " +
                        $"({plage.HeureDebut} - {plage.HeureFin}).");
                }
            }

            return (true, string.Empty);
        }

        private async Task<PlanificationSpot?> CheckOverlapConflict(
            DateTime proposedStart, int dureeSecondes, int? excludeId)
        {
            DateTime proposedEnd = proposedStart.AddSeconds(dureeSecondes);

            // StatutString is the mapped DB column
            var activeSpots = await _context.PlanificationSpots
                .Where(ps => ps.StatutString != "Annulé" &&
                             (!excludeId.HasValue || ps.Id_PlanificationSpot != excludeId.Value))
                .ToListAsync();

            foreach (var spot in activeSpots)
            {
                DateTime spotEnd = spot.DateHeureDiffusion.AddSeconds(spot.DureeSecondes);
                if (proposedStart < spotEnd && proposedEnd > spot.DateHeureDiffusion)
                    return spot;
            }

            return null;
        }

        private static PlanificationSpotDto MapToDto(PlanificationSpot ps)
        {
            return new PlanificationSpotDto
            {
                Id_PlanificationSpot = ps.Id_PlanificationSpot,
                Id_Commande          = ps.Id_Commande,
                NumeroCommande       = ps.Commande?.NumeroCommande,
                Id_Partenaire        = ps.Commande?.Id_Partenaire ?? 0,
                NomPartenaire        = ps.Commande?.Partenaire != null
                    ? $"{ps.Commande.Partenaire.Nom} ({ps.Commande.Partenaire.Entreprise})"
                    : $"Partenaire #{ps.Commande?.Id_Partenaire}",
                Id_CommandeLigne     = ps.Id_CommandeLigne,
                Id_Produit           = ps.Id_Produit,
                DesignationProduit   = ps.Produit?.Designation ?? "Spot Publicitaire",
                CodeProduit          = ps.Produit?.Code ?? "SPOT",
                DateHeureDiffusion   = ps.DateHeureDiffusion,
                DureeSecondes        = ps.DureeSecondes,
                Id_PlageHoraire      = ps.Id_PlageHoraire,
                NomPlageHoraire      = ps.PlageHoraire?.Nom,
                HeureDebutPlage      = ps.PlageHoraire?.HeureDebut,
                HeureFinPlage        = ps.PlageHoraire?.HeureFin,
                Statut               = ps.Statut.ToFrenchString(),
                Remarques            = ps.Remarques
            };
        }
    }
}
