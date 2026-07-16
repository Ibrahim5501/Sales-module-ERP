using System;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

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

        [JsonIgnore]
        public ICollection<Devis> Devis { get; set; } = new List<Devis>();

        [JsonIgnore]
        public ICollection<Commande> Commandes { get; set; } = new List<Commande>();

        [JsonIgnore]
        public ICollection<Facture> Factures { get; set; } = new List<Facture>();
    }
}
