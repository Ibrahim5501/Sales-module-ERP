using example2.Models;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace example2.DTOs
{
    public class CommandeLigneCreateDto
    {

        public string Description { get; set; } = string.Empty;

        public decimal Quantite { get; set; }

        public decimal PrixUniversitaire { get; set; }

        public decimal TauxTVA { get; set; }

        public decimal Remise { get; set; }

        public decimal MontantHT { get; set; }

        public decimal MontantTTC { get; set; }

        public int Id_Produit { get; set; }

        public string? Emission { get; set; }
    }

    public class CommandeLigneUpdateDto : CommandeLigneCreateDto
    {
    }

    public class CommandeLigneDto : CommandeLigneCreateDto
    {
        public int Id_CommandeLigne { get; set; }

        public string Designation {  get; set; }

    }
}
