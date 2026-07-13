using System;
using System.ComponentModel.DataAnnotations;

namespace example2.Models
{
    public class Partenaire
    {
        [Key]
        public int Id_Partenaire { get; set; }

        public string Nom { get; set; } = "";

        public string Email { get; set; } = "";

        public string Entreprise { get; set; } = "";

        public string Telephone { get; set; } = "";

        public string Adresse { get; set; } = "";

        // Navigation properties

        public ICollection<Devis> Devis { get; set; } = new List<Devis>();

        public ICollection<Commande> Commandes { get; set; } = new List<Commande>();

        public ICollection<Facture> Factures { get; set; } = new List<Facture>();
    }
}
