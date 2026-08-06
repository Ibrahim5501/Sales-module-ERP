using System;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using example2.Models;

namespace example2.DTOs
{
    public class PlanificationSpotCreateDto
    {
        [Required]
        public int Id_Commande { get; set; }

        public int? Id_CommandeLigne { get; set; }

        [Required]
        public int Id_Produit { get; set; }

        [Required]
        public DateTime DateHeureDiffusion { get; set; }

        public int DureeSecondes { get; set; } = 30;

        public int? Id_PlageHoraire { get; set; }

        [JsonConverter(typeof(JsonStringEnumConverter))]
        public StatutPlanificationSpot Statut { get; set; } = StatutPlanificationSpot.Planifie;

        public string? Remarques { get; set; }
    }

    public class PlanificationSpotUpdateDto
    {
        [Required]
        public DateTime DateHeureDiffusion { get; set; }

        public int DureeSecondes { get; set; } = 30;

        public int? Id_PlageHoraire { get; set; }

        [JsonConverter(typeof(JsonStringEnumConverter))]
        public StatutPlanificationSpot Statut { get; set; } = StatutPlanificationSpot.Planifie;

        public string? Remarques { get; set; }
    }

    public class PlanificationSpotStatutUpdateDto
    {
        [Required]
        [JsonConverter(typeof(JsonStringEnumConverter))]
        public StatutPlanificationSpot Statut { get; set; } = StatutPlanificationSpot.Planifie;
    }

    public class PlanificationSpotDto
    {
        public int Id_PlanificationSpot { get; set; }

        public int Id_Commande { get; set; }

        public string? NumeroCommande { get; set; }

        public int Id_Partenaire { get; set; }

        public string? NomPartenaire { get; set; }

        public int? Id_CommandeLigne { get; set; }

        public int Id_Produit { get; set; }

        public string? DesignationProduit { get; set; }

        public string? CodeProduit { get; set; }

        public DateTime DateHeureDiffusion { get; set; }

        public int DureeSecondes { get; set; }

        public int? Id_PlageHoraire { get; set; }

        public string? NomPlageHoraire { get; set; }

        public string? HeureDebutPlage { get; set; }

        public string? HeureFinPlage { get; set; }

        /// <summary>Statut sérialisé en string français pour la compatibilité frontend.</summary>
        public string Statut { get; set; } = "Planifié";

        public string? Remarques { get; set; }
    }
}
