using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace example2.Migrations
{
    public partial class AddPlanificationSpot : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Id_PlageHoraire",
                table: "Devis",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Id_PlageHoraire",
                table: "Commandes",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "PlanificationSpots",
                columns: table => new
                {
                    Id_PlanificationSpot = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Id_Commande = table.Column<int>(type: "int", nullable: false),
                    Id_CommandeLigne = table.Column<int>(type: "int", nullable: true),
                    Id_Produit = table.Column<int>(type: "int", nullable: false),
                    DateHeureDiffusion = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DureeSecondes = table.Column<int>(type: "int", nullable: false),
                    Id_PlageHoraire = table.Column<int>(type: "int", nullable: true),
                    Statut = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Remarques = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlanificationSpots", x => x.Id_PlanificationSpot);
                    table.ForeignKey(
                        name: "FK_PlanificationSpots_CommandeLignes_Id_CommandeLigne",
                        column: x => x.Id_CommandeLigne,
                        principalTable: "CommandeLignes",
                        principalColumn: "Id_CommandeLigne",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_PlanificationSpots_Commandes_Id_Commande",
                        column: x => x.Id_Commande,
                        principalTable: "Commandes",
                        principalColumn: "Id_Commande",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PlanificationSpots_PlagesHoraires_Id_PlageHoraire",
                        column: x => x.Id_PlageHoraire,
                        principalTable: "PlagesHoraires",
                        principalColumn: "Id_PlageHoraire",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_PlanificationSpots_Produits_Id_Produit",
                        column: x => x.Id_Produit,
                        principalTable: "Produits",
                        principalColumn: "Id_Produit",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Devis_Id_PlageHoraire",
                table: "Devis",
                column: "Id_PlageHoraire");

            migrationBuilder.CreateIndex(
                name: "IX_Commandes_Id_PlageHoraire",
                table: "Commandes",
                column: "Id_PlageHoraire");

            migrationBuilder.CreateIndex(
                name: "IX_PlanificationSpots_Id_Commande",
                table: "PlanificationSpots",
                column: "Id_Commande");

            migrationBuilder.CreateIndex(
                name: "IX_PlanificationSpots_Id_CommandeLigne",
                table: "PlanificationSpots",
                column: "Id_CommandeLigne");

            migrationBuilder.CreateIndex(
                name: "IX_PlanificationSpots_Id_PlageHoraire",
                table: "PlanificationSpots",
                column: "Id_PlageHoraire");

            migrationBuilder.CreateIndex(
                name: "IX_PlanificationSpots_Id_Produit",
                table: "PlanificationSpots",
                column: "Id_Produit");

            migrationBuilder.AddForeignKey(
                name: "FK_Commandes_PlagesHoraires_Id_PlageHoraire",
                table: "Commandes",
                column: "Id_PlageHoraire",
                principalTable: "PlagesHoraires",
                principalColumn: "Id_PlageHoraire",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Devis_PlagesHoraires_Id_PlageHoraire",
                table: "Devis",
                column: "Id_PlageHoraire",
                principalTable: "PlagesHoraires",
                principalColumn: "Id_PlageHoraire",
                onDelete: ReferentialAction.SetNull);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Commandes_PlagesHoraires_Id_PlageHoraire",
                table: "Commandes");

            migrationBuilder.DropForeignKey(
                name: "FK_Devis_PlagesHoraires_Id_PlageHoraire",
                table: "Devis");

            migrationBuilder.DropTable(
                name: "PlanificationSpots");

            migrationBuilder.DropIndex(
                name: "IX_Devis_Id_PlageHoraire",
                table: "Devis");

            migrationBuilder.DropIndex(
                name: "IX_Commandes_Id_PlageHoraire",
                table: "Commandes");

            migrationBuilder.DropColumn(
                name: "Id_PlageHoraire",
                table: "Devis");

            migrationBuilder.DropColumn(
                name: "Id_PlageHoraire",
                table: "Commandes");
        }
    }
}
