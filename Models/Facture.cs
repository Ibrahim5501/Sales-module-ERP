using System;
using System.ComponentModel.DataAnnotations;

namespace example2.Models
{
    public class Facture
    {
        [Key]
        public int Id_Facture { get; set; }

        public string NumeroFacture { get; set; }

        public DateTime DateFacture { get; set; } = DateTime.Now;

        public DateTime DateEcheance { get; set; } = DateTime.Now.AddDays(30);

        public decimal MontantTotal { get; set; }

        public decimal MontantPaye { get; set; }

        public decimal MontantRestant => MontantTotal - MontantPaye;

        public FactureStatut Statut { get; set; } = FactureStatut.NonPayee;

        // Navigation
        public int Id_Commande { get; set; }

        public virtual Commande? Commande { get; set; }

        public int Id_Partenaire { get; set; }

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
