using System.ComponentModel.DataAnnotations;

namespace example2.Models
{
    public class CompanySettings
    {
        [Key]
        public int Id { get; set; }

        public string NomEntreprise { get; set; } = "DIGI ERP";

        public string? Activite { get; set; } = "Module de Ventes & Distribution";

        public string? Adresse { get; set; } = "Avenue Habib Bourguiba, Tunis";

        public string? Telephone { get; set; } = "+216 71 000 000";

        public string? Email { get; set; } = "contact@digierp.tn";

        public string? MatriculeFiscal { get; set; } = "1234567/A/M/000";

        public string? RIB { get; set; } = "01 234 567890123456789 01";

        public string? LogoUrl { get; set; } = "";

        public string? PiedDePage { get; set; } = "DIGI ERP - Document généré automatiquement";
    }
}
