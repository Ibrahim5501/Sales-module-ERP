using System;
using System.Collections.Generic;
using example2.Models;

namespace example2.DTOs
{
    public class LivraisonDto
    {
        public int Id_Livraison { get; set; }
        public string NumeroLivraison { get; set; } = string.Empty;
        public string Adresse { get; set; } = string.Empty;
        public DateTime DatePrevue { get; set; }
        public DateTime DateEcheance { get; set; }
        public LivraisonStatut Statut { get; set; }

        public int Id_Commande { get; set; }
        public string? NumeroCommande { get; set; }
        public string? NomPartenaire { get; set; }
        public string? AdresseClient { get; set; }
        public string? DevisOrigine { get; set; }

        public List<LivraisonLigneDto> Lignes { get; set; } = new();
    }

    public class LivraisonCreateDto
    {
        public int Id_Commande { get; set; }
        public string Adresse { get; set; } = string.Empty;
        public DateTime DatePrevue { get; set; }
        public DateTime DateEcheance { get; set; }
    }

    public class SaisirQteFaitDto
    {
        public List<LigneFaitDto> Lignes { get; set; } = new();
    }

    public class LigneFaitDto
    {
        public int Id_LivraisonLigne { get; set; }
        public decimal QteFait { get; set; }
    }
}
