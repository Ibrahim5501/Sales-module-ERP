using example2.Models;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace example2.DTOs
{
    public class DevisCreateDto
    {
        public int Id_Partenaire { get; set; }

        public List<DevisLigneCreateDto> Lignes { get; set; } = new();
    }

    public class DevisUpdateDto : DevisCreateDto
    {
        public DateTime DateDevis { get; set; }

        public DevisStatut Statut { get; set; }

        public int Id_partenaire { get; set; }

        public List<DevisLigneUpdateDto> Lignes { get; set; } = new();
    }

    public class DevisDto : DevisCreateDto
    {
        public int Id_Devis { get; set; }

        public string NumeroDevis { get; set; }

        public DateTime DateDevis { get; set; }

        public DateTime DateValidite { get; set; }

        public DevisStatut Statut { get; set; }

        public decimal MontantHT { get; set; }

        public decimal MontantTVA { get; set; }

        public decimal MontantTTC { get; set; }

        public int Id_Partenaire { get; set; }

        public List<DevisLigneDto> Lignes { get; set; } = new();
    }
}
