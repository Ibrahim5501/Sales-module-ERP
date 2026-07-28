using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace example2.Models
{
    public class Livraison
    {
        [Key]
        public int Id_Livraison { get; set; }

        public string NumeroLivraison { get; set; } = string.Empty;

        public string Adresse { get; set; } = string.Empty;

        public DateTime DatePrevue { get; set; } = DateTime.Now.AddDays(2);

        public DateTime DateEcheance { get; set; } = DateTime.Now.AddDays(7);

        public LivraisonStatut Statut { get; set; } = LivraisonStatut.EnAttente;

        // Navigation
        public int Id_Commande { get; set; }

        [JsonIgnore]
        public virtual Commande? Commande { get; set; }

        public ICollection<LivraisonLigne> Lignes { get; set; } = new List<LivraisonLigne>();
    }

    public enum LivraisonStatut
    {
        EnAttente,
        EnCours,
        Livree,
        Partielle,
        Annulee
    }
}
