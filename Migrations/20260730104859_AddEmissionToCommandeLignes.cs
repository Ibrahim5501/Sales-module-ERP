using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace example2.Migrations
{
    public partial class AddEmissionToCommandeLignes : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Emission",
                table: "CommandeLignes",
                type: "nvarchar(max)",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Emission",
                table: "CommandeLignes");
        }
    }
}
