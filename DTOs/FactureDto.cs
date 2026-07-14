using example2.Models;
using System;

namespace example2.DTOs
{
    public class FactureCreateDto
    {
        public int Id_Commande { get; set; }

        public int Id_Partenaire { get; set; }
    }

    public class FactureUpdateDto : FactureCreateDto
    {
    }

    public class FactureDto : FactureCreateDto
    {
        public int Id_Facture { get; set; }

        public string NumeroFacture { get; set; }

        public DateTime DateFacture { get; set; }

        public DateTime DateEcheance { get; set; }

        public decimal MontantTotal { get; set; }

        public decimal MontantPaye { get; set; }

        public decimal MontantRestant { get; set; }

        public FactureStatut Statut { get; set; }

        public int Id_Commande { get; set; }
        
        public string? NumeroCommande { get; set; }

        public int Id_Partenaire { get; set; }
        
        public string? NomPartenaire { get; set; }

    }
}
