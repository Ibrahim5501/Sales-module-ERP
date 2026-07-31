// --- MODULE DEVIS ---

async function chargerDevis() {
    try {
        const res = await fetch('/api/devis');
        devisData = await res.json();

        // KPI Devis
        const total = devisData.length;
        const envoyes = devisData.filter(d => d.statut === 'Envoye').length;
        const acceptes = devisData.filter(d => d.statut === 'Accepte').length;
        const montantTotal = devisData.reduce((s, d) => s + (d.montantTTC || 0), 0);

        $("#kpi-devis-total").text(total);
        $("#kpi-devis-envoyes").text(envoyes);
        $("#kpi-devis-acceptes").text(acceptes);
        $("#kpi-devis-montant").text(formatCurrency(montantTotal));

        $("#grid-devis").dxDataGrid({
            dataSource: devisData,
            allowColumnResizing: true,
            columnResizingMode: "widget",
            columnAutoWidth: true,
            allowColumnReordering: true,
            showBorders: false,
            searchPanel: {
                visible: true,
                width: 260,
                placeholder: "Rechercher un devis..."
            },
            groupPanel: {
                visible: true,
                placeholder: "Faites glisser une colonne pour grouper"
            },
            filterRow: {
                visible: true
            },
            headerFilter: {
                visible: true
            },
            paging: {
                pageSize: 10
            },
            pager: {
                showPageSizeSelector: true,
                allowedPageSizes: [5, 10, 20],
                showInfo: true
            },
            columns: [
                {
                    dataField: "numeroDevis",
                    caption: "N° Devis",
                    width: 130,
                    cellTemplate: (container, options) => {
                        $("<strong>").text(options.value).appendTo(container); 
                    }
                },
                {
                    dataField: "nomPartenaire",
                    caption: "Client",
                    width: 200
                },
                {
                    dataField: "createdByUsername",
                    caption: "Créé par",
                    width: 160,
                    cellTemplate: (container, options) => {
                        $("<span class='text-muted' style='font-size:12px;'>").text(options.value || "N/A").appendTo(container);
                    }
                },
                {
                    dataField: "modePaiement",
                    caption: "Mode Paiement",
                    width: 140
                },
                {
                    dataField: "dateDevis",
                    caption: "Date",
                    dataType: "date",
                    format: "dd/MM/yyyy",
                    width: 100
                },
                {
                    dataField: "dateValidite",
                    caption: "Validité",
                    dataType: "date",
                    format: "dd/MM/yyyy",
                    width: 100
                },
                {
                    dataField: "statut",
                    caption: "Statut",
                    width: 110,
                    alignment: "center",
                    cellTemplate: renderDevisBadge
                },
                {
                    dataField: "montantHT",
                    caption: "Montant HT (TND)",
                    alignment: "right",
                    width: 150,
                    calculateCellValue: (row) => formatCurrency(row.montantHT)
                },
                {
                    dataField: "montantTTC",
                    caption: "Total TTC (TND)",
                    alignment: "right",
                    width: 150,
                    calculateCellValue: (row) => formatCurrency(row.montantTTC)
                },
                {
                    caption: "Actions",
                    alignment: "center",
                    cellTemplate: renderDevisActions
                }
            ]
        });
    } catch (err) {
        console.error(err);
        showToast("Erreur de chargement des devis.", true);
    }
}

function renderDevisBadge(container, options) {
    const val = options.value;
    const map = {
        'Brouillon': ['badge-gray', 'Brouillon'],
        'Envoye':    ['badge-blue', 'Envoyé'],
        'Accepte':   ['badge-green', 'Accepté'],
        'Refuse':    ['badge-red', 'Refusé'],
        'Expire':    ['badge-orange', 'Expiré']
    };
    const [cls, label] = map[val] || ['badge-gray', val];
    $("<span>").addClass(`badge ${cls}`).text(label).appendTo(container);
}

