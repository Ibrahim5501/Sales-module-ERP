using System;
using System.IO;
using System.Linq;
using example2.Data;
using example2.Models;
using Microsoft.AspNetCore.Hosting;
using PdfSharpCore.Drawing;
using PdfSharpCore.Pdf;

namespace example2.Services
{
    public class PdfService : IPdfService
    {
        private readonly ApplicationDbContext _context;
        private readonly IWebHostEnvironment _env;

        public PdfService(ApplicationDbContext context, IWebHostEnvironment env)
        {
            _context = context;
            _env = env;
        }

        private CompanySettings GetCompanySettings()
        {
            try
            {
                return _context.CompanySettings.FirstOrDefault() ?? new CompanySettings();
            }
            catch
            {
                return new CompanySettings();
            }
        }

        public byte[] GenerateDevisPdf(Devis devis)
        {
            var company = GetCompanySettings();

            using var stream = new MemoryStream();
            var document = new PdfDocument();
            document.Info.Title = $"Devis {devis.NumeroDevis}";
            
            var page = document.AddPage();
            page.Size = PdfSharpCore.PageSize.A4;
            var gfx = XGraphics.FromPdfPage(page);

            // Colors
            var primaryColor = XColor.FromArgb(30, 41, 59); // Deep Slate
            var accentColor = XColor.FromArgb(37, 99, 235);  // Royal Blue
            var textColor = XColor.FromArgb(51, 65, 85);    // Dark Charcoal
            var lightBg = XColor.FromArgb(241, 245, 249);   // Light Gray

            // Fonts
            var fontTitle = new XFont("Arial", 20, XFontStyle.Bold);
            var fontHeader = new XFont("Arial", 11, XFontStyle.Bold);
            var fontBody = new XFont("Arial", 9, XFontStyle.Regular);
            var fontBold = new XFont("Arial", 9, XFontStyle.Bold);
            var fontSmall = new XFont("Arial", 8, XFontStyle.Italic);

            double yPos = 40;
            double margin = 40;
            double pageWidth = page.Width.Point - (margin * 2);

            // --- LOGO & HEADER ---
            double headerHeight = 60;
            bool logoDrawn = false;
            if (!string.IsNullOrEmpty(company.LogoUrl))
            {
                try
                {
                    string relativePath = company.LogoUrl.TrimStart('/', '\\');
                    string fullLogoPath = Path.Combine(_env.WebRootPath, relativePath);
                    if (File.Exists(fullLogoPath))
                    {
                        using var logoImage = XImage.FromFile(fullLogoPath);
                        gfx.DrawImage(logoImage, margin, yPos - 10, 120, 50);
                        logoDrawn = true;
                    }
                }
                catch { }
            }

            if (!logoDrawn)
            {
                gfx.DrawString(company.NomEntreprise, new XFont("Arial", 20, XFontStyle.Bold), new XSolidBrush(accentColor), margin, yPos + 10);
            }

            // Right header title
            gfx.DrawString("DEVIS", fontTitle, new XSolidBrush(primaryColor), page.Width.Point - margin - 80, yPos);
            gfx.DrawString($"N°: {devis.NumeroDevis ?? $"DEV-{devis.Id_Devis}"}", fontHeader, new XSolidBrush(textColor), page.Width.Point - margin - 130, yPos + 22);

            yPos += 30;
            if (logoDrawn)
            {
                gfx.DrawString(company.NomEntreprise, fontHeader, new XSolidBrush(primaryColor), margin, yPos + 15);
                yPos += 30;
            }
            if (!string.IsNullOrEmpty(company.Activite))
            {
                gfx.DrawString(company.Activite, fontSmall, new XSolidBrush(textColor), margin, yPos);
                yPos += 14;
            }

            yPos += 10;
            // Line separator
            gfx.DrawLine(new XPen(accentColor, 2), margin, yPos, page.Width.Point - margin, yPos);
            yPos += 15;

            // --- METADATA & CLIENT INFO BOX ---
            double boxWidth = (pageWidth - 20) / 2;
            
            // Left Box: Devis Info
            gfx.DrawRectangle(new XSolidBrush(lightBg), margin, yPos, boxWidth, 90);
            gfx.DrawRectangle(new XPen(XColor.FromArgb(226, 232, 240)), margin, yPos, boxWidth, 90);
            
            double boxY = yPos + 15;
            gfx.DrawString("INFORMATIONS DEVIS", fontHeader, new XSolidBrush(primaryColor), margin + 10, boxY);
            boxY += 16;
            gfx.DrawString($"Date du devis: {devis.DateDevis:dd/MM/yyyy}", fontBody, new XSolidBrush(textColor), margin + 10, boxY);
            boxY += 14;
            gfx.DrawString($"Validité jusqu'au: {devis.DateValidite:dd/MM/yyyy}", fontBody, new XSolidBrush(textColor), margin + 10, boxY);
            boxY += 14;
            gfx.DrawString($"Statut: {devis.Statut}", fontBody, new XSolidBrush(textColor), margin + 10, boxY);
            boxY += 14;
            gfx.DrawString($"Mode de paiement: {devis.ModePaiement ?? "Virement Bancaire"}", fontBody, new XSolidBrush(textColor), margin + 10, boxY);

            // Right Box: Client Info
            double rightBoxX = margin + boxWidth + 20;
            gfx.DrawRectangle(new XSolidBrush(lightBg), rightBoxX, yPos, boxWidth, 90);
            gfx.DrawRectangle(new XPen(XColor.FromArgb(226, 232, 240)), rightBoxX, yPos, boxWidth, 90);
            
            boxY = yPos + 15;
            gfx.DrawString("CLIENT", fontHeader, new XSolidBrush(primaryColor), rightBoxX + 10, boxY);
            boxY += 16;
            string clientNom = devis.Partenaire != null ? $"{devis.Partenaire.Nom} ({devis.Partenaire.Entreprise})" : $"Partenaire #{devis.Id_Partenaire}";
            gfx.DrawString(Truncate(clientNom, 35), fontBold, new XSolidBrush(textColor), rightBoxX + 10, boxY);
            boxY += 14;
            gfx.DrawString($"Email: {devis.Partenaire?.Email ?? "N/A"}", fontBody, new XSolidBrush(textColor), rightBoxX + 10, boxY);
            boxY += 14;
            gfx.DrawString($"Tél: {devis.Partenaire?.Telephone ?? "N/A"}", fontBody, new XSolidBrush(textColor), rightBoxX + 10, boxY);
            boxY += 14;
            gfx.DrawString($"Adresse: {Truncate(devis.AdresseFacturation ?? devis.Partenaire?.Adresse ?? "N/A", 30)}", fontBody, new XSolidBrush(textColor), rightBoxX + 10, boxY);

            yPos += 105;

            // --- TABLE HEADERS ---
            gfx.DrawRectangle(new XSolidBrush(primaryColor), margin, yPos, pageWidth, 22);
            
            double xDesc = margin + 10;
            double xQte = margin + 200;
            double xPrix = margin + 250;
            double xRem = margin + 340;
            double xTva = margin + 400;
            double xTotal = margin + 450;

            gfx.DrawString("Désignation / Description", fontHeader, XBrushes.White, xDesc, yPos + 15);
            gfx.DrawString("Qté", fontHeader, XBrushes.White, xQte, yPos + 15);
            gfx.DrawString("P.U (TND)", fontHeader, XBrushes.White, xPrix, yPos + 15);
            gfx.DrawString("Rem.", fontHeader, XBrushes.White, xRem, yPos + 15);
            gfx.DrawString("TVA", fontHeader, XBrushes.White, xTva, yPos + 15);
            gfx.DrawString("Total HT", fontHeader, XBrushes.White, xTotal, yPos + 15);

            yPos += 22;

            // --- TABLE ROWS ---
            bool alt = false;
            decimal subtotalHTLines = 0;

            foreach (var ligne in devis.Lignes)
            {
                if (alt)
                {
                    gfx.DrawRectangle(new XSolidBrush(lightBg), margin, yPos, pageWidth, 20);
                }
                
                string desc = !string.IsNullOrEmpty(ligne.Description) 
                    ? ligne.Description 
                    : (ligne.Produit?.Designation ?? "Spot Publicitaire");

                if (!string.IsNullOrEmpty(ligne.Emission))
                {
                    desc += $" [{ligne.Emission}]";
                }

                string remStr = ligne.TypeRemise == "MontantFixe" 
                    ? $"{ligne.Remise:N3} DT" 
                    : $"{ligne.Remise:0.##}%";

                gfx.DrawString(Truncate(desc, 34), fontBody, new XSolidBrush(textColor), xDesc, yPos + 14);
                gfx.DrawString(ligne.Quantite.ToString("0.##") + " sec", fontBody, new XSolidBrush(textColor), xQte, yPos + 14);
                gfx.DrawString(ligne.PrixUniversitaire.ToString("N3"), fontBody, new XSolidBrush(textColor), xPrix, yPos + 14);
                gfx.DrawString(remStr, fontBody, new XSolidBrush(textColor), xRem, yPos + 14);
                gfx.DrawString($"{ligne.TauxTVA:0}%", fontBody, new XSolidBrush(textColor), xTva, yPos + 14);
                gfx.DrawString($"{ligne.MontantHT:N3} TND", fontBold, new XSolidBrush(textColor), xTotal, yPos + 14);

                subtotalHTLines += ligne.MontantHT;
                yPos += 20;
                alt = !alt;
            }

            gfx.DrawLine(new XPen(XColor.FromArgb(203, 213, 225), 1), margin, yPos, page.Width.Point - margin, yPos);
            yPos += 15;

            // --- TOTALS BOX ---
            double totalsWidth = 230;
            double totalsX = page.Width.Point - margin - totalsWidth;
            bool hasGlobalRemise = devis.RemiseGlobale > 0;
            double totalsBoxHeight = hasGlobalRemise ? 95 : 75;

            gfx.DrawRectangle(new XSolidBrush(lightBg), totalsX, yPos, totalsWidth, totalsBoxHeight);
            gfx.DrawRectangle(new XPen(XColor.FromArgb(226, 232, 240)), totalsX, yPos, totalsWidth, totalsBoxHeight);

            double tY = yPos + 16;
            if (hasGlobalRemise)
            {
                gfx.DrawString("Sous-Total HT:", fontBody, new XSolidBrush(textColor), totalsX + 10, tY);
                gfx.DrawString($"{subtotalHTLines:N3} TND", fontBold, new XSolidBrush(textColor), totalsX + 125, tY);
                tY += 16;

                string remGlobaleLabel = devis.TypeRemiseGlobale == "MontantFixe"
                    ? $"Remise glob. ({devis.RemiseGlobale:N3} DT):"
                    : $"Remise glob. ({devis.RemiseGlobale:0.##}%):";
                decimal remiseAmount = subtotalHTLines - devis.MontantHT;

                gfx.DrawString(remGlobaleLabel, fontBody, new XSolidBrush(textColor), totalsX + 10, tY);
                gfx.DrawString($"-{remiseAmount:N3} TND", fontBold, new XSolidBrush(textColor), totalsX + 125, tY);
                tY += 16;

                gfx.DrawString("Net HT:", fontBody, new XSolidBrush(textColor), totalsX + 10, tY);
                gfx.DrawString($"{devis.MontantHT:N3} TND", fontBold, new XSolidBrush(textColor), totalsX + 125, tY);
                tY += 16;
            }
            else
            {
                gfx.DrawString("Total HT:", fontBody, new XSolidBrush(textColor), totalsX + 10, tY);
                gfx.DrawString($"{devis.MontantHT:N3} TND", fontBold, new XSolidBrush(textColor), totalsX + 125, tY);
                tY += 18;
            }

            gfx.DrawString("Total TVA:", fontBody, new XSolidBrush(textColor), totalsX + 10, tY);
            gfx.DrawString($"{devis.MontantTVA:N3} TND", fontBold, new XSolidBrush(textColor), totalsX + 125, tY);

            tY += 20;
            gfx.DrawLine(new XPen(accentColor, 1), totalsX + 10, tY - 12, totalsX + totalsWidth - 10, tY - 12);
            gfx.DrawString("Total TTC:", fontHeader, new XSolidBrush(primaryColor), totalsX + 10, tY);
            gfx.DrawString($"{devis.MontantTTC:N3} TND", fontHeader, new XSolidBrush(accentColor), totalsX + 115, tY);

            // --- MONTANT EN MOTS (EN FRANÇAIS) ---
            double textWordsY = Math.Max(yPos + totalsBoxHeight + 15, yPos + 80);
            string words = FrenchNumberToWordsConverter.ConvertToFrenchWords(devis.MontantTTC);
            string phraseWords = $"Arrêté le présent devis à la somme de : {words}.";

            gfx.DrawRectangle(new XSolidBrush(XColor.FromArgb(248, 250, 252)), margin, textWordsY, pageWidth, 28);
            gfx.DrawRectangle(new XPen(XColor.FromArgb(203, 213, 225)), margin, textWordsY, pageWidth, 28);
            gfx.DrawString(phraseWords, fontBold, new XSolidBrush(primaryColor), margin + 10, textWordsY + 18);

            // --- FOOTER ---
            double footerY = page.Height.Point - 35;
            gfx.DrawLine(new XPen(XColor.FromArgb(226, 232, 240), 1), margin, footerY - 10, page.Width.Point - margin, footerY - 10);
            
            string footerText = company.PiedDePage ?? "DIGI ERP - Document généré automatiquement";
            if (!string.IsNullOrEmpty(company.MatriculeFiscal))
            {
                footerText += $" | MF: {company.MatriculeFiscal}";
            }
            if (!string.IsNullOrEmpty(company.RIB))
            {
                footerText += $" | RIB: {company.RIB}";
            }

            gfx.DrawString(Truncate(footerText, 110), fontSmall, new XSolidBrush(textColor), margin, footerY);
            gfx.DrawString("Page 1 sur 1", fontSmall, new XSolidBrush(textColor), page.Width.Point - margin - 50, footerY);

            document.Save(stream, false);
            return stream.ToArray();
        }

