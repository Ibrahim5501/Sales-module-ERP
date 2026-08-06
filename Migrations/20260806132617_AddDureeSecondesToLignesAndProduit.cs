using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace example2.Migrations
{
    public partial class AddDureeSecondesToLignesAndProduit : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "DureeSecondes",
                table: "Produits",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "DureeSecondes",
                table: "DevisLignes",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "DureeSecondes",
                table: "CommandeLignes",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DureeSecondes",
                table: "Produits");

            migrationBuilder.DropColumn(
                name: "DureeSecondes",
                table: "DevisLignes");

            migrationBuilder.DropColumn(
                name: "DureeSecondes",
                table: "CommandeLignes");
        }
    }
}
