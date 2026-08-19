using System;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace example2.Models
{
    public class Facture
    {
        [Key]
        public int Id_Facture { get; set; }

        public string NumeroFacture { get; set; } = string.Empty;

        public DateTime DateFacture { get; set; } = DateTime.Now;

        public DateTime DateEcheance { get; set; } = DateTime.Now.AddDays(30);

        public decimal MontantHT { get; set; }

        public decimal MontantTVA { get; set; }

        public decimal MontantTotal { get; set; }  // = MontantTTC

        public decimal MontantPaye { get; set; }

        public decimal MontantRestant => MontantTotal - MontantPaye;

        public FactureStatut Statut { get; set; } = FactureStatut.NonPayee;

        // Navigation — linked to Devis (not Commande)
        public int Id_Devis { get; set; }

        [JsonIgnore]
        public virtual Devis? Devis { get; set; }

        public int Id_Partenaire { get; set; }

        [JsonIgnore]
        public virtual Partenaire? Partenaire { get; set; }
    }

    public enum FactureStatut
    {
        NonPayee,
        Payee,
        EnRetard,
        Annulee
    }
}
