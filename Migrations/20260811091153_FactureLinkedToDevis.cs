using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace example2.Migrations
{
    public partial class FactureLinkedToDevis : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Facture_Commande')
                    ALTER TABLE [Factures] DROP CONSTRAINT [FK_Facture_Commande];
                IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Factures_Commandes_Id_Commande')
                    ALTER TABLE [Factures] DROP CONSTRAINT [FK_Factures_Commandes_Id_Commande];
            ");

            migrationBuilder.RenameColumn(
                name: "Id_Commande",
                table: "Factures",
                newName: "Id_Devis");

            // Index may have already been renamed or may not exist — recreate it safely.
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Factures_Id_Commande' AND object_id = OBJECT_ID('Factures'))
                    DROP INDEX [IX_Factures_Id_Commande] ON [Factures];
                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Factures_Id_Devis' AND object_id = OBJECT_ID('Factures'))
                    CREATE INDEX [IX_Factures_Id_Devis] ON [Factures] ([Id_Devis]);
            ");

            migrationBuilder.AddColumn<decimal>(
                name: "MontantHT",
                table: "Factures",
                type: "decimal(18,3)",
                precision: 18,
                scale: 3,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "MontantTVA",
                table: "Factures",
                type: "decimal(18,3)",
                precision: 18,
                scale: 3,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddForeignKey(
                name: "FK_Factures_Devis_Id_Devis",
                table: "Factures",
                column: "Id_Devis",
                principalTable: "Devis",
                principalColumn: "Id_Devis",
                onDelete: ReferentialAction.Restrict);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Factures_Devis_Id_Devis",
                table: "Factures");

            migrationBuilder.DropColumn(
                name: "MontantHT",
                table: "Factures");

            migrationBuilder.DropColumn(
                name: "MontantTVA",
                table: "Factures");

            migrationBuilder.RenameColumn(
                name: "Id_Devis",
                table: "Factures",
                newName: "Id_Commande");

            migrationBuilder.RenameIndex(
                name: "IX_Factures_Id_Devis",
                table: "Factures",
                newName: "IX_Factures_Id_Commande");

            migrationBuilder.AddForeignKey(
                name: "FK_Factures_Commandes_Id_Commande",
                table: "Factures",
                column: "Id_Commande",
                principalTable: "Commandes",
                principalColumn: "Id_Commande",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