function renderDevisActions(container, options) {
    const d = options.data;
    const $wrap = $("<div style='display:flex; gap:4px; justify-content:center; flex-wrap:wrap;'>");

    // Bouton Voir Détails
    $("<button>").addClass("action-btn-dx btn-view")
        .html("<i class='fa-solid fa-eye'></i> Détails")
        .on("click", () => ouvrirDetailDevis(d.id_Devis))
        .appendTo($wrap);

    // Bouton Télécharger PDF
    $("<button>")
        .addClass("action-btn-dx btn-view")
        .html("<i class='fa-solid fa-file-pdf'></i> PDF")
        .on("click", function (e) {
            e.preventDefault();
            window.open(`/api/devis/${d.id_Devis}/pdf`, "_blank");
        })
        .appendTo($wrap);

    if (d.statut === 'Brouillon') {
        // Envoyer
        $("<button>").addClass("action-btn-dx btn-approve")
            .html("<i class='fa-solid fa-paper-plane'></i> Envoyer")
            .on("click", function (e) {
                e.preventDefault();
                envoyerDevis(d.id_Devis);
            })
            .appendTo($wrap);

        // Accepter directement
        $("<button>").addClass("action-btn-dx btn-invoice")
            .html("<i class='fa-solid fa-check-double'></i> Accepter")
            .on("click", () => accepterDevis(d.id_Devis))
            .appendTo($wrap);

        // Refuser
        $("<button>").addClass("action-btn-dx btn-cancel")
            .html("<i class='fa-solid fa-xmark'></i> Refuser")
            .on("click", () => refuserDevis(d.id_Devis))
            .appendTo($wrap);
    }
    else if (d.statut === 'Envoye') {
        $("<button>").addClass("action-btn-dx btn-invoice")
            .html("<i class='fa-solid fa-check-double'></i> Accepter")
            .on("click", () => accepterDevis(d.id_Devis))
            .appendTo($wrap);

        $("<button>").addClass("action-btn-dx btn-cancel")
            .html("<i class='fa-solid fa-xmark'></i> Refuser")
            .on("click", () => refuserDevis(d.id_Devis))
            .appendTo($wrap);
    }

    $wrap.appendTo(container);
}

function initPopupDetailDevis() {
    $("#popup-detail-devis").dxPopup({
        title: "Détail du Devis",
        width: 550,
        height: "auto",
        visible: false,
        dragEnabled: true,
        showCloseButton: true,
        contentTemplate: (container) => {
            $("<div id='detail-devis-content'>").appendTo(container);
        }
    });
}

