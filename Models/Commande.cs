using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace example2.Models
{
    public class Commande
    {
        [Key]
        public int Id_Commande { get; set; }

        public string NumeroCommande { get; set; } = string.Empty;

        public DateTime DateCommande { get; set; }

        public decimal MontantHT { get; set; }

        public decimal MontantTVA { get; set; }

        public decimal MontantTTC { get; set; }

        public CommandeStatut Statut { get; set; }

        public int Id_Devis { get; set; }

        public int Id_Partenaire { get; set; }

        public Devis? Devis { get; set; }

        [JsonIgnore]
        public Partenaire? Partenaire { get; set; }

        public ICollection<CommandeLigne> Lignes { get; set; } = new List<CommandeLigne>();

        public DateTime? DateDebutDiffusion { get; set; }

        public DateTime? DateFinDiffusion { get; set; }

        [JsonIgnore]
        public Facture? Facture { get; set; }

        [JsonIgnore]
        public ICollection<Livraison> Livraisons { get; set; } = new List<Livraison>();

        [JsonIgnore]
        public ICollection<PlanificationSpot> Planifications { get; set; } = new List<PlanificationSpot>();
    }

    public enum CommandeStatut
    {
        EnAttente,
        Validee,
        Facutree,
        Annulee,
        Cloturee
    }
}
