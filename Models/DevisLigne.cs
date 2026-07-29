using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace example2.Models
{
    public class DevisLigne
    {
        [Key]
        public int Id_DevisLigne { get; set; }

        public string Description { get; set; } = "";

        public decimal Quantite { get; set; }

        public decimal PrixUniversitaire { get; set; }

        public decimal TauxTVA { get; set; }

        public decimal Remise { get; set; }

        public string TypeRemise { get; set; } = "Pourcentage";

        public decimal MontantHT { get; set; }

        public decimal MontantTTC { get; set; }

        // Navigation
        public int Id_Devis { get; set; }

        [JsonIgnore]
        public Devis? Devis { get; set; }

        public int Id_Produit { get; set; }

        public Produit? Produit { get; set; }
    }
}
