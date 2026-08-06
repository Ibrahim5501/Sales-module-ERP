using System.Runtime.Serialization;
using System.Text.Json.Serialization;

namespace example2.Models
{
    /// <summary>
    /// Statut du spot publicitaire planifié.
    /// Stocké en base comme chaîne nvarchar(50).
    /// </summary>
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public enum StatutPlanificationSpot
    {
        [EnumMember(Value = "Planifié")]
        Planifie,

        [EnumMember(Value = "Diffusé")]
        Diffuse,

        [EnumMember(Value = "Annulé")]
        Annule
    }
}