async function ouvrirDetailDevis(id) {
    try {
        const res = await fetch(`/api/devis/${id}`);
        if (!res.ok) throw new Error("Impossible de charger le devis.");

        const d = await res.json();
        const popup = $("#popup-detail-devis").dxPopup("instance");
        popup.show();

        const $content = $("#detail-devis-content");
        $content.empty();

        const dateDevis = new Date(d.dateDevis).toLocaleDateString("fr-FR");
        const dateValidite = new Date(d.dateValidite).toLocaleDateString("fr-FR");

        let badgeClass = "badge-gray";
        let badgeLabel = d.statut;

        switch (d.statut) {
            case "Brouillon":
                badgeClass = "badge-gray";
                badgeLabel = "Brouillon";
                break;
            case "Envoye":
                badgeClass = "badge-blue";
                badgeLabel = "Envoyé";
                break;
            case "Accepte":
                badgeClass = "badge-green";
                badgeLabel = "Accepté";
                break;
            case "Refuse":
                badgeClass = "badge-red";
                badgeLabel = "Refusé";
                break;
            case "Expire":
                badgeClass = "badge-orange";
                badgeLabel = "Expiré";
                break;
        }

        let actionsHtml = "";
        let linesHtml = "";

        if (d.statut === "Brouillon") {
            actionsHtml = `
            <div style="display:flex; gap:10px; margin-top:16px; flex-wrap:wrap;">
                <button class="action-btn-dx btn-invoice"
                        onclick="accepterDevisDepuisPopup(${d.id_Devis})">
                    <i class="fa-solid fa-check-double"></i> Accepter
                </button>

                <button class="action-btn-dx btn-approve"
                        onclick="envoyerDevisDepuisPopup(${d.id_Devis})">
                    <i class="fa-solid fa-paper-plane"></i> Envoyer
                </button>

                <button class="action-btn-dx btn-view"
                        onclick="window.open('/api/devis/${d.id_Devis}/pdf', '_blank')">
                    <i class="fa-solid fa-file-pdf"></i> Télécharger PDF
                </button>

                <button class="action-btn-dx btn-cancel"
                        onclick="refuserDevisDepuisPopup(${d.id_Devis})">
                    <i class="fa-solid fa-xmark"></i> Refuser
                </button>
            </div>
            `;
        } else {
            actionsHtml = `
            <div style="display:flex; gap:10px; margin-top:16px; flex-wrap:wrap;">
                ${d.statut === "Envoye" ? `
                <button class="action-btn-dx btn-invoice"
                        onclick="accepterDevisDepuisPopup(${d.id_Devis})">
                    <i class="fa-solid fa-check-double"></i> Accepter
                </button>
                ` : ""}

                <button class="action-btn-dx btn-view"
                        onclick="window.open('/api/devis/${d.id_Devis}/pdf', '_blank')">
                    <i class="fa-solid fa-file-pdf"></i> Télécharger PDF
                </button>

                ${d.statut === "Envoye" ? `
                <button class="action-btn-dx btn-cancel"
                        onclick="refuserDevisDepuisPopup(${d.id_Devis})">
                    <i class="fa-solid fa-xmark"></i> Refuser
                </button>
                ` : ""}
            </div>
            `;
        }

        d.lignes.forEach(l => {
            const remiseStr = l.remise > 0 ? (l.typeRemise === "MontantFixe" ? `(-${l.remise.toFixed(3)} DT)` : `(-${l.remise}%)`) : "";
            const emissionBadge = l.emission ? `<span class="badge badge-blue" style="margin-left:6px; font-size:11px;">${l.emission}</span>` : "";
            linesHtml += `
                <div class="detail-item-row"
                     style="display:flex; justify-content:space-between; padding:8px 12px; background:var(--bg-app); border-radius:4px; margin-bottom:8px; font-size:13px;">
                    <div style="display:flex; flex-direction:column;">
                        <div><strong>${l.designation}</strong>${emissionBadge}</div>
                        <span style="font-size:11px;color:var(--text-muted);">
                            ${l.quantite} sec × ${formatCurrency(l.prixUniversitaire)} ${remiseStr} &mdash; TVA ${l.tauxTVA}%
                        </span>
                    </div>
                    <strong style="align-self:center;">
                        ${formatCurrency(l.montantTTC)}
                    </strong>
                </div>
            `;
        });

        $content.append(`
            <div style="margin-bottom:20px;">
                <h4 style="font-size:11px; text-transform:uppercase; color:var(--text-light); margin-bottom:6px; font-weight:700;">Informations Générales</h4>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; padding:12px; background:var(--bg-app); border:1px solid var(--border); border-radius:8px; font-size:13px;">
                    <div><span style="color:var(--text-muted);">N° Devis :</span> <strong>${d.numeroDevis}</strong></div>
                    <div><span style="color:var(--text-muted);">Statut :</span> <span class="badge ${badgeClass}">${badgeLabel}</span></div>
                    <div><span style="color:var(--text-muted);">Date :</span> <strong>${dateDevis}</strong></div>
                    <div><span style="color:var(--text-muted);">Validité :</span> <strong>${dateValidite}</strong></div>
                    <div><span style="color:var(--text-muted);">Créé par :</span> <strong>${d.createdByEmail || 'N/A'}</strong></div>
                    <div><span style="color:var(--text-muted);">Paiement :</span> <strong>${d.modePaiement || 'Virement Bancaire'}</strong></div>
                    <div><span style="color:var(--text-muted);">Remise Globale :</span> <strong>${d.remiseGlobale > 0 ? (d.typeRemiseGlobale === 'MontantFixe' ? d.remiseGlobale.toFixed(3) + ' DT' : d.remiseGlobale + '%') : 'Aucune'}</strong></div>
                    <div><span style="color:var(--text-muted);">Total HT :</span> <strong>${formatCurrency(d.montantHT)}</strong></div>
                    <div><span style="color:var(--text-muted);">Total TTC :</span> <strong class="text-primary">${formatCurrency(d.montantTTC)}</strong></div>
                </div>
            </div>

            <div style="margin-bottom:20px;">
                ${actionsHtml}
                <h4 style="font-size:11px; text-transform:uppercase; color:var(--text-light); margin-bottom:6px; font-weight:700;">Client</h4>
                <div style="padding:12px; background:var(--bg-app); border:1px solid var(--border); border-radius:8px; font-size:13px;">
                    <strong>${d.nomPartenaire}</strong>
                </div>
            </div>

            <div style="margin-bottom:20px;">
                <h4 style="font-size:11px; text-transform:uppercase; color:var(--text-light); margin-bottom:6px; font-weight:700;">Lignes du Devis</h4>
                ${linesHtml}
            </div>

            ${d.notes ? `
            <div>
                <h4 style="font-size:11px; text-transform:uppercase; color:var(--text-light); margin-bottom:6px; font-weight:700;">Notes</h4>
                <div style="padding:12px; background:var(--warning-light); border-left:3px solid var(--warning); border-radius:4px; font-size:13px; color:#92400e;">${d.notes}</div>
            </div>
            ` : ""}
        `);

    } catch (err) {
        showToast(err.message, true);
    }
}

