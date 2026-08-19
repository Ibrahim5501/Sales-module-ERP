using example2.Data;
using example2.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;

namespace example2.Services
{
    public class VenteService : IVenteService
    {
        private readonly ApplicationDbContext _context;

        public VenteService(ApplicationDbContext context)
        {
            _context = context;
        }

        // --- PARTENAIRES (CLIENTS) ---
        public List<Partenaire> GetPartenaires()
        {
            return _context.Partenaires.OrderByDescending(c => c.Id_Partenaire).ToList();
        }

        public Partenaire? GetPartenaireById(int id)
        {
            return _context.Partenaires.FirstOrDefault(c => c.Id_Partenaire == id);
        }

        public Partenaire AddPartenaire(Partenaire client)
        {
            _context.Partenaires.Add(client);
            _context.SaveChanges();
            return client;
        }

        public Partenaire? UpdatePartenaire(int id, Partenaire client)
        {
            var existing = _context.Partenaires.FirstOrDefault(c => c.Id_Partenaire == id);
            if (existing == null) return null;

            existing.Nom = client.Nom;
            existing.Entreprise = client.Entreprise;
            existing.Email = client.Email;
            existing.Telephone = client.Telephone;
            existing.Adresse = client.Adresse;

            _context.SaveChanges();
            return existing;
        }

        // --- PRODUITS ---
        public List<Produit> GetProduits()
        {
            return _context.Produits.OrderBy(p => p.Code).ToList();
        }

        public Produit? GetProduitById(int id)
        {
            return _context.Produits.FirstOrDefault(p => p.Id_Produit == id);
        }

        public Produit AddProduit(Produit produit)
        {
            _context.Produits.Add(produit);
            _context.SaveChanges();
            return produit;
        }

        public Produit? UpdateProduit(int id, Produit produit)
        {
            var existing = _context.Produits.FirstOrDefault(p => p.Id_Produit == id);
            if (existing == null) return null;

            existing.Code = produit.Code;
            existing.Designation = produit.Designation;
            existing.Id_Categorie = produit.Id_Categorie;
            existing.PrixUniversitaire = produit.PrixUniversitaire;
            existing.QuantiteStock = produit.QuantiteStock;
            existing.Actif = produit.Actif;

            _context.SaveChanges();
            return existing;
        }

        public bool DeleteProduit(int id)
        {
            var existing = _context.Produits.FirstOrDefault(p => p.Id_Produit == id);
            if (existing == null) return false;
            _context.Produits.Remove(existing);
            _context.SaveChanges();
            return true;
        }

        // --- DEVIS ---
        public List<Devis> GetDevis()
        {
            return _context.Devis.Include(d => d.Lignes).OrderByDescending(d => d.DateDevis).ToList();
        }

        public Devis? GetDevisById(int id)
        {
            return _context.Devis.Include(d => d.Lignes).FirstOrDefault(d => d.Id_Devis == id);
        }

        public Devis AddDevis(Devis devis)
        {
            devis.DateDevis = DateTime.Now;
            // Recalculer les montants pour chaque ligne et les totaux
            decimal totalHT = 0;
            decimal totalTTC = 0;
            foreach (var ligne in devis.Lignes)
            {
                decimal remiseMontant = ligne.PrixUniversitaire * (ligne.Remise / 100m);
                ligne.MontantHT = (ligne.PrixUniversitaire - remiseMontant) * ligne.Quantite;
                ligne.MontantTTC = ligne.MontantHT * (1 + (ligne.TauxTVA / 100m));
                totalHT += ligne.MontantHT;
                totalTTC += ligne.MontantTTC;
            }
            devis.MontantHT = totalHT;
            devis.MontantTTC = totalTTC;
            _context.Devis.Add(devis);
            _context.SaveChanges();
            // Générer le numéro de devis basé sur l'identifiant de la base de données
            devis.NumeroDevis = $"DEV-{DateTime.Now.Year}-{devis.Id_Devis:D3}";
            _context.SaveChanges();
            return devis;
        }

        public Devis? ValiderDevis(int id)
        {
            var devis = _context.Devis.Include(d => d.Lignes).FirstOrDefault(d => d.Id_Devis == id);
            if (devis == null || devis.Statut != DevisStatut.Accepte) return null;
            devis.Statut = DevisStatut.Accepte;
            _context.SaveChanges();
            return devis;
        }

