using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace example2.Migrations
{
    public partial class AddArticleVariante : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ArticlesVariantes",
                columns: table => new
                {
                    Id_ArticleVariante = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Designation = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    PrixVariante = table.Column<decimal>(type: "decimal(18,3)", precision: 18, scale: 3, nullable: false),
                    TauxTVA = table.Column<decimal>(type: "decimal(18,3)", precision: 18, scale: 3, nullable: false),
                    DureeDefaut = table.Column<decimal>(type: "decimal(18,3)", precision: 18, scale: 3, nullable: false),
                    Actif = table.Column<bool>(type: "bit", nullable: false),
                    Id_Produit = table.Column<int>(type: "int", nullable: false),
                    Id_PlageHoraire = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ArticlesVariantes", x => x.Id_ArticleVariante);
                    table.ForeignKey(
                        name: "FK_ArticlesVariantes_PlagesHoraires_Id_PlageHoraire",
                        column: x => x.Id_PlageHoraire,
                        principalTable: "PlagesHoraires",
                        principalColumn: "Id_PlageHoraire",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ArticlesVariantes_Produits_Id_Produit",
                        column: x => x.Id_Produit,
                        principalTable: "Produits",
                        principalColumn: "Id_Produit",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ArticlesVariantes_Id_PlageHoraire",
                table: "ArticlesVariantes",
                column: "Id_PlageHoraire");

            migrationBuilder.CreateIndex(
                name: "IX_ArticlesVariantes_Id_Produit",
                table: "ArticlesVariantes",
                column: "Id_Produit");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ArticlesVariantes");
        }
    }
}
