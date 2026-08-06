using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace example2.Migrations
{
    public partial class ChangeDevisPlageHoraireToDateInterval : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Commandes_PlagesHoraires_Id_PlageHoraire",
                table: "Commandes");

            migrationBuilder.DropForeignKey(
                name: "FK_Devis_PlagesHoraires_Id_PlageHoraire",
                table: "Devis");

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

            migrationBuilder.AddColumn<DateTime>(
                name: "DateDebutDiffusion",
                table: "Devis",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DateFinDiffusion",
                table: "Devis",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DateDebutDiffusion",
                table: "Commandes",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DateFinDiffusion",
                table: "Commandes",
                type: "datetime2",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DateDebutDiffusion",
                table: "Devis");

            migrationBuilder.DropColumn(
                name: "DateFinDiffusion",
                table: "Devis");

            migrationBuilder.DropColumn(
                name: "DateDebutDiffusion",
                table: "Commandes");

            migrationBuilder.DropColumn(
                name: "DateFinDiffusion",
                table: "Commandes");

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

            migrationBuilder.CreateIndex(
                name: "IX_Devis_Id_PlageHoraire",
                table: "Devis",
                column: "Id_PlageHoraire");

            migrationBuilder.CreateIndex(
                name: "IX_Commandes_Id_PlageHoraire",
                table: "Commandes",
                column: "Id_PlageHoraire");

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
    }
}
