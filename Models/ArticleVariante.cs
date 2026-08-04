using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace example2.Models
{
    public class ArticleVariante
    {
        [Key]
        public int Id_ArticleVariante { get; set; }

        /// <summary>Libellé propre à la variante (ex: "Spot 30s - Prime Time")</summary>
        [Required]
        [StringLength(200)]
        public string Designation { get; set; } = string.Empty;

        /// <summary>Prix HT prédéfini pour cette variante (remplace le prix de base du spot)</summary>
        public decimal PrixVariante { get; set; }

        /// <summary>Taux TVA applicable (0, 7, 13 ou 19 %)</summary>
        public decimal TauxTVA { get; set; } = 19;

        /// <summary>Durée en secondes proposée par défaut lors de la saisie d'une ligne de devis</summary>
        public decimal DureeDefaut { get; set; } = 30;

        public bool Actif { get; set; } = true;

        // --- Navigation ---

        public int Id_Produit { get; set; }

        public Produit? Produit { get; set; }

        public int Id_PlageHoraire { get; set; }

        public PlageHoraire? PlageHoraire { get; set; }
    }
}
