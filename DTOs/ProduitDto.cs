using System.ComponentModel.DataAnnotations;

namespace example2.DTOs
{
    public class ProduitCreateDto
    {
        public string Code { get; set; } = string.Empty;
        public string Designation { get; set; } = string.Empty;
        public string Unite { get; set; } = string.Empty;

        public decimal PrixUniversitaire { get; set; }
        public decimal TauxTVA { get; set; }

        public decimal QuantiteStock { get; set; }
        public int DureeSecondes { get; set; } = 30;

        public int Id_Categorie { get; set; }

    }

    public class ProduitUpdateDto : ProduitCreateDto
    {
    }

    public class ProduitDto : ProduitCreateDto
    {
        public int Id_Produit { get; set; }

        public string Designation { get; set; } = string.Empty;

        public string Unite { get; set; } = string.Empty;

        public decimal PrixUniversitaire { get; set; }
        public decimal TauxTVA { get; set; }

        public decimal QuantiteStock { get; set; }

        public bool Actif { get; set; }

        public string? NomCategorie { get; set; }

    }
}
