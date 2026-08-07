using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using example2.Data;
using example2.Models;
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
    public class TableauBordController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public TableauBordController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<DonniesTableauBord>> Get()
        {
            var data = new DonniesTableauBord();

            var facturesValides = await _context.Factures.Where(f => f.Statut != FactureStatut.Annulee).ToListAsync();
            var allCommandes = await _context.Commandes
                .Include(c => c.Lignes)
                    .ThenInclude(l => l.Produit)
                        .ThenInclude(p => p.Categorie)
                .ToListAsync();
            var allPartenaires = await _context.Partenaires.ToListAsync();
            var allProduits = await _context.Produits.ToListAsync();
            var categories = await _context.Produits
                .Where(p => p.Categorie != null)
                .Select(p => p.Categorie.Nom)
                .Distinct()
                .ToListAsync();

            // 1. Indicateurs clés
            data.Indicateurs.ChiffreAffairesTotal = facturesValides.Sum(f => f.MontantTotal);
            data.Indicateurs.NombreCommandes = allCommandes.Count(c => c.Statut != CommandeStatut.Annulee);

            var clientsCommandeurs = allCommandes
                .Where(c => c.Statut == CommandeStatut.Validee || c.Statut == CommandeStatut.Facutree || c.Statut == CommandeStatut.Cloturee)
                .Select(c => c.Id_Partenaire)
                .Distinct()
                .ToList();
            data.Indicateurs.ClientsActifs = allPartenaires.Count(c => clientsCommandeurs.Contains(c.Id_Partenaire));

            // Alertes stock : stock <= 5
            data.Indicateurs.AlertesStock = allProduits.Count(p => p.QuantiteStock <= 5);

            decimal totalEncaisse = facturesValides.Sum(f => f.MontantPaye);
            decimal totalFacture = facturesValides.Sum(f => f.MontantTotal);
            data.Indicateurs.TauxRecouvrement = totalFacture > 0 ? Math.Round((totalEncaisse / totalFacture) * 100, 1) : 100;
            data.Indicateurs.MontantImpaye = facturesValides.Sum(f => f.MontantRestant);

            // 2. Ventes par catégorie de produits
            var lignesVentesValides = allCommandes
                .Where(c => c.Statut == CommandeStatut.Validee || c.Statut == CommandeStatut.Facutree || c.Statut == CommandeStatut.Cloturee)
                .SelectMany(c => c.Lignes)
                .ToList();

            var ventesMapCat = lignesVentesValides
                .Where(l => l.Produit?.Categorie != null)
                .GroupBy(l => l.Produit.Categorie.Nom)
                .ToDictionary(
                    g => g.Key,
                    g => g.Sum(l => l.MontantTTC)
                );

            decimal totalVentesCat = ventesMapCat.Values.Sum();
            foreach (var kv in ventesMapCat)
            {
                data.VentesParCategorie.Add(new VenteParCategorie
                {
                    Categorie = kv.Key,
                    Montant = kv.Value,
                    Pourcentage = totalVentesCat > 0 ? Math.Round((double)(kv.Value / totalVentesCat) * 100, 1) : 0
                });
            }
            data.VentesParCategorie = data.VentesParCategorie.OrderByDescending(v => v.Montant).ToList();

            // 3. Top Clients
            var achatsClients = allCommandes
                .Where(c => c.Statut == CommandeStatut.Validee || c.Statut == CommandeStatut.Facutree || c.Statut == CommandeStatut.Cloturee)
                .GroupBy(c => c.Id_Partenaire)
                .Select(g => new
                {
                    PartenaireId = g.Key,
                    Total = g.Sum(c => c.MontantTTC),
                    Count = g.Count()
                })
                .OrderByDescending(x => x.Total)
                .Take(5)
                .ToList();

            foreach (var ac in achatsClients)
            {
                var client = allPartenaires.FirstOrDefault(c => c.Id_Partenaire == ac.PartenaireId);
                if (client != null)
                {
                    data.TopClients.Add(new ClientTop
                    {
                        NomClient = client.Nom,
                        Entreprise = client.Entreprise,
                        TotalAchats = ac.Total,
                        NombreCommandes = ac.Count
                    });
                }
            }

            // 4. Évolution Mensuelle
            string moisActuel = DateTime.Now.ToString("MMMM", new System.Globalization.CultureInfo("fr-FR"));
            if (!string.IsNullOrEmpty(moisActuel))
                moisActuel = char.ToUpper(moisActuel[0]) + moisActuel[1..];

            data.EvolutionVentes.AddRange(new List<EvolutionMensuelle>
            {
                new() { Mois = "Février", Ventes = 4500, Encaissements = 4000 },
                new() { Mois = "Mars", Ventes = 7200, Encaissements = 6500 },
                new() { Mois = "Avril", Ventes = 5100, Encaissements = 4800 },
                new() { Mois = "Mai", Ventes = 9400, Encaissements = 8200 },
                new() { Mois = "Juin", Ventes = 8800, Encaissements = 7900 },
                new() { Mois = moisActuel, Ventes = data.Indicateurs.ChiffreAffairesTotal, Encaissements = totalEncaisse }
            });

            // 5. Commandes Récentes
            data.CommandesRecentes = allCommandes
                .OrderByDescending(c => c.DateCommande)
                .Take(5)
                .ToList();

            return Ok(data);
        }

        // -----------------------------------------------------------------------
        // ANALYTICS DASHBOARD - Données pour les graphiques analytiques
        // -----------------------------------------------------------------------
        [HttpGet("analytics")]
        public async Task<ActionResult> GetAnalytics()
        {
            // --- Devis ---
            var allDevis = await _context.Devis.ToListAsync();
            var devisParStatut = allDevis
                .GroupBy(d => d.Statut.ToString())
                .Select(g => new { statut = g.Key, count = g.Count() })
                .ToList();

            // --- Commandes ---
            var allCommandes = await _context.Commandes.ToListAsync();
            var commandesParStatut = allCommandes
                .GroupBy(c => c.Statut.ToString())
                .Select(g => new { statut = g.Key, count = g.Count() })
                .ToList();

            // --- Taux de conversion devis -> commande ---
            int totalDevis = allDevis.Count;
            int devisConverties = allDevis.Count(d => d.Statut == DevisStatut.Accepte);
            double tauxConversion = totalDevis > 0 ? Math.Round((double)devisConverties / totalDevis * 100, 1) : 0;
            int devisNonConverties = totalDevis - devisConverties;

            // --- Planification spots ---
            var allSpots = await _context.PlanificationSpots
                .Include(s => s.CommandeLigne)
                .Include(s => s.PlageHoraire)
                .ToListAsync();

            var spotsParStatut = allSpots
                .GroupBy(s => s.Statut.ToString())
                .Select(g => new { statut = g.Key, count = g.Count() })
                .ToList();

            // --- Revenus par plage horaire (stacked par statut) ---
            var revenuParPlage = allSpots
                .GroupBy(s => s.PlageHoraire != null ? s.PlageHoraire.Nom : "Sans restriction")
                .Select(g => new
                {
                    plage    = g.Key,
                    planifie = g.Where(s => s.Statut == StatutPlanificationSpot.Planifie)
                                .Sum(s => s.CommandeLigne != null ? s.CommandeLigne.MontantTTC : 0),
                    diffuse  = g.Where(s => s.Statut == StatutPlanificationSpot.Diffuse)
                                .Sum(s => s.CommandeLigne != null ? s.CommandeLigne.MontantTTC : 0),
                    annule   = g.Where(s => s.Statut == StatutPlanificationSpot.Annule)
                                .Sum(s => s.CommandeLigne != null ? s.CommandeLigne.MontantTTC : 0)
                })
                .OrderByDescending(x => x.planifie + x.diffuse)
                .ToList();

            // --- Revenus par variante/spot produit ---
            var allCommandeLignes = await _context.CommandeLignes
                .Include(l => l.Produit)
                .ToListAsync();

            var revenuParVariante = allCommandeLignes
                .Where(l => l.Produit != null)
                .GroupBy(l => l.Produit!.Designation)
                .Select(g => new
                {
                    variante = g.Key,
                    revenu   = g.Sum(l => l.MontantTTC),
                    count    = g.Sum(l => (int)l.Quantite)
                })
                .OrderByDescending(x => x.revenu)
                .Take(10)
                .ToList();

            return Ok(new
            {
                devisParStatut,
                commandesParStatut,
                tauxConversion = new[]
                {
                    new { label = "Convertis en commande", valeur = devisConverties },
                    new { label = "Non convertis", valeur = devisNonConverties }
                },
                tauxConversionPct = tauxConversion,
                spotsParStatut,
                revenuParPlage,
                revenuParVariante
            });
        }
    }
}