async function envoyerDevis(id) {
    if (!confirm("Envoyer ce devis au client par e-mail ? Le statut passera à 'Envoyé' et le PDF sera généré.")) return;
    try {
        const res = await fetch(`/api/devis/${id}/envoyer`, { method: 'POST' });
        if (!res.ok) {
            const e = await res.json();
            throw new Error(e.message || "Erreur lors de l'envoi");
        }
        const data = await res.json();
        showToast(data.message || "Devis envoyé et e-mail transmis au client !");
        chargerDevis();
    } catch (err) {
        showToast(err.message, true);
    }
}

async function refuserDevis(id) {
    if (!confirm("Refuser / annuler ce devis ?")) return;
    try {
        const res = await fetch(`/api/devis/${id}/annuler`, { method: 'POST' });
        if (!res.ok) {
            const e = await res.json();
            throw new Error(e.message);
        }
        showToast("Devis refusé.");
        chargerDevis();
    } catch (err) {
        showToast(err.message, true);
    }
}

async function accepterDevis(id) {
    if (!confirm("Accepter ce devis et créer automatiquement un bon de commande ?")) return;
    try {
        const res = await fetch(`/api/devis/${id}/accepter`, { method: 'POST' });
        if (!res.ok) {
            const e = await res.json();
            throw new Error(e.message);
        }
        const cmd = await res.json();
        showToast(`Devis accepté ! Commande ${cmd.numeroCommande} et PDF générés.`);
        chargerDevis();
        chargerToutesLesDonnees();
    } catch (err) {
        showToast(err.message, true);
    }
}

async function accepterDevisDepuisPopup(id) {
    await accepterDevis(id);
    $("#popup-detail-devis").dxPopup("instance").hide();
}

async function envoyerDevisDepuisPopup(id) {
    await envoyerDevis(id);
    $("#popup-detail-devis").dxPopup("instance").hide();
}

async function refuserDevisDepuisPopup(id) {
    await refuserDevis(id);
    $("#popup-detail-devis").dxPopup("instance").hide();
}


