using System;
using System.Collections.Generic;

namespace example2.Models
{
    public class IndicateursCles
    {
        public decimal ChiffreAffairesTotal { get; set; }
        public int NombreCommandes { get; set; }
        public int ClientsActifs { get; set; }
        public int AlertesStock { get; set; }
        public decimal TauxRecouvrement { get; set; } // En pourcentage (ex: 85%)
        public decimal MontantImpaye { get; set; }
    }

    public class VenteParCategorie
    {
        public string Categorie { get; set; } = string.Empty;
        public decimal Montant { get; set; }
        public double Pourcentage { get; set; }
    }

    public class ClientTop
    {
        public string NomClient { get; set; } = string.Empty;
        public string Entreprise { get; set; } = string.Empty;
        public decimal TotalAchats { get; set; }
        public int NombreCommandes { get; set; }
    }

    public class EvolutionMensuelle
    {
        public string Mois { get; set; } = string.Empty; // "Janvier", "Février", etc.
        public decimal Ventes { get; set; }
        public decimal Encaissements { get; set; }
    }

    public class DonniesTableauBord
    {
        public IndicateursCles Indicateurs { get; set; } = new IndicateursCles();
        public List<VenteParCategorie> VentesParCategorie { get; set; } = new List<VenteParCategorie>();
        public List<ClientTop> TopClients { get; set; } = new List<ClientTop>();
        public List<EvolutionMensuelle> EvolutionVentes { get; set; } = new List<EvolutionMensuelle>();
        public List<Commande> CommandesRecentes { get; set; } = new List<Commande>();
    }
}