        public Devis? AnnulerDevis(int id)
        {
            var devis = _context.Devis.Include(d => d.Lignes).FirstOrDefault(d => d.Id_Devis == id);
            if (devis == null || devis.Statut == DevisStatut.Refuse || devis.Statut == DevisStatut.Expire) return null;
            devis.Statut = DevisStatut.Refuse;
            _context.SaveChanges();
            return devis;
        }

        public Devis? ExpirerDevis(int id)
        {
            var devis = _context.Devis.Include(d => d.Lignes).FirstOrDefault(d => d.Id_Devis == id);
            if (devis == null || devis.Statut == DevisStatut.Refuse || devis.Statut == DevisStatut.Expire) return null;
            devis.Statut = DevisStatut.Expire;
            _context.SaveChanges();
            return devis;
        }

        public Devis? EnvoyerDevis(int id)
        {
            var devis = _context.Devis.Include(d => d.Lignes).FirstOrDefault(d => d.Id_Devis == id);
            if (devis == null || devis.Statut != DevisStatut.Brouillon) return null;
            devis.Statut = DevisStatut.Envoye;
            _context.SaveChanges();
            return devis;
        }

        public Devis? AccepterDevis(int id)
        {
            var devis = _context.Devis.Include(d => d.Lignes).FirstOrDefault(d => d.Id_Devis == id);
            if (devis == null || devis.Statut != DevisStatut.Envoye) return null;
            devis.Statut = DevisStatut.Accepte;
            _context.SaveChanges();
            return devis;
        }

        public Devis? RefuserDevis(int id)
        {
            var devis = _context.Devis.Include(d => d.Lignes).FirstOrDefault(d => d.Id_Devis == id);
            if (devis == null || devis.Statut != DevisStatut.Envoye) return null;
            devis.Statut = DevisStatut.Refuse;
            _context.SaveChanges();
            return devis;
        }

        public Commande? ConvertirDevisEnCommande(int id)
        {
            var devis = _context.Devis.Include(d => d.Lignes).FirstOrDefault(d => d.Id_Devis == id);
            if (devis == null || devis.Statut != DevisStatut.Accepte) return null;
            var commande = new Commande
            {
                Id_Partenaire = devis.Id_Partenaire,
                DateCommande = DateTime.Now,
                Statut = CommandeStatut.EnAttente,
                Lignes = devis.Lignes.Select(l => new CommandeLigne
                {
                    Description = l.Description,
                    Quantite = l.Quantite,
                    PrixUniversitaire = l.PrixUniversitaire,
                    Remise = l.Remise,
                    TauxTVA = l.TauxTVA,
                    MontantHT = l.MontantHT,
                    MontantTTC = l.MontantTTC
                }).ToList(),
                MontantHT = devis.MontantHT,
                MontantTTC = devis.MontantTTC
            };
            _context.Commandes.Add(commande);
            _context.SaveChanges();
            // Générer le numéro de commande basé sur l'identifiant de la base de données
            commande.NumeroCommande = $"CMD-{DateTime.Now.Year}-{commande.Id_Commande:D3}";
            _context.SaveChanges();
            return commande;
        }

        // --- COMMANDES ---
        public List<Commande> GetCommandes()
        {
            return _context.Commandes.Include(c => c.Lignes).OrderByDescending(c => c.DateCommande).ToList();
        }

        public Commande? GetCommandeById(int id)
        {
            return _context.Commandes.Include(c => c.Lignes).FirstOrDefault(c => c.Id_Commande == id);
        }

        public Commande AddCommande(Commande commande)
        {
            commande.DateCommande = DateTime.Now;
            commande.Statut = CommandeStatut.EnAttente;

            // Recalculer les montants pour chaque ligne et les totaux
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

            commande.NumeroCommande = $"CMD-{DateTime.Now.Year}-{next:D3}";

            _context.Commandes.Add(commande);
            _context.SaveChanges();

            return commande;
        }

