namespace example2.DTOs
{
    public class LivraisonLigneDto
    {
        public int Id_LivraisonLigne { get; set; }
        public int Id_Produit { get; set; }
        public string? Designation { get; set; }
        public decimal QteCommande { get; set; }
        public decimal QteReserve { get; set; }
        public decimal QteFait { get; set; }
    }
}