        public byte[] GenerateCommandePdf(Commande commande)
        {
            var company = GetCompanySettings();

            using var stream = new MemoryStream();
            var document = new PdfDocument();
            document.Info.Title = $"Commande {commande.NumeroCommande}";
            
            var page = document.AddPage();
            page.Size = PdfSharpCore.PageSize.A4;
            var gfx = XGraphics.FromPdfPage(page);

            // Colors
            var primaryColor = XColor.FromArgb(15, 23, 42); // Very Dark Slate
            var accentColor = XColor.FromArgb(16, 185, 129); // Emerald Green
            var textColor = XColor.FromArgb(51, 65, 85);    // Dark Charcoal
            var lightBg = XColor.FromArgb(241, 245, 249);   // Light Gray

            // Fonts
            var fontTitle = new XFont("Arial", 20, XFontStyle.Bold);
            var fontHeader = new XFont("Arial", 11, XFontStyle.Bold);
            var fontBody = new XFont("Arial", 9, XFontStyle.Regular);
            var fontBold = new XFont("Arial", 9, XFontStyle.Bold);
            var fontSmall = new XFont("Arial", 8, XFontStyle.Italic);

            double yPos = 40;
            double margin = 40;
            double pageWidth = page.Width.Point - (margin * 2);

            // --- LOGO & HEADER ---
            double headerHeight = 60;
            bool logoDrawn = false;
            if (!string.IsNullOrEmpty(company.LogoUrl))
            {
                try
                {
                    string relativePath = company.LogoUrl.TrimStart('/', '\\');
                    string fullLogoPath = Path.Combine(_env.WebRootPath, relativePath);
                    if (File.Exists(fullLogoPath))
                    {
                        using var logoImage = XImage.FromFile(fullLogoPath);
                        gfx.DrawImage(logoImage, margin, yPos - 10, 120, 50);
                        logoDrawn = true;
                    }
                }
                catch { }
            }

            if (!logoDrawn)
            {
                gfx.DrawString(company.NomEntreprise, new XFont("Arial", 20, XFontStyle.Bold), new XSolidBrush(accentColor), margin, yPos + 10);
            }

            // Right header title
            gfx.DrawString("BON DE COMMANDE", fontTitle, new XSolidBrush(primaryColor), page.Width.Point - margin - 180, yPos);
            gfx.DrawString($"N°: {commande.NumeroCommande ?? $"CMD-{commande.Id_Commande}"}", fontHeader, new XSolidBrush(textColor), page.Width.Point - margin - 130, yPos + 22);

            yPos += 30;
            if (logoDrawn)
            {
                gfx.DrawString(company.NomEntreprise, fontHeader, new XSolidBrush(primaryColor), margin, yPos + 15);
                yPos += 30;
            }
            if (!string.IsNullOrEmpty(company.Activite))
            {
                gfx.DrawString(company.Activite, fontSmall, new XSolidBrush(textColor), margin, yPos);
                yPos += 14;
            }

            yPos += 10;
            // Line separator
            gfx.DrawLine(new XPen(accentColor, 2), margin, yPos, page.Width.Point - margin, yPos);
            yPos += 15;

            // --- METADATA & CLIENT INFO BOX ---
            double boxWidth = (pageWidth - 20) / 2;
            
            // Left Box: Commande Info
            gfx.DrawRectangle(new XSolidBrush(lightBg), margin, yPos, boxWidth, 90);
            gfx.DrawRectangle(new XPen(XColor.FromArgb(226, 232, 240)), margin, yPos, boxWidth, 90);
            
            double boxY = yPos + 15;
            gfx.DrawString("INFORMATIONS COMMANDE", fontHeader, new XSolidBrush(primaryColor), margin + 10, boxY);
            boxY += 16;
            gfx.DrawString($"Date commande: {commande.DateCommande:dd/MM/yyyy}", fontBody, new XSolidBrush(textColor), margin + 10, boxY);
            boxY += 14;
            gfx.DrawString($"Statut: {commande.Statut}", fontBody, new XSolidBrush(textColor), margin + 10, boxY);
            boxY += 14;
            string refDevis = commande.Devis != null ? commande.Devis.NumeroDevis : "N/A";
            gfx.DrawString($"Réf. Devis: {refDevis}", fontBody, new XSolidBrush(textColor), margin + 10, boxY);
            boxY += 14;
            string modePaiement = commande.Devis != null && !string.IsNullOrEmpty(commande.Devis.ModePaiement) ? commande.Devis.ModePaiement : "Virement Bancaire";
            gfx.DrawString($"Mode de paiement: {modePaiement}", fontBody, new XSolidBrush(textColor), margin + 10, boxY);

            // Right Box: Client Info
            double rightBoxX = margin + boxWidth + 20;
            gfx.DrawRectangle(new XSolidBrush(lightBg), rightBoxX, yPos, boxWidth, 90);
            gfx.DrawRectangle(new XPen(XColor.FromArgb(226, 232, 240)), rightBoxX, yPos, boxWidth, 90);
            
            boxY = yPos + 15;
            gfx.DrawString("CLIENT", fontHeader, new XSolidBrush(primaryColor), rightBoxX + 10, boxY);
            boxY += 16;
            string clientNom = commande.Partenaire != null ? $"{commande.Partenaire.Nom} ({commande.Partenaire.Entreprise})" : $"Partenaire #{commande.Id_Partenaire}";
            gfx.DrawString(Truncate(clientNom, 35), fontBold, new XSolidBrush(textColor), rightBoxX + 10, boxY);
            boxY += 14;
            gfx.DrawString($"Email: {commande.Partenaire?.Email ?? "N/A"}", fontBody, new XSolidBrush(textColor), rightBoxX + 10, boxY);
            boxY += 14;
            gfx.DrawString($"Tél: {commande.Partenaire?.Telephone ?? "N/A"}", fontBody, new XSolidBrush(textColor), rightBoxX + 10, boxY);
            boxY += 14;
            gfx.DrawString($"Adresse: {Truncate(commande.Partenaire?.Adresse ?? "N/A", 30)}", fontBody, new XSolidBrush(textColor), rightBoxX + 10, boxY);

            yPos += 105;

            // --- TABLE HEADERS ---
            gfx.DrawRectangle(new XSolidBrush(primaryColor), margin, yPos, pageWidth, 22);
            
            double xDesc = margin + 10;
            double xQte = margin + 200;
            double xPrix = margin + 250;
            double xRem = margin + 340;
            double xTva = margin + 400;
            double xTotal = margin + 450;

            gfx.DrawString("Désignation / Spot Publicitaire", fontHeader, XBrushes.White, xDesc, yPos + 15);
            gfx.DrawString("Sec.", fontHeader, XBrushes.White, xQte, yPos + 15);
            gfx.DrawString("P.U (TND)", fontHeader, XBrushes.White, xPrix, yPos + 15);
            //gfx.DrawString("Rem.", fontHeader, XBrushes.White, xRem, yPos + 15);
            gfx.DrawString("TVA", fontHeader, XBrushes.White, xTva, yPos + 15);
            gfx.DrawString("Total HT", fontHeader, XBrushes.White, xTotal, yPos + 15);

            yPos += 22;

            // --- TABLE ROWS ---
            bool alt = false;
            foreach (var ligne in commande.Lignes)
            {
                if (alt)
                {
                    gfx.DrawRectangle(new XSolidBrush(lightBg), margin, yPos, pageWidth, 20);
                }
                
                string desc = !string.IsNullOrEmpty(ligne.Description)
                    ? ligne.Description
                    : (ligne.Produit?.Designation ?? "Spot Publicitaire");

                if (!string.IsNullOrEmpty(ligne.Emission))
                    desc += $" [{ligne.Emission}]";

                string remStr = ligne.Remise > 0 ? $"{ligne.Remise:0.##}%" : "-";

                gfx.DrawString(Truncate(desc, 34), fontBody, new XSolidBrush(textColor), xDesc, yPos + 14);
                gfx.DrawString(ligne.Quantite.ToString("0.##") + " sec", fontBody, new XSolidBrush(textColor), xQte, yPos + 14);
                gfx.DrawString(ligne.PrixUniversitaire.ToString("N3"), fontBody, new XSolidBrush(textColor), xPrix, yPos + 14);
                //gfx.DrawString(remStr, fontBody, new XSolidBrush(textColor), xRem, yPos + 14);
                gfx.DrawString($"{ligne.TauxTVA:0}%", fontBody, new XSolidBrush(textColor), xTva, yPos + 14);
                gfx.DrawString($"{ligne.MontantHT:N3} TND", fontBold, new XSolidBrush(textColor), xTotal, yPos + 14);

                yPos += 20;
                alt = !alt;
            }

            gfx.DrawLine(new XPen(XColor.FromArgb(203, 213, 225), 1), margin, yPos, page.Width.Point - margin, yPos);
            yPos += 15;

            // --- TOTALS BOX ---
            double totalsWidth = 230;
            double totalsX = page.Width.Point - margin - totalsWidth;
            double totalsBoxHeight = 75;

            gfx.DrawRectangle(new XSolidBrush(lightBg), totalsX, yPos, totalsWidth, totalsBoxHeight);
            gfx.DrawRectangle(new XPen(XColor.FromArgb(226, 232, 240)), totalsX, yPos, totalsWidth, totalsBoxHeight);

            double tY = yPos + 18;
            gfx.DrawString("Total HT:", fontBody, new XSolidBrush(textColor), totalsX + 10, tY);
            gfx.DrawString($"{commande.MontantHT:N3} TND", fontBold, new XSolidBrush(textColor), totalsX + 125, tY);

            tY += 18;
            gfx.DrawString("Total TVA:", fontBody, new XSolidBrush(textColor), totalsX + 10, tY);
            gfx.DrawString($"{commande.MontantTVA:N3} TND", fontBold, new XSolidBrush(textColor), totalsX + 125, tY);

            tY += 20;
            gfx.DrawLine(new XPen(accentColor, 1), totalsX + 10, tY - 12, totalsX + totalsWidth - 10, tY - 12);
            gfx.DrawString("Total TTC:", fontHeader, new XSolidBrush(primaryColor), totalsX + 10, tY);
            gfx.DrawString($"{commande.MontantTTC:N3} TND", fontHeader, new XSolidBrush(accentColor), totalsX + 115, tY);

            // --- MONTANT EN MOTS (EN FRANÇAIS) ---
            double textWordsY = Math.Max(yPos + totalsBoxHeight + 15, yPos + 80);
            string words = FrenchNumberToWordsConverter.ConvertToFrenchWords(commande.MontantTTC);
            string phraseWords = $"Arrêté le présent bon de commande à la somme de : {words}.";

            gfx.DrawRectangle(new XSolidBrush(XColor.FromArgb(248, 250, 252)), margin, textWordsY, pageWidth, 28);
            gfx.DrawRectangle(new XPen(XColor.FromArgb(203, 213, 225)), margin, textWordsY, pageWidth, 28);
            gfx.DrawString(phraseWords, fontBold, new XSolidBrush(primaryColor), margin + 10, textWordsY + 18);

            // --- FOOTER ---
            double footerY = page.Height.Point - 35;
            gfx.DrawLine(new XPen(XColor.FromArgb(226, 232, 240), 1), margin, footerY - 10, page.Width.Point - margin, footerY - 10);
            
            string footerText = company.PiedDePage ?? "DIGI ERP - Document généré automatiquement";
            if (!string.IsNullOrEmpty(company.MatriculeFiscal))
            {
                footerText += $" | MF: {company.MatriculeFiscal}";
            }
            if (!string.IsNullOrEmpty(company.RIB))
            {
                footerText += $" | RIB: {company.RIB}";
            }

            gfx.DrawString(Truncate(footerText, 110), fontSmall, new XSolidBrush(textColor), margin, footerY);
            gfx.DrawString("Page 1 sur 1", fontSmall, new XSolidBrush(textColor), page.Width.Point - margin - 50, footerY);

            document.Save(stream, false);
            return stream.ToArray();
        }

        public string SaveDevisPdf(Devis devis, string webRootPath)
        {
            var pdfBytes = GenerateDevisPdf(devis);
            var folder = Path.Combine(webRootPath, "pdfs", "devis");
            if (!Directory.Exists(folder))
            {
                Directory.CreateDirectory(folder);
            }
            var fileName = $"Devis_{devis.NumeroDevis ?? devis.Id_Devis.ToString()}.pdf";
            var filePath = Path.Combine(folder, fileName);
            File.WriteAllBytes(filePath, pdfBytes);
            return $"/pdfs/devis/{fileName}";
        }

        public string SaveCommandePdf(Commande commande, string webRootPath)
        {
            var pdfBytes = GenerateCommandePdf(commande);
            var folder = Path.Combine(webRootPath, "pdfs", "commandes");
            if (!Directory.Exists(folder))
            {
                Directory.CreateDirectory(folder);
            }
            var fileName = $"Commande_{commande.NumeroCommande ?? commande.Id_Commande.ToString()}.pdf";
            var filePath = Path.Combine(folder, fileName);
            File.WriteAllBytes(filePath, pdfBytes);
            return $"/pdfs/commandes/{fileName}";
        }

        public string SaveLivraisonPdf(Livraison livraison, string webRootPath)
        {
            var pdfBytes = GenerateLivraisonPdf(livraison);
            var folder = Path.Combine(webRootPath, "pdfs", "livraisons");
            if (!Directory.Exists(folder))
                Directory.CreateDirectory(folder);
            var fileName = $"Livraison_{livraison.NumeroLivraison ?? livraison.Id_Livraison.ToString()}.pdf";
            var filePath = Path.Combine(folder, fileName);
            File.WriteAllBytes(filePath, pdfBytes);
            return $"/pdfs/livraisons/{fileName}";
        }

        public byte[] GenerateLivraisonPdf(Livraison livraison)
        {
            var company = GetCompanySettings();

            using var stream = new MemoryStream();
            var document = new PdfDocument();
            document.Info.Title = $"Bon de Livraison {livraison.NumeroLivraison}";

            var page = document.AddPage();
            page.Size = PdfSharpCore.PageSize.A4;
            var gfx = XGraphics.FromPdfPage(page);

            // Colors
            var primaryColor = XColor.FromArgb(15, 23, 42);     // Dark Slate
            var accentColor  = XColor.FromArgb(124, 58, 237);   // Purple
            var textColor    = XColor.FromArgb(51, 65, 85);
            var lightBg      = XColor.FromArgb(245, 243, 255);  // Light purple tint

            // Fonts
            var fontTitle  = new XFont("Arial", 20, XFontStyle.Bold);
            var fontHeader = new XFont("Arial", 11, XFontStyle.Bold);
            var fontBody   = new XFont("Arial",  9, XFontStyle.Regular);
            var fontBold   = new XFont("Arial",  9, XFontStyle.Bold);
            var fontSmall  = new XFont("Arial",  8, XFontStyle.Italic);

            double yPos      = 40;
            double margin    = 40;
            double pageWidth = page.Width.Point - (margin * 2);

            // ---- HEADER ----
            gfx.DrawString(company.NomEntreprise, new XFont("Arial", 22, XFontStyle.Bold), new XSolidBrush(accentColor), margin, yPos);
            gfx.DrawString("BON DE LIVRAISON", fontTitle, new XSolidBrush(primaryColor), page.Width.Point - margin - 200, yPos);
            yPos += 25;

            gfx.DrawString(company.Activite ?? "Module de Ventes & Distribution", fontSmall, new XSolidBrush(textColor), margin, yPos);
            gfx.DrawString($"N°: {livraison.NumeroLivraison ?? $"LIV-{livraison.Id_Livraison}"}", fontHeader, new XSolidBrush(textColor), page.Width.Point - margin - 160, yPos);
            yPos += 30;

            gfx.DrawLine(new XPen(accentColor, 2), margin, yPos, page.Width.Point - margin, yPos);
            yPos += 20;

            // ---- INFO BOXES ----
            double boxWidth = (pageWidth - 20) / 2;

            // Left box: Livraison Info
            gfx.DrawRectangle(new XSolidBrush(lightBg), margin, yPos, boxWidth, 90);
            gfx.DrawRectangle(new XPen(XColor.FromArgb(221, 214, 254)), margin, yPos, boxWidth, 90);
            double boxY = yPos + 15;
            gfx.DrawString("INFORMATIONS LIVRAISON", fontHeader, new XSolidBrush(primaryColor), margin + 10, boxY);
            boxY += 16;
            gfx.DrawString($"Date prévue:   {livraison.DatePrevue:dd/MM/yyyy}", fontBody, new XSolidBrush(textColor), margin + 10, boxY);
            boxY += 14;
            gfx.DrawString($"Date échéance: {livraison.DateEcheance:dd/MM/yyyy}", fontBody, new XSolidBrush(textColor), margin + 10, boxY);
            boxY += 14;
            gfx.DrawString($"Statut:        {livraison.Statut}", fontBody, new XSolidBrush(textColor), margin + 10, boxY);
            boxY += 14;
            if (livraison.Commande?.Devis != null)
                gfx.DrawString($"Devis origine: {livraison.Commande.Devis.NumeroDevis}", fontBody, new XSolidBrush(textColor), margin + 10, boxY);

            // Right box: Client + Delivery Address
            double rightBoxX = margin + boxWidth + 20;
            gfx.DrawRectangle(new XSolidBrush(lightBg), rightBoxX, yPos, boxWidth, 90);
            gfx.DrawRectangle(new XPen(XColor.FromArgb(221, 214, 254)), rightBoxX, yPos, boxWidth, 90);
            boxY = yPos + 15;
            gfx.DrawString("CLIENT & ADRESSE", fontHeader, new XSolidBrush(primaryColor), rightBoxX + 10, boxY);
            boxY += 16;
            string clientNom = livraison.Commande?.Partenaire != null
                ? $"{livraison.Commande.Partenaire.Nom} ({livraison.Commande.Partenaire.Entreprise})"
                : $"Commande #{livraison.Id_Commande}";
            gfx.DrawString(Truncate(clientNom, 35), fontBold, new XSolidBrush(textColor), rightBoxX + 10, boxY);
            boxY += 14;
            gfx.DrawString($"Adresse client:   {Truncate(livraison.Commande?.Partenaire?.Adresse ?? "N/A", 30)}", fontBody, new XSolidBrush(textColor), rightBoxX + 10, boxY);
            boxY += 14;
            gfx.DrawString($"Adresse livraison: {Truncate(livraison.Adresse, 28)}", fontBody, new XSolidBrush(textColor), rightBoxX + 10, boxY);

            yPos += 110;

            // ---- TABLE HEADER ----
            gfx.DrawRectangle(new XSolidBrush(primaryColor), margin, yPos, pageWidth, 22);

            double xProd  = margin + 10;
            double xQteC  = margin + pageWidth - 200;
            double xQteL  = margin + pageWidth - 100;

            gfx.DrawString("Produit / Article",       fontHeader, XBrushes.White, xProd,  yPos + 15);
            gfx.DrawString("Qté Commandée",           fontHeader, XBrushes.White, xQteC,  yPos + 15);
            gfx.DrawString("Qté Livrée",              fontHeader, XBrushes.White, xQteL,  yPos + 15);
            yPos += 22;

            // ---- TABLE ROWS ----
            bool alt = false;
            foreach (var ligne in livraison.Lignes)
            {
                if (alt)
                    gfx.DrawRectangle(new XSolidBrush(lightBg), margin, yPos, pageWidth, 20);

                string prodNom = ligne.Produit?.Designation ?? $"Produit #{ligne.Id_Produit}";
                gfx.DrawString(Truncate(prodNom, 48),              fontBody, new XSolidBrush(textColor), xProd, yPos + 14);
                gfx.DrawString(ligne.QteCommande.ToString("0.##"), fontBody, new XSolidBrush(textColor), xQteC, yPos + 14);
                gfx.DrawString(ligne.QteFait.ToString("0.##"),     fontBold, new XSolidBrush(textColor), xQteL, yPos + 14);

                yPos += 20;
                alt = !alt;
            }

            gfx.DrawLine(new XPen(XColor.FromArgb(203, 213, 225), 1), margin, yPos, page.Width.Point - margin, yPos);
            yPos += 30;

            // ---- SIGNATURE ZONE ----
            double sigWidth  = 200;
            double sigHeight = 80;
            double sigX      = page.Width.Point - margin - sigWidth;

            gfx.DrawRectangle(new XSolidBrush(XColor.FromArgb(249, 250, 251)), sigX, yPos, sigWidth, sigHeight);
            gfx.DrawRectangle(new XPen(XColor.FromArgb(209, 213, 219)), sigX, yPos, sigWidth, sigHeight);
            gfx.DrawString("Signature du Client", fontHeader, new XSolidBrush(primaryColor), sigX + 40, yPos + 18);
            gfx.DrawString("Lu et approuvé",      fontSmall,  new XSolidBrush(textColor),    sigX + 55, yPos + 34);

            // Left signature note
            gfx.DrawString("Livré par:", fontBold,  new XSolidBrush(primaryColor), margin, yPos + 18);
            gfx.DrawString("Date:",      fontBody,  new XSolidBrush(textColor),    margin, yPos + 36);
            gfx.DrawString("Signature:", fontBody,  new XSolidBrush(textColor),    margin, yPos + 54);

            // ---- FOOTER ----
            double footerY = page.Height.Point - 30;
            gfx.DrawLine(new XPen(XColor.FromArgb(226, 232, 240), 1), margin, footerY - 10, page.Width.Point - margin, footerY - 10);
            gfx.DrawString(company.PiedDePage ?? "DIGI ERP - Document généré automatiquement", fontSmall, new XSolidBrush(textColor), margin, footerY);
            gfx.DrawString("Page 1 sur 1", fontSmall, new XSolidBrush(textColor), page.Width.Point - margin - 50, footerY);

            document.Save(stream, false);
            return stream.ToArray();
        }

        private static string Truncate(string str, int maxLength)
        {
            if (string.IsNullOrEmpty(str)) return "";
            return str.Length <= maxLength ? str : str.Substring(0, maxLength - 3) + "...";
        }
    }
}
