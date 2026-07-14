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
            var allCommandes = await _context.Commandes.Include(c => c.Lignes).ToListAsync();
            var allPartenaires = await _context.Partenaires.ToListAsync();
            var allProduits = await _context.Produits.ToListAsync();

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

            var ventesMapCat = new Dictionary<string, decimal>();
            foreach (var ligne in lignesVentesValides)
            {
                if (ligne.Produit != null)
                {
                    string cat = ligne.Produit.Categorie?.Nom ?? "Inconnu";

                    if (ventesMapCat.ContainsKey(cat))
                    {
                        ventesMapCat[cat] += ligne.MontantTTC;
                    }
                    else
                    {
                        ventesMapCat[cat] = ligne.MontantTTC;
                    }
                }
            }

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
    }
}