// --- POPUP CREATION DEVIS ---
function initPopupDevis() {
    $("#popup-devis").dxPopup({
        title: "Créer un Devis Commercial",
        width: 1200,
        height: "80vh",
        maxHeight: "90vh",
        maxHeight: null,
        visible: false,
        dragEnabled: true,
        showCloseButton: true,
        contentTemplate: (container) => {
            container.css("overflow-y", "auto");
            container.append(`
                <div id="dx-form-devis-header"></div>
                <div style="margin-top:20px; border-top:1px dashed var(--border); padding-top:15px;">
                    <h4 style="font-weight:700; font-size:13.5px; margin-bottom:8px;">
                        <i class="fa-solid fa-list"></i> Lignes du Devis
                    </h4>
                    <div id="dx-grid-devis-lines"></div>
                </div>
                <div id="devis-summary-box" style="margin-top:15px; margin-left:auto; width:300px; padding:12px; background:var(--bg-app); border:1px solid var(--border); border-radius:6px; font-size:12.5px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
                        <span>Total HT (TND):</span><span id="devis-summary-ht">0,000 TND</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
                        <span>TVA :</span><span id="devis-summary-tva">0,000 TND</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; font-weight:700; border-top:1px solid var(--border); padding-top:4px; color:var(--navy); font-size:13.5px;">
                        <span>Total TTC (TND):</span><span id="devis-summary-ttc">0,000 TND</span>
                    </div>
                </div>
            `);
        },
        toolbarItems: [
            {
                shortcut: "done",
                location: "after",
                toolbar: "bottom",
                widget: "dxButton",
                options: {
                    text: "Créer Devis (Brouillon)",
                    type: "default",
                    onClick: () => soumettreDevis()
                }
            },
            {
                shortcut: "cancel",
                location: "after",
                toolbar: "bottom",
                widget: "dxButton",
                options: {
                    text: "Annuler",
                    onClick: () => $("#popup-devis").dxPopup("instance").hide()
                }
            }
        ]
    });
}

