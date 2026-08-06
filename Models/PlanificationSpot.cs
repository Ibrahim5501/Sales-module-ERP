using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace example2.Models
{
    public class PlanificationSpot
    {
        [Key]
        public int Id_PlanificationSpot { get; set; }

        public int Id_Commande { get; set; }

        [JsonIgnore]
        public Commande? Commande { get; set; }

        public int? Id_CommandeLigne { get; set; }

        public CommandeLigne? CommandeLigne { get; set; }

        public int Id_Produit { get; set; }

        public Produit? Produit { get; set; }

        public DateTime DateHeureDiffusion { get; set; }

        /// <summary>Durée en secondes du spot lors de cette diffusion</summary>
        public int DureeSecondes { get; set; } = 30;

        public int? Id_PlageHoraire { get; set; }

        public PlageHoraire? PlageHoraire { get; set; }

        /// <summary>
        /// Colonne DB nvarchar(50) stockant la valeur string du statut.
        /// Utilisez la propriété Statut (enum) pour la logique métier.
        /// </summary>
        [Required]
        [StringLength(50)]
        [Column("Statut")]
        public string StatutString
        {
            get => Statut.ToFrenchString();
            set => Statut = StatutPlanificationSpotExtensions.FromFrenchString(value);
        }

        /// <summary>Statut typé (enum) — non mappé en base, calculé depuis StatutString.</summary>
        [NotMapped]
        public StatutPlanificationSpot Statut { get; set; } = StatutPlanificationSpot.Planifie;

        public string? Remarques { get; set; }
    }

    /// <summary>Extensions de conversion entre l'enum et les labels français.</summary>
    public static class StatutPlanificationSpotExtensions
    {
        public static string ToFrenchString(this StatutPlanificationSpot statut) => statut switch
        {
            StatutPlanificationSpot.Planifie => "Planifié",
            StatutPlanificationSpot.Diffuse  => "Diffusé",
            StatutPlanificationSpot.Annule   => "Annulé",
            _ => "Planifié"
        };

        public static StatutPlanificationSpot FromFrenchString(string? s) => s switch
        {
            "Planifié" => StatutPlanificationSpot.Planifie,
            "Diffusé"  => StatutPlanificationSpot.Diffuse,
            "Annulé"   => StatutPlanificationSpot.Annule,
            _ => StatutPlanificationSpot.Planifie
        };
    }
}
