using System.ComponentModel.DataAnnotations;

namespace example2.Models
{
    public class Devis
    {
        [Key]
        public int Id_Devis { get; set; }

        public string NumeroDevis { get; set; } = string.Empty;

        public DateTime DateDevis { get; set; } = DateTime.Now;
        public DateTime DateValidite { get; set; } = DateTime.Now.AddDays(30);

        public string? AdresseLivraison { get; set; } = string.Empty;

        public string? AdresseFacturation { get; set; } = string.Empty;

        public DevisStatut Statut { get; set; }

        public decimal MontantHT { get; set; }

        public decimal MontantTVA { get; set; }

        public decimal MontantTTC { get; set; }

        public string? ModePaiement { get; set; } = "Virement Bancaire";

        public decimal RemiseGlobale { get; set; } = 0;

        public string TypeRemiseGlobale { get; set; } = "Pourcentage";

        public int? Id_User { get; set; }

        public User? User { get; set; }

        // Navigation
        public int Id_Partenaire { get; set; }

        public Partenaire? Partenaire { get; set; }

        public ICollection<DevisLigne> Lignes { get; set; } = new List<DevisLigne>();

        public Commande? Commande { get; set; }
    }

    public enum DevisStatut
    {
        Brouillon = 0,
        Envoye = 1,
        Accepte = 2,
        Refuse = 3,
        Expire = 4
    }
}
