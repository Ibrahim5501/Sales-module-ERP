using example2.Models;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace example2.DTOs
{
    public class CommandeCreateDto
    {
        public int Id_Devis { get; set; }

        public int Id_Partenaire { get; set; }

        public List<CommandeLigneCreateDto> Lignes { get; set; } = new();
    }

    public class CommandeUpdateDto : CommandeCreateDto
    {
        public List<CommandeLigneUpdateDto> Lignes { get; set; } = new();
    }

    public class CommandeDto : CommandeCreateDto
    {
        public int Id_Commande { get; set; }

        public string NumeroCommande { get; set; }

        public DateTime DateCommande { get; set; }

        public CommandeStatut Statut { get; set; }

        public decimal MontantHT { get; set; }

        public decimal MontantTVA { get; set; }

        public decimal MontantTTC { get; set; }

        public int Id_Devis { get; set; }

        public int Id_Partenaire { get; set; }

        public List<CommandeLigneDto> Lignes { get; set; } = new();
    }
}
