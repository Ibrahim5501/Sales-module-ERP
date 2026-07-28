using example2.Models;

namespace example2.Services
{
    public interface IPdfService
    {
        byte[] GenerateDevisPdf(Devis devis);
        byte[] GenerateCommandePdf(Commande commande);
        byte[] GenerateLivraisonPdf(Livraison livraison);
        string SaveDevisPdf(Devis devis, string webRootPath);
        string SaveCommandePdf(Commande commande, string webRootPath);
        string SaveLivraisonPdf(Livraison livraison, string webRootPath);
    }
}
