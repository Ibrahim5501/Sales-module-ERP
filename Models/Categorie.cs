using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace example2.Models
{
    public class Categorie
    {
        [Key]
        public int Id_Categorie { get; set; }

        public string Nom { get; set; } = "";

        public string Description { get; set; } = "";

        public bool Actif { get; set; }

        [JsonIgnore]
        public ICollection<Produit> Produits { get; set; } = new List<Produit>();
    }
}