function ouvrirNouveauDevisPopup() {
    internalDevisLines = [];
    $("#devis-summary-ht").text("0,000 TND");
    $("#devis-summary-tva").text("0,000 TND");
    $("#devis-summary-ttc").text("0,000 TND");

    const popup = $("#popup-devis").dxPopup("instance");
    popup.show();

    // Formulaire entête
    $("#dx-form-devis-header").dxForm({
        formData: {
            clientId: null,
            adresseFacturation: "",
            adresseLivraison: "",
            modePaiement: "Virement Bancaire",
            remiseGlobale: 0,
            typeRemiseGlobale: "Pourcentage",
            dateValidite: new Date(new Date().setDate(new Date().getDate() + 30))
        },
        colCount: 2,
        items: [
            {
                dataField: "clientId",
                colSpan: 1,
                label: { text: "Client" },
                editorType: "dxSelectBox",
                editorOptions: {
                    dataSource: clientsData,
                    valueExpr: "id_Partenaire",
                    displayExpr: item => item ? `${item.nom} (${item.entreprise})` : "",
                    searchEnabled: true,
                    placeholder: "-- Sélectionner le client --",
                    onValueChanged(e) {
                        const client = clientsData.find(c => c.id_Partenaire === e.value);
                        if (!client) return;
                        const form = $("#dx-form-devis-header").dxForm("instance");
                        form.updateData("adresseFacturation", client.adresse);
                        form.updateData("adresseLivraison", client.adresse);
                    }
                },
                validationRules: [{ type: "required" }]
            },
            {
                itemType: "group",
                colSpan: 1,
                colCount: 2,
                items: [
                    {
                        itemType: "button",
                        buttonOptions: {
                            icon: "user",
                            text: "Nouveau client",
                            type: "default",
                            width: "100%",
                            onClick() { initPopupClient(); $("#popup-client").dxPopup("instance").show(); }
                        }
                    },
                    {
                        itemType: "button",
                        buttonOptions: {
                            icon: "product",
                            text: "Nouveau spot",
                            type: "normal",
                            width: "100%",
                            onClick() { ouvrirPopupArticle(); }
                        }
                    }
                ]
            },
            {
                dataField: "modePaiement",
                colSpan: 1,
                label: { text: "Mode de paiement" },
                editorType: "dxSelectBox",
                editorOptions: {
                    dataSource: ["Virement Bancaire", "Espèces", "Chèque", "Traite", "Carte Bancaire"],
                    placeholder: "Mode de paiement"
                }
            },
            {
                dataField: "dateValidite",
                colSpan: 1,
                label: { text: "Date de validité" },
                editorType: "dxDateBox",
                editorOptions: {
                    type: "date",
                    displayFormat: "dd/MM/yyyy",
                    useMaskBehavior: true,
                    min: new Date()
                },
                validationRules: [{ type: "required", message: "La date de validité est obligatoire." }]
            },
            {
                dataField: "remiseGlobale",
                colSpan: 1,
                label: { text: "Remise Globale" },
                editorType: "dxNumberBox",
                editorOptions: {
                    min: 0,
                    value: 0,
                    onValueChanged() { recalculerTotauxDevisPopup(); }
                }
            },
            {
                dataField: "typeRemiseGlobale",
                colSpan: 1,
                label: { text: "Type Remise Globale" },
                editorType: "dxSelectBox",
                editorOptions: {
                    dataSource: [
                        { value: "Pourcentage", text: "Pourcentage (%)" },
                        { value: "MontantFixe", text: "Montant Fixe (TND)" }
                    ],
                    valueExpr: "value",
                    displayExpr: "text",
                    value: "Pourcentage",
                    onValueChanged() { recalculerTotauxDevisPopup(); }
                }
            },
            {
                dataField: "adresseFacturation",
                colSpan: 2,
                label: { text: "Adresse de facturation" },
                editorType: "dxTextArea",
                editorOptions: { height: 50 }
            },
            {
                dataField: "adresseLivraison",
                colSpan: 2,
                label: { text: "Adresse de livraison" },
                editorType: "dxTextArea",
                editorOptions: { height: 50 }
            }
        ]
    });

    // Grille lignes
    $("#dx-grid-devis-lines").dxDataGrid({
        dataSource: internalDevisLines,
        allowColumnResizing: true,
        columnResizingMode: "widget",
        columnAutoWidth: true,
        editing: {
            mode: "cell",
            allowAdding: true,
            allowUpdating: true,
            allowDeleting: true,
            newRowPosition: "last"
        },
        showBorders: true,
        height: 220,
        scrolling: { mode: "virtual" },
        columns: [
            {
                dataField: "produitId",
                caption: "Spot Publicitaire",
                width: 180,
                lookup: {
                    dataSource: produitsData.filter(p => p.actif === true),
                    valueExpr: "id_Produit",
                    displayExpr: item => item ? `${item.designation} (${item.code})` : ""
                },
                validationRules: [{ type: "required" }],
                setCellValue: (rowData, value) => {
                    rowData.produitId = value;
                    const prod = produitsData.find(p => p.id_Produit === value);
                    if (prod) {
                        rowData.prixUniversitaire = prod.prixUniversitaire;
                        rowData.TauxTVA = prod.TauxTVA || 19;
                        rowData.quantite = 10;
                        rowData.remise = 0;
                        rowData.typeRemise = "Pourcentage";
                        rowData.emission = "Matinale (06:00 - 09:00)";
                    }
                }
            },
            {
                dataField: "emission",
                caption: "Plage horaire",
                width: 220,
                editCellTemplate: function (cellElement, cellInfo) {
                    const sourceData = (typeof plagesHorairesData !== "undefined" && Array.isArray(plagesHorairesData))
                        ? plagesHorairesData
                        : (window.plagesHorairesData || []);
                    const options = (sourceData && sourceData.length > 0)
                        ? sourceData.map(p => {
                            return p.nom ? `${p.nom} (${p.heureDebut} - ${p.heureFin})` : `${p.heureDebut} - ${p.heureFin}`;
                        })
                        : [
                            "Matinale (06:00 - 09:00)",
                            "Magazine (09:00 - 12:00)",
                            "Journal Télévisé (12:00 - 13:00)",
                            "Après-midi (13:00 - 18:00)",
                            "Culture (18:00 - 20:00)",
                            "Prime Time (20:00 - 22:30)",
                            "Divertissement (22:30 - 00:00)"
                        ];

                    $("<div>").dxSelectBox({
                        items: options,
                        value: cellInfo.value || "",
                        placeholder: "Sélectionner une plage...",
                        searchEnabled: true,
                        showClearButton: true,
                        onValueChanged: function (e) {
                            cellInfo.setValue(e.value || "");
                        }
                    }).appendTo(cellElement);
                }
            },
            {
                dataField: "prixUniversitaire",
                caption: "Prix Unit. HT",
                dataType: "number",
                allowEditing: true,
                width: 110,
                alignment: "right",
                format: "#,##0.000"
            },
            {
                dataField: "quantite",
                caption: "Durée (sec)",
                dataType: "number",
                width: 110,
                alignment: "center",
                editorOptions: { min: 1 },
                validationRules: [{ type: "required" }],
                setCellValue: (rowData, value) => {
                    rowData.quantite = value;
                }
            },
            {
                dataField: "typeRemise",
                caption: "Type Rem.",
                width: 110,
                alignment: "center",
                lookup: {
                    dataSource: [
                        { value: "Pourcentage", text: "% (Taux)" },
                        { value: "MontantFixe", text: "TND (Fixe)" }
                    ],
                    valueExpr: "value",
                    displayExpr: "text"
                },
                setCellValue: (rowData, value) => {
                    rowData.typeRemise = value;
                    recalculerTotauxDevisPopup();
                }
            },
            {
                dataField: "remise",
                caption: "Remise",
                width: 90,
                alignment: "center",
                editorOptions: { min: 0 },
                setCellValue: (rowData, value) => {
                    rowData.remise = value;
                    recalculerTotauxDevisPopup();
                }
            },
            {
                dataField: "TauxTVA",
                caption: "TVA",
                width: 90,
                alignment: "center",
                lookup: {
                    dataSource: [
                        { value: 19, text: "19 %" },
                        { value: 13, text: "13 %" },
                        { value: 7, text: "7 %" },
                        { value: 0, text: "0 %" }
                    ],
                    valueExpr: "value",
                    displayExpr: "text"
                }
            },
            {
                caption: "Total HT",
                dataType: "number",
                allowEditing: false,
                alignment: "right",
                width: 120,
                calculateCellValue: (row) => {
                    if (!row.prixUniversitaire) return 0;
                    const qte = row.quantite || 1;
                    let remVal = 0;
                    if (row.typeRemise === "MontantFixe") {
                        remVal = row.remise || 0;
                    } else {
                        remVal = (row.prixUniversitaire * qte) * ((row.remise || 0) / 100);
                    }
                    let res = (row.prixUniversitaire * qte) - remVal;
                    return res < 0 ? 0 : res;
                }   
            }
        ],
        onRowInserted: () => recalculerTotauxDevisPopup(),
        onRowUpdated: () => recalculerTotauxDevisPopup(),
        onRowRemoved: () => recalculerTotauxDevisPopup()
    });
}

