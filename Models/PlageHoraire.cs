using System.ComponentModel.DataAnnotations;

namespace example2.Models
{
    public class PlageHoraire
    {
        [Key]
        public int Id_PlageHoraire { get; set; }

        [Required]
        [StringLength(100)]
        public string Nom { get; set; } = string.Empty;

        [Required]
        [StringLength(10)]
        public string HeureDebut { get; set; } = "00:00";

        [Required]
        [StringLength(10)]
        public string HeureFin { get; set; } = "00:00";

        public string? Description { get; set; }

        public bool Actif { get; set; } = true;
    }
}
