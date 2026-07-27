using System;
using System.IO;
using System.Net;
using System.Net.Mail;
using System.Threading.Tasks;
using example2.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace example2.Services
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<EmailService> _logger;
        private readonly IWebHostEnvironment _env;

        public EmailService(IConfiguration configuration, ILogger<EmailService> logger, IWebHostEnvironment env)
        {
            _configuration = configuration;
            _logger = logger;
            _env = env;
        }

        public async Task<(bool Success, string Message)> SendDevisEmailAsync(string clientEmail, string clientName, Devis devis, byte[] pdfBytes)
        {
            if (string.IsNullOrWhiteSpace(clientEmail))
            {
                return (false, "L'adresse email du client est vide ou non renseignée dans sa fiche partenaire.");
            }

            var smtpSection = _configuration.GetSection("SmtpSettings");
            var host = smtpSection["Server"] ?? smtpSection["Host"] ?? "smtp.gmail.com";
            var port = int.TryParse(smtpSection["Port"], out int p) ? p : 587;
            var senderEmail = smtpSection["SenderEmail"] ?? "noreply@digierp.com";
            var senderName = smtpSection["SenderName"] ?? "DIGI ERP";
            var username = smtpSection["Username"] ?? "noreply@digierp.com";
            var password = smtpSection["Password"] ?? "";
            var enableSsl = bool.TryParse(smtpSection["EnableSsl"], out bool ssl) ? ssl : true;

            var mail = new MailMessage();
            mail.From = new MailAddress(senderEmail, senderName);
            try
            {
                mail.To.Add(new MailAddress(clientEmail, clientName));
            }
            catch
            {
                mail.To.Add(new MailAddress(clientEmail));
            }

            mail.Subject = $"[DIGI ERP] Devis n° {devis.NumeroDevis} - Proforma";
            mail.IsBodyHtml = true;

            mail.Body = $@"
                <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;'>
                    <h2 style='color: #2563eb; margin-top: 0;'>DIGI ERP - Devis Commercial</h2>
                    <p>Bonjour <strong>{WebUtility.HtmlEncode(clientName)}</strong>,</p>
                    <p>Veuillez trouver ci-joint votre devis <strong>n° {devis.NumeroDevis}</strong> d'un montant total de <strong>{devis.MontantTTC:N2} TND</strong> TTC.</p>
                    <table style='width: 100%; border-collapse: collapse; margin: 20px 0;'>
                        <tr style='background: #f8fafc;'>
                            <th style='padding: 8px; text-align: left; border-bottom: 1px solid #cbd5e1;'>Champ</th>
                            <th style='padding: 8px; text-align: left; border-bottom: 1px solid #cbd5e1;'>Détail</th>
                        </tr>
                        <tr>
                            <td style='padding: 8px; border-bottom: 1px solid #e2e8f0;'>Numéro Devis</td>
                            <td style='padding: 8px; border-bottom: 1px solid #e2e8f0;'><strong>{devis.NumeroDevis}</strong></td>
                        </tr>
                        <tr>
                            <td style='padding: 8px; border-bottom: 1px solid #e2e8f0;'>Date Devis</td>
                            <td style='padding: 8px; border-bottom: 1px solid #e2e8f0;'>{devis.DateDevis:dd/MM/yyyy}</td>
                        </tr>
                        <tr>
                            <td style='padding: 8px; border-bottom: 1px solid #e2e8f0;'>Date de Validité</td>
                            <td style='padding: 8px; border-bottom: 1px solid #e2e8f0;'>{devis.DateValidite:dd/MM/yyyy}</td>
                        </tr>
                        <tr>
                            <td style='padding: 8px; border-bottom: 1px solid #e2e8f0;'>Montant TTC</td>
                            <td style='padding: 8px; border-bottom: 1px solid #e2e8f0; color: #2563eb;'><strong>{devis.MontantTTC:N2} TND</strong></td>
                        </tr>
                    </table>
                    <p>Le document officiel au format PDF est disponible en pièce jointe.</p>
                    <hr style='border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;' />
                    <p style='font-size: 12px; color: #64748b;'>Cet e-mail a été généré automatiquement par l'application DIGI ERP.</p>
                </div>";

            if (pdfBytes != null && pdfBytes.Length > 0)
            {
                var fileName = $"Devis_{devis.NumeroDevis ?? devis.Id_Devis.ToString()}.pdf";
                mail.Attachments.Add(new Attachment(new MemoryStream(pdfBytes), fileName, "application/pdf"));
            }

            // Always save a local preview copy in wwwroot/sent_emails/
            try
            {
                var emailFolder = Path.Combine(_env.WebRootPath, "sent_emails");
                if (!Directory.Exists(emailFolder)) Directory.CreateDirectory(emailFolder);
                
                var htmlPath = Path.Combine(emailFolder, $"Devis_{devis.NumeroDevis ?? devis.Id_Devis.ToString()}.html");
                await File.WriteAllTextAsync(htmlPath, mail.Body);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not write email local preview copy.");
            }

            // If SMTP credentials are missing, notify the user explicitly
            if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
            {
                _logger.LogWarning("SMTP credentials missing in appsettings.json. Email to {ClientEmail} was saved locally.", clientEmail);
                return (false, $"Configuration SMTP manquante dans appsettings.json. Renseignez 'Username' et 'Password' pour l'envoi vers {clientEmail}. (Copie enregistrée dans wwwroot/sent_emails)");
            }

            try
            {
                using var smtp = new SmtpClient(host, port)
                {
                    Credentials = new NetworkCredential(username, password),
                    EnableSsl = enableSsl,
                    Timeout = 15000 // 15 seconds
                };

                await smtp.SendMailAsync(mail);
                _logger.LogInformation("Email successfully delivered to {ClientEmail} for Devis {NumeroDevis}", clientEmail, devis.NumeroDevis);
                return (true, $"E-mail envoyé avec succès à {clientEmail} !");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to deliver email to {ClientEmail} via SMTP ({Host}:{Port})", clientEmail, host, port);
                return (false, $"Échec d'envoi SMTP à {clientEmail}: {ex.Message}. Vérifiez vos identifiants SMTP.");
            }
        }
    }
}
