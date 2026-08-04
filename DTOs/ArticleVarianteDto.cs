using System.ComponentModel.DataAnnotations;

namespace example2.DTOs
{
    // DTO pour la création d'une variante
    public class ArticleVarianteCreateDto
    {
        [Required(ErrorMessage = "La désignation est obligatoire.")]
        [StringLength(200)]
        public string Designation { get; set; } = string.Empty;

        [Required]
        public int Id_Produit { get; set; }

        [Required]
        public int Id_PlageHoraire { get; set; }

        public decimal PrixVariante { get; set; }

        public decimal TauxTVA { get; set; } = 19;

        public decimal DureeDefaut { get; set; } = 30;

        public bool Actif { get; set; } = true;
    }

    // DTO pour la mise à jour (mêmes champs)
    public class ArticleVarianteUpdateDto : ArticleVarianteCreateDto { }

    // DTO de lecture enrichi avec les données des relations
    public class ArticleVarianteDto
    {
        public int Id_ArticleVariante { get; set; }
        public string Designation { get; set; } = string.Empty;
        public int Id_Produit { get; set; }
        public string NomProduit { get; set; } = string.Empty;
        public string CodeProduit { get; set; } = string.Empty;
        public int Id_PlageHoraire { get; set; }
        public string NomPlageHoraire { get; set; } = string.Empty;
        public string HeureDebut { get; set; } = string.Empty;
        public string HeureFin { get; set; } = string.Empty;
        public decimal PrixVariante { get; set; }
        public decimal TauxTVA { get; set; }
        public decimal DureeDefaut { get; set; }
        public bool Actif { get; set; }

        // Texte formaté pratique pour les SelectBox
        public string DisplayText => $"{Designation} – {NomPlageHoraire} ({HeureDebut}-{HeureFin})";
    }
}
