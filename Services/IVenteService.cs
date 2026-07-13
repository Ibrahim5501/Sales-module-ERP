using System.Collections.Generic;
using example2.Models;

namespace example2.Services
{
    public interface IVenteService
    {
        // Clients
        List<Partenaire> GetPartenaires();
        Partenaire? GetPartenaireById(int id);
        Partenaire AddPartenaire(Partenaire client);
        Partenaire? UpdatePartenaire(int id, Partenaire client);

        // Produits
        List<Produit> GetProduits();
        Produit? GetProduitById(int id);
        Produit AddProduit(Produit produit);
        Produit? UpdateProduit(int id, Produit produit);
        bool DeleteProduit(int id);

        // Devis
                List<Devis> GetDevis();
        Devis? GetDevisById(int id);
        Devis AddDevis(Devis devis);
        Devis? ValiderDevis(int id);
        Devis? RefuserDevis(int id);
        Devis? ExpirerDevis(int id);
        Devis? EnvoyerDevis(int id);
        Devis? AnnulerDevis(int id);
        Commande? ConvertirDevisEnCommande(int id);

        // Commandes
        List<Commande> GetCommandes();
        Commande? GetCommandeById(int id);
        Commande AddCommande(Commande commande);
        Commande? ValiderCommande(int id);
        Commande? AnnulerCommande(int id);
        Facture? GenererFacture(int id);

        // Factures
        List<Facture> GetFactures();
        Facture? GetFactureById(int id);
        Facture? EnregistrerPaiement(int id, decimal montant);

        // Tableau de bord
        DonniesTableauBord GetDonneesTableauBord();
    }
}
