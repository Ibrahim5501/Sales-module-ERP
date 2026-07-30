using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace example2.Models
{
    public class CommandeLigne
    {
        [Key]
        public int Id_CommandeLigne { get; set; }

        public string Description { get; set; } = string.Empty;

        public decimal Quantite { get; set; }

        public decimal PrixUniversitaire { get; set; }

        public decimal TauxTVA { get; set; } = 19m;

        public decimal Remise { get; set; } = 0m;

        public decimal MontantHT { get; set; }

        public decimal MontantTTC { get; set; }

        public string? Emission { get; set; }

        // Navigation
        public int Id_Commande { get; set; }

        [JsonIgnore]
        public virtual Commande? Commande { get; set; }

        public int Id_Produit { get; set; }

        public virtual Produit? Produit { get; set; }
    }
}