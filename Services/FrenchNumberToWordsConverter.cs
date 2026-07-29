using System;
using System.Text;

namespace example2.Services
{
    public static class FrenchNumberToWordsConverter
    {
        private static readonly string[] Unites = 
        { 
            "", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf",
            "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"
        };

        private static readonly string[] Dizaines = 
        { 
            "", "dix", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante-dix", "quatre-vingts", "quatre-vingt-dix" 
        };

        public static string ConvertToFrenchWords(decimal amount)
        {
            if (amount < 0)
                return "moins " + ConvertToFrenchWords(Math.Abs(amount));

            long dinars = (long)Math.Truncate(amount);
            long millimes = (long)Math.Round((amount - dinars) * 1000m);

            if (millimes >= 1000)
            {
                dinars += 1;
                millimes -= 1000;
            }

            string dinarsTxt = NumberToWords(dinars);
            if (string.IsNullOrWhiteSpace(dinarsTxt))
                dinarsTxt = "zéro";

            string result = $"{dinarsTxt} Dinar{(dinars > 1 ? "s" : "")}";

            if (millimes > 0)
            {
                string millimesTxt = NumberToWords(millimes);
                result += $" et {millimesTxt} Millime{(millimes > 1 ? "s" : "")}";
            }

            // Capitalize first letter
            if (result.Length > 0)
                result = char.ToUpper(result[0]) + result.Substring(1);

            return result;
        }

        private static string NumberToWords(long number)
        {
            if (number == 0) return "";

            if (number < 20) return Unites[number];

            if (number < 100)
            {
                long dizaine = number / 10;
                long reste = number % 10;

                if (dizaine == 7 || dizaine == 9)
                {
                    string prefix = Dizaines[dizaine - 1];
                    string suffix = Unites[10 + reste];
                    return (dizaine == 7 && reste == 1) ? $"{prefix} et onze" : $"{prefix}-{suffix}";
                }
                else
                {
                    string prefix = Dizaines[dizaine];
                    if (reste == 0) return prefix;
                    if (reste == 1) return $"{prefix} et un";
                    return $"{prefix}-{Unites[reste]}";
                }
            }

            if (number < 1000)
            {
                long centaine = number / 100;
                long reste = number % 100;

                string prefix = centaine == 1 ? "cent" : $"{Unites[centaine]} cent{(reste == 0 ? "s" : "")}";
                if (reste == 0) return prefix;
                return $"{prefix} {NumberToWords(reste)}";
            }

            if (number < 1000000)
            {
                long milliers = number / 1000;
                long reste = number % 1000;

                string prefix = milliers == 1 ? "mille" : $"{NumberToWords(milliers)} mille";
                if (reste == 0) return prefix;
                return $"{prefix} {NumberToWords(reste)}";
            }

            if (number < 1000000000)
            {
                long millions = number / 1000000;
                long reste = number % 1000000;

                string prefix = millions == 1 ? "un million" : $"{NumberToWords(millions)} millions";
                if (reste == 0) return prefix;
                return $"{prefix} {NumberToWords(reste)}";
            }

            return number.ToString();
        }
    }
}
