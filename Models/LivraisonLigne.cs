using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace example2.Models
{
    public class LivraisonLigne
    {
        [Key]
        public int Id_LivraisonLigne { get; set; }

        public decimal QteCommande { get; set; }

        public decimal QteReserve { get; set; }

        public decimal QteFait { get; set; }

        // Navigation
        public int Id_Livraison { get; set; }

        [JsonIgnore]
        public virtual Livraison? Livraison { get; set; }

        public int Id_Produit { get; set; }

        public virtual Produit? Produit { get; set; }
    }
}
