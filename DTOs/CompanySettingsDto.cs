namespace example2.DTOs
{
    public class CompanySettingsDto
    {
        public int Id { get; set; }
        public string NomEntreprise { get; set; } = "DIGI ERP";
        public string? Activite { get; set; }
        public string? Adresse { get; set; }
        public string? Telephone { get; set; }
        public string? Email { get; set; }
        public string? MatriculeFiscal { get; set; }
        public string? RIB { get; set; }
        public string? LogoUrl { get; set; }
        public string? PiedDePage { get; set; }
    }
}
