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

        public string NumeroCommande { get; set; }

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

        [JsonIgnore]
        public Facture? Facture { get; set; }
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