        public Commande? ValiderCommande(int id)
        {
            var cmd = _context.Commandes.Include(c => c.Lignes).FirstOrDefault(c => c.Id_Commande == id);
            if (cmd == null || cmd.Statut != CommandeStatut.EnAttente) return null;

            // Les spots publicitaires ne possèdent pas de stock physique à décrémenter

            cmd.Statut = CommandeStatut.Validee;
            _context.SaveChanges();
            return cmd;
        }

        public Commande? AnnulerCommande(int id)
        {
            var cmd = _context.Commandes.Include(c => c.Lignes).FirstOrDefault(c => c.Id_Commande == id);
            if (cmd == null || cmd.Statut == CommandeStatut.Facutree || cmd.Statut == CommandeStatut.Cloturee || cmd.Statut == CommandeStatut.Annulee) return null;

            // Les spots publicitaires ne possèdent pas de stock physique à réajuster

            cmd.Statut = CommandeStatut.Annulee;
            _context.SaveChanges();
            return cmd;
        }

        public Facture? GenererFacture(int id)
        {
            var cmd = _context.Commandes.Include(c => c.Lignes).FirstOrDefault(c => c.Id_Commande == id);
            if (cmd == null || cmd.Statut != CommandeStatut.Validee) return null;

            cmd.Statut = CommandeStatut.Facutree;

            var client = _context.Partenaires.FirstOrDefault(p => p.Id_Partenaire == cmd.Id_Partenaire);

            var fact = new Facture
            {
                Id_Devis = cmd.Id_Devis,
                Id_Partenaire = cmd.Id_Partenaire,
                DateFacture = DateTime.Now,
                DateEcheance = DateTime.Now.AddDays(30),
                MontantTotal = cmd.MontantTTC,
                MontantHT = cmd.MontantHT,
                MontantTVA = cmd.MontantTVA,
                MontantPaye = 0,
                Statut = FactureStatut.NonPayee,
            };

            int next = (_context.Factures.Max(d => (int?)d.Id_Facture) ?? 0) + 1;
            fact.NumeroFacture = $"FAC-{DateTime.Now.Year}-{next:D3}";

            _context.Factures.Add(fact);
            _context.SaveChanges();

            return fact;
        }

        // --- FACTURES ---
        public List<Facture> GetFactures()
        {
            return _context.Factures.OrderByDescending(f => f.DateFacture).ToList();
        }

        public Facture? GetFactureById(int id)
        {
            return _context.Factures.FirstOrDefault(f => f.Id_Facture == id);
        }

        public Facture? EnregistrerPaiement(int id, decimal montant)
        {
            var fact = _context.Factures.FirstOrDefault(f => f.Id_Facture == id);
            if (fact == null || fact.Statut == FactureStatut.Payee || fact.Statut == FactureStatut.Annulee || montant <= 0) return null;

            decimal restant = fact.MontantRestant;
            decimal paiementEfficace = Math.Min(montant, restant);

            fact.MontantPaye += paiementEfficace;
            fact.Statut = fact.MontantRestant == 0 ? FactureStatut.Payee : FactureStatut.NonPayee;

            _context.SaveChanges();
            return fact;
        }

        // --- TABLEAU DE BORD ---
        public DonniesTableauBord GetDonneesTableauBord()
        {
            var data = new DonniesTableauBord();

            var facturesValides = _context.Factures.Where(f => f.Statut != FactureStatut.Annulee).ToList();
            var allCommandes = _context.Commandes.Include(c => c.Lignes).ToList();
            var allPartenaires = _context.Partenaires.ToList();
            var allProduits = _context.Produits.ToList();

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
                    Id_Partenaire = g.Key,
                    Total = g.Sum(c => c.MontantTTC),
                    Count = g.Count()
                })
                .OrderByDescending(x => x.Total)
                .Take(5)
                .ToList();

            foreach (var ac in achatsClients)
            {
                var client = allPartenaires.FirstOrDefault(c => c.Id_Partenaire == ac.Id_Partenaire);

                if (client == null)
                    continue;

                data.TopClients.Add(new ClientTop
                {
                    NomClient = client.Nom,
                    Entreprise = client.Entreprise,
                    TotalAchats = ac.Total,
                    NombreCommandes = ac.Count
                });
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

            return data;
        }
    }
}
