using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace example2.Migrations
{
    public partial class AddBonDeLivraison : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Livraisons",
                columns: table => new
                {
                    Id_Livraison = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    NumeroLivraison = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Adresse = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DatePrevue = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DateEcheance = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Statut = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Id_Commande = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Livraisons", x => x.Id_Livraison);
                    table.ForeignKey(
                        name: "FK_Livraisons_Commandes_Id_Commande",
                        column: x => x.Id_Commande,
                        principalTable: "Commandes",
                        principalColumn: "Id_Commande",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "LivraisonLignes",
                columns: table => new
                {
                    Id_LivraisonLigne = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    QteCommande = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    QteReserve = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    QteFait = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    Id_Livraison = table.Column<int>(type: "int", nullable: false),
                    Id_Produit = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LivraisonLignes", x => x.Id_LivraisonLigne);
                    table.ForeignKey(
                        name: "FK_LivraisonLignes_Livraisons_Id_Livraison",
                        column: x => x.Id_Livraison,
                        principalTable: "Livraisons",
                        principalColumn: "Id_Livraison",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_LivraisonLignes_Produits_Id_Produit",
                        column: x => x.Id_Produit,
                        principalTable: "Produits",
                        principalColumn: "Id_Produit",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_LivraisonLignes_Id_Livraison",
                table: "LivraisonLignes",
                column: "Id_Livraison");

            migrationBuilder.CreateIndex(
                name: "IX_LivraisonLignes_Id_Produit",
                table: "LivraisonLignes",
                column: "Id_Produit");

            migrationBuilder.CreateIndex(
                name: "IX_Livraisons_Id_Commande",
                table: "Livraisons",
                column: "Id_Commande");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LivraisonLignes");

            migrationBuilder.DropTable(
                name: "Livraisons");
        }
    }
}

