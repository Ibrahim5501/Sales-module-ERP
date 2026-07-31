using System.ComponentModel.DataAnnotations;

namespace example2.DTOs
{
    public class PlageHoraireCreateDto
    {
        [Required(ErrorMessage = "Le nom est obligatoire.")]
        public string Nom { get; set; } = string.Empty;

        [Required(ErrorMessage = "L'heure de début est obligatoire.")]
        public string HeureDebut { get; set; } = "08:00";

        [Required(ErrorMessage = "L'heure de fin est obligatoire.")]
        public string HeureFin { get; set; } = "12:00";

        public string? Description { get; set; } = string.Empty;

        public bool Actif { get; set; } = true;
    }

    public class PlageHoraireUpdateDto : PlageHoraireCreateDto
    {
    }

    public class PlageHoraireDto : PlageHoraireCreateDto
    {
        public int Id_PlageHoraire { get; set; }
        public string DisplayText => string.IsNullOrWhiteSpace(Nom)
            ? $"{HeureDebut} - {HeureFin}"
            : $"{Nom} ({HeureDebut} - {HeureFin})";
    }
}
