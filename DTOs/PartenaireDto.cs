using System.ComponentModel.DataAnnotations;

namespace example2.DTOs
{
    public class PartenaireCreateDto
    {
        public string Nom { get; set; } = string.Empty;

        public string Email { get; set; } = string.Empty;

        public string Entreprise { get; set; } = string.Empty;

        public string Telephone { get; set; } = string.Empty;
        
        public string Adresse { get; set; } = string.Empty;
    }

    public class PartenaireUpdateDto : PartenaireCreateDto
    {
    }

    public class PartenaireDto : PartenaireCreateDto
    {
        public int Id_Partenaire { get; set; }
    }
}
