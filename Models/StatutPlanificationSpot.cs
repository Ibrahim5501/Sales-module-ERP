using System;
using System.Runtime.Serialization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace example2.Models
{
    /// <summary>
    /// Statut du spot publicitaire planifié.
    /// Stocké en base comme chaîne nvarchar(50).
    /// </summary>
    [JsonConverter(typeof(StatutPlanificationSpotJsonConverter))]
    public enum StatutPlanificationSpot
    {
        [EnumMember(Value = "Planifié")]
        Planifie,

        [EnumMember(Value = "Diffusé")]
        Diffuse,

        [EnumMember(Value = "Annulé")]
        Annule
    }

    public class StatutPlanificationSpotJsonConverter : JsonConverter<StatutPlanificationSpot>
    {
        public override StatutPlanificationSpot Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            if (reader.TokenType == JsonTokenType.String)
            {
                string? str = reader.GetString();
                if (string.IsNullOrWhiteSpace(str)) return StatutPlanificationSpot.Planifie;

                return str.Trim() switch
                {
                    "Planifié" or "Planifie" or "0" => StatutPlanificationSpot.Planifie,
                    "Diffusé" or "Diffuse" or "1" => StatutPlanificationSpot.Diffuse,
                    "Annulé" or "Annule" or "2" => StatutPlanificationSpot.Annule,
                    _ => Enum.TryParse<StatutPlanificationSpot>(str, true, out var result) ? result : StatutPlanificationSpot.Planifie
                };
            }

            if (reader.TokenType == JsonTokenType.Number)
            {
                int val = reader.GetInt32();
                return Enum.IsDefined(typeof(StatutPlanificationSpot), val) ? (StatutPlanificationSpot)val : StatutPlanificationSpot.Planifie;
            }

            return StatutPlanificationSpot.Planifie;
        }

        public override void Write(Utf8JsonWriter writer, StatutPlanificationSpot value, JsonSerializerOptions options)
        {
            writer.WriteStringValue(value.ToFrenchString());
        }
    }
}

