using System;
using System.ComponentModel.DataAnnotations;

namespace example2.Models
{
    public class Produit
    {
        [Key]
        public int Id_Produit { get; set; }

        public string Code { get; set; } = "";

        public string Designation { get; set; } = "";

        public string Unite { get; set; } = "";

        public decimal PrixUniversitaire { get; set; }

        public decimal QuantiteStock { get; set; }

        public decimal TauxTVA { get; set; }

        public bool Actif { get; set; }


        // Navigation
        public int Id_Categorie { get; set; }

        public Categorie? Categorie { get; set; }

        public ICollection<DevisLigne> DevisLignes { get; set; } = new List<DevisLigne>();

        public ICollection<CommandeLigne> CommandeLignes { get; set; } = new List<CommandeLigne>();
    }
}
