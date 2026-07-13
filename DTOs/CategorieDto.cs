using System.ComponentModel.DataAnnotations;

namespace example2.DTOs
{
    public class CategorieCreateDto
    {
        public string Nom { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public bool Actif { get; set; }
    }

    public class CategorieUpdateDto : CategorieCreateDto
    {
    }

    public class CategorieDto : CategorieCreateDto
    {
        public int Id_Categorie { get; set; }

    }
}
