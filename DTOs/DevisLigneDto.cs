using example2.Models;
using System.ComponentModel.DataAnnotations;

namespace example2.DTOs
{
    public class DevisLigneCreateDto
    {
        public string Description { get; set; } = string.Empty;

        public decimal Quantite { get; set; } = 1;

        public int DureeSecondes { get; set; } = 30;

        public decimal PrixUniversitaire { get; set; }

        public decimal TauxTVA { get; set; }

        public decimal Remise { get; set; }

        public string TypeRemise { get; set; } = "Pourcentage";

        public decimal MontantHT { get; set; }

        public decimal MontantTTC { get; set; }
        public int Id_Produit { get; set; }
        public string? Emission { get; set; }
    }

    public class DevisLigneUpdateDto : DevisLigneCreateDto
    {
    }

    public class DevisLigneDto : DevisLigneCreateDto
    {
        public int Id_DevisLigne { get; set; }

        public string Designation { get; set; }

    }
}