function recalculerTotauxDevisPopup() {
    const grid = $("#dx-grid-devis-lines").dxDataGrid("instance");
    if (!grid) return;
    const items = grid.option("dataSource") || [];
    let subtotalHT = 0;
    let totalTVA = 0;

    items.forEach(l => {
        if (l.prixUniversitaire) {
            const qte = l.quantite || 1;
            let remVal = 0;
            if (l.typeRemise === "MontantFixe") {
                remVal = l.remise || 0;
            } else {
                remVal = (l.prixUniversitaire * qte) * ((l.remise || 0) / 100);
            }
            let lineHT = (l.prixUniversitaire * qte) - remVal;
            if (lineHT < 0) lineHT = 0;

            let lineTVA = lineHT * ((l.TauxTVA !== undefined ? l.TauxTVA : 19) / 100);
            subtotalHT += lineHT;
            totalTVA += lineTVA;
        }
    });

    const headerForm = $("#dx-form-devis-header").dxForm("instance");
    let remiseGlobale = 0;
    let typeRemiseGlobale = "Pourcentage";
    if (headerForm) {
        remiseGlobale = headerForm.option("formData.remiseGlobale") || 0;
        typeRemiseGlobale = headerForm.option("formData.typeRemiseGlobale") || "Pourcentage";
    }

    let globalRemiseAmount = 0;
    if (typeRemiseGlobale === "MontantFixe") {
        globalRemiseAmount = remiseGlobale;
    } else {
        globalRemiseAmount = subtotalHT * (remiseGlobale / 100);
    }

    let netHT = subtotalHT - globalRemiseAmount;
    if (netHT < 0) netHT = 0;

    let ratio = subtotalHT > 0 ? (netHT / subtotalHT) : 1;
    let netTVA = totalTVA * ratio;
    let totalTTC = netHT + netTVA;

    let summaryHtml = `
        <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
            <span>Sous-Total HT:</span><span>${formatCurrency(subtotalHT)}</span>
        </div>`;

    if (remiseGlobale > 0) {
        const labelRem = typeRemiseGlobale === "MontantFixe" ? `${remiseGlobale.toFixed(3)} DT` : `${remiseGlobale}%`;
        summaryHtml += `
        <div style="display:flex; justify-content:space-between; margin-bottom:3px; color:#d97706;">
            <span>Remise Globale (${labelRem}):</span><span>-${formatCurrency(globalRemiseAmount)}</span>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
            <span>Net HT:</span><span>${formatCurrency(netHT)}</span>
        </div>`;
    }

    summaryHtml += `
        <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
            <span>TVA Total:</span><span>${formatCurrency(netTVA)}</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-weight:700; border-top:1px solid var(--border); padding-top:4px; color:var(--navy); font-size:13.5px;">
            <span>Total TTC:</span><span>${formatCurrency(totalTTC)}</span>
        </div>`;

    $("#devis-summary-box").html(summaryHtml);
}

