using System.Threading.Tasks;
using example2.Models;

namespace example2.Services
{
    public interface IEmailService
    {
        Task<(bool Success, string Message)> SendDevisEmailAsync(string clientEmail, string clientName, Devis devis, byte[] pdfBytes);
    }
}
