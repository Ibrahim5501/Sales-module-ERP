// --- MODULE FACTURES ---

async function chargerFactures() {
    try {
        const res = await fetch('/api/factures');
        facturesData = await res.json();
        
        // Calcul des KPI Factures
        const totalHT = facturesData.reduce((sum, f) => sum + (f.montantHT || f.montantTotal / 1.2), 0);
        const totalTTC = facturesData.reduce((sum, f) => sum + f.montantTotal, 0);
        const totalPaye = facturesData.reduce((sum, f) => sum + (f.montantPaye || 0), 0);
        const totalReste = totalTTC - totalPaye;
        
        $("#kpi-fact-ca-ht").text(formatCurrency(totalHT));
        $("#kpi-fact-ca-ttc").text(formatCurrency(totalTTC));
        $("#kpi-fact-perdu").text(formatCurrency(totalPaye));
        $("#kpi-fact-reste").text(formatCurrency(totalReste));
        
        $("#grid-factures").dxDataGrid({
            dataSource: facturesData,
            allowColumnResizing: true,
            columnResizingMode: "widget",
            columnAutoWidth: true,
            showBorders: false,
            searchPanel: {
                visible: true,
                width: 260,
                placeholder: "Rechercher une facture..."
            },
            filterRow: {
                visible: true
            },
            groupPanel: {
                visible: true,
                placeholder: "Faites glisser une colonne pour grouper"
            },
            headerFilter: {
                visible: true
            },
            paging: {
                pageSize: 10
            },
            columns: [
                {
                    dataField: "numeroFacture",
                    caption: "N° Facture",
                    width: 140,
                    cellTemplate: (container, options) => {
                        $("<strong>").text(options.value).appendTo(container);
                }},
                {
                    dataField: "nomPartenaire",
                    caption: "Client"
                },
                {
                    dataField: "numeroCommande",
                    caption: "N° Commande",
                    width: 140
                },
                {
                    dataField: "dateFacture",
                    caption: "Date Émission",
                    dataType: "date",
                    format: "dd/MM/yyyy",
                    width: 130
                },
                {
                    dataField: "dateEcheance",
                    caption: "Date Échéance",
                    dataType: "date",
                    format: "dd/MM/yyyy",
                    width: 130
                },
                {
                    dataField: "statut",
                    caption: "Statut",
                    alignment: "center",
                    width: 120,
                    cellTemplate: renderStatusBadge
                },
                {
                    dataField: "montantTotal",
                    caption: "Total TTC (TND)",
                    alignment: "right",
                    width: 150,
                    calculateCellValue: (row) => formatCurrency(row.montantTotal)
                },
                {
                    dataField: "montantRestant",
                    caption: "Reste à Payer (TND)",
                    alignment: "right",
                    width: 170,
                    cellTemplate: (container, options) => {
                        const r = options.value || 0;
                        const $span = $("<span>").text(formatCurrency(r));
                        if (r > 0)
                            $span.css({ color: "var(--danger)", fontWeight: "700" });
                        $span.appendTo(container);
                }},
                {
                    caption: "Actions",
                    alignment: "center",
                    width: 140,
                    cellTemplate: (container, options) => {
                        const f = options.data;
                        const reste = f.montantRestant || (f.montantTotal - f.montantPaye);
                        if (f.statut !== 'Payee' && f.statut !== 'Annulee') {
                            $("<button>").addClass("btn btn-secondary btn-small")
                                .html("<i class='fa-solid fa-cash-register'></i> Régler")
                                .on("click", () => ouvrirModalPaiement(f.id_Facture, f.numeroFacture, reste))
                                .appendTo(container);
                        } else {
                            $("<span>").css({ color: "var(--text-muted)", fontSize: "12px" })
                                .html("<i class='fa-solid fa-circle-check' style='color:var(--success)'></i> Clôturée")
                                .appendTo(container);
                        }
                    }
                }
            ]
        });
    } catch (err) {
        console.error(err);
        showToast("Erreur de chargement des factures.", true);
    }
}

// REGLEMENT DE FACTURE (POPUP)
function initPopupReglement() {
    $("#popup-reglement").dxPopup({
        title: "Enregistrer un Règlement",
        width: 380,
        height: "auto",
        visible: false,
        dragEnabled: true,
        showCloseButton: true,
        contentTemplate: (container) => {
            container.append(`
                <div style="padding: 12px; background:var(--bg-app); border:1px solid var(--border); border-radius:8px; margin-bottom:16px; font-size:13px;">
                    <div><strong>Facture :</strong> <span id="dx-regle-ref">FAC-XXXX</span></div>
                    <div style="margin-top:4px;"><strong>Reste à régler :</strong> <span id="dx-regle-reste" class="text-danger font-semibold">0,000 TND</span></div>
                </div>
                <div id="dx-form-reglement"></div>
            `);
        },
        toolbarItems: [
            {
                shortcut: "done",
                location: "after",
                toolbar: "bottom",
                widget: "dxButton",
                options: {
                    text: "Enregistrer",
                    type: "success",
                    onClick: () => soumettreReglement()
                }
            },
            {
                shortcut: "cancel",
                location: "after",
                toolbar: "bottom",
                widget: "dxButton",
                options: {
                    text: "Annuler",
                    onClick: () => $("#popup-reglement").dxPopup("instance").hide()
                }
            }
        ]
    });
}

function ouvrirModalPaiement(id, ref, reste) {
    activeReglementFactId = id;

    $("#popup-reglement").dxPopup("instance").show();
    $("#dx-regle-ref").text(ref);
    $("#dx-regle-reste").text(formatCurrency(reste));

    // Initialiser le formulaire
    $("#dx-form-reglement").dxForm({
        formData: {
            montant: reste
        },
        items: [
            {
                dataField: "montant",
                label: {
                    text: "Montant perçu (TND)"
                },
                editorType: "dxNumberBox",
                editorOptions: {
                    min: 0.001,
                    max: reste,
                    format: "#,###0.000 TND",
                    showClearButton: true
                },
                validationRules: [
                    {
                        type: "required",
                        message: "Le montant est requis."
                    },
                    {
                        type: "range",
                        min: 0.001,
                        max: reste,
                        message: "Le montant doit être compris entre 0,001 et le reste à payer."
                    }
                ]
            }
        ]
    });
}

async function soumettreReglement() {
    const form = $("#dx-form-reglement").dxForm("instance");
    const validationResult = form.validate();
    
    if (!validationResult.isValid)
        return;
    
    const formData = form.option("formData");

    try {
        const res = await fetch(`/api/factures/${activeReglementFactId}/regler`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                montant: formData.montant
            })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || "Erreur lors du règlement.");
        }

        showToast("Règlement enregistré avec succès !");
        $("#popup-reglement").dxPopup("instance").hide();
        
        chargerToutesLesDonnees();
        chargerFactures();
    } catch (err) {
        showToast(err.message, true);
    }
}