async function soumettreDevis() {
    const headerForm = $("#dx-form-devis-header").dxForm("instance");
    if (!headerForm.validate().isValid) return;

    const grid = $("#dx-grid-devis-lines").dxDataGrid("instance");
    grid.closeEditCell();
    const lines = grid.option("dataSource") || [];

    if (lines.length === 0) {
        showToast("Veuillez ajouter au moins une ligne.", true);
        return;
    }

    // Vérification de validité
    for (const line of lines) {
        const produit = produitsData.find(p => p.id_Produit === line.produitId);

        if (!produit) {
            showToast("Spot publicitaire introuvable.", true);
            return;
        }
    }

    const headerData = headerForm.option("formData");
    const payload = {
        id_Partenaire: headerData.clientId,
        adresseFacturation: headerData.adresseFacturation,
        adresseLivraison: headerData.adresseLivraison,
        modePaiement: headerData.modePaiement || "Virement Bancaire",
        remiseGlobale: headerData.remiseGlobale || 0,
        typeRemiseGlobale: headerData.typeRemiseGlobale || "Pourcentage",
        dateValidite: headerData.dateValidite,
        lignes: lines.map(l => ({
            id_Produit: l.produitId,
            description: "",
            quantite: l.quantite || 1,
            prixUniversitaire: l.prixUniversitaire || 0,
            TauxTVA: l.TauxTVA !== undefined ? l.TauxTVA : 19,
            remise: l.remise || 0,
            typeRemise: l.typeRemise || "Pourcentage",
            emission: l.emission || "",
            montantHT: 0,
            montantTTC: 0
        }))
    };

    try {
        const res = await fetch('/api/devis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Erreur de création."); }
        showToast("Devis créé en brouillon !");
        $("#popup-devis").dxPopup("instance").hide();
        chargerDevis();
    } catch (err) {
        showToast(err.message, true);
    }
}