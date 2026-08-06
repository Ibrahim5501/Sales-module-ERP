// --- MODULE DEVIS ---

if (typeof configLigneFormInstance === 'undefined') { var configLigneFormInstance = null; }
if (typeof currentEditingLineIndex === 'undefined') { var currentEditingLineIndex = null; }

async function chargerDevis() {
    try {
        const res = await fetch('/api/devis');
        if (!res.ok) throw new Error("Erreur de chargement des devis.");
        devisData = await res.json();
        if (!Array.isArray(devisData)) devisData = [];

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
                        $("<strong>").text(options.value || "").appendTo(container); 
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
                    calculateCellValue: (row) => formatCurrency(row.montantHT || 0)
                },
                {
                    dataField: "montantTTC",
                    caption: "Total TTC (TND)",
                    alignment: "right",
                    width: 150,
                    calculateCellValue: (row) => formatCurrency(row.montantTTC || 0)
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
        showToast(err.message || "Erreur de chargement des devis.", true);
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
    const [cls, label] = map[val] || ['badge-gray', val || 'N/A'];
    $("<span>").addClass(`badge ${cls}`).text(label).appendTo(container);
}

function renderDevisActions(container, options) {
    const d = options.data;
    if (!d) return;
    const devisId = d.id_Devis || d.id_devis || d.id;
    const $wrap = $("<div style='display:flex; gap:4px; justify-content:center; flex-wrap:wrap;'>");

    // Bouton Voir Détails
    $("<button>").addClass("action-btn-dx btn-view")
        .html("<i class='fa-solid fa-eye'></i> Détails")
        .on("click", () => ouvrirDetailDevis(devisId))
        .appendTo($wrap);

    // Bouton Télécharger PDF
    $("<button>")
        .addClass("action-btn-dx btn-view")
        .html("<i class='fa-solid fa-file-pdf'></i> PDF")
        .on("click", function (e) {
            e.preventDefault();
            window.open(`/api/devis/${devisId}/pdf`, "_blank");
        })
        .appendTo($wrap);

    if (d.statut === 'Brouillon') {
        // Envoyer
        $("<button>").addClass("action-btn-dx btn-approve")
            .html("<i class='fa-solid fa-paper-plane'></i> Envoyer")
            .on("click", function (e) {
                e.preventDefault();
                envoyerDevis(devisId);
            })
            .appendTo($wrap);

        // Accepter directement
        $("<button>").addClass("action-btn-dx btn-invoice")
            .html("<i class='fa-solid fa-check-double'></i> Accepter")
            .on("click", () => accepterDevis(devisId))
            .appendTo($wrap);

        // Refuser
        $("<button>").addClass("action-btn-dx btn-cancel")
            .html("<i class='fa-solid fa-xmark'></i> Refuser")
            .on("click", () => refuserDevis(devisId))
            .appendTo($wrap);
    }
    else if (d.statut === 'Envoye') {
        $("<button>").addClass("action-btn-dx btn-invoice")
            .html("<i class='fa-solid fa-check-double'></i> Accepter")
            .on("click", () => accepterDevis(devisId))
            .appendTo($wrap);

        $("<button>").addClass("action-btn-dx btn-cancel")
            .html("<i class='fa-solid fa-xmark'></i> Refuser")
            .on("click", () => refuserDevis(devisId))
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
        if (popup) popup.show();

        const $content = $("#detail-devis-content");
        $content.empty();

        const dateDevis = d.dateDevis ? new Date(d.dateDevis).toLocaleDateString("fr-FR") : "N/A";
        const dateValidite = d.dateValidite ? new Date(d.dateValidite).toLocaleDateString("fr-FR") : "N/A";

        let badgeClass = "badge-gray";
        let badgeLabel = d.statut || "N/A";

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

        const devisId = d.id_Devis || d.id_devis || d.id || id;
        let actionsHtml = "";
        let linesHtml = "";

        if (d.statut === "Brouillon") {
            actionsHtml = `
            <div style="display:flex; gap:10px; margin-top:16px; flex-wrap:wrap;">
                <button class="action-btn-dx btn-invoice"
                        onclick="accepterDevisDepuisPopup(${devisId})">
                    <i class="fa-solid fa-check-double"></i> Accepter
                </button>

                <button class="action-btn-dx btn-approve"
                        onclick="envoyerDevisDepuisPopup(${devisId})">
                    <i class="fa-solid fa-paper-plane"></i> Envoyer
                </button>

                <button class="action-btn-dx btn-view"
                        onclick="window.open('/api/devis/${devisId}/pdf', '_blank')">
                    <i class="fa-solid fa-file-pdf"></i> Télécharger PDF
                </button>

                <button class="action-btn-dx btn-cancel"
                        onclick="refuserDevisDepuisPopup(${devisId})">
                    <i class="fa-solid fa-xmark"></i> Refuser
                </button>
            </div>
            `;
        } else {
            actionsHtml = `
            <div style="display:flex; gap:10px; margin-top:16px; flex-wrap:wrap;">
                ${d.statut === "Envoye" ? `
                <button class="action-btn-dx btn-invoice"
                        onclick="accepterDevisDepuisPopup(${devisId})">
                    <i class="fa-solid fa-check-double"></i> Accepter
                </button>
                ` : ""}

                <button class="action-btn-dx btn-view"
                        onclick="window.open('/api/devis/${devisId}/pdf', '_blank')">
                    <i class="fa-solid fa-file-pdf"></i> Télécharger PDF
                </button>

                ${d.statut === "Envoye" ? `
                <button class="action-btn-dx btn-cancel"
                        onclick="refuserDevisDepuisPopup(${devisId})">
                    <i class="fa-solid fa-xmark"></i> Refuser
                </button>
                ` : ""}
            </div>
            `;
        }

        (d.lignes || []).forEach(l => {
            const remiseVal = Number(l.remise || 0);
            const remiseStr = remiseVal > 0 ? (l.typeRemise === "MontantFixe" ? `(-${remiseVal.toFixed(3)} DT)` : `(-${remiseVal}%)`) : "";
            const emissionBadge = l.emission ? `<span class="badge badge-blue" style="margin-left:6px; font-size:11px;">${l.emission}</span>` : "";
            const tvaTaux = l.tauxTVA !== undefined ? l.tauxTVA : (l.TauxTVA !== undefined ? l.TauxTVA : 19);
            const designation = l.designation || l.nomSpot || l.description || "Article";
            const qte = l.quantite || 1;
            const duree = l.dureeSecondes || 30;

            linesHtml += `
                <div class="detail-item-row"
                     style="display:flex; justify-content:space-between; padding:8px 12px; background:var(--bg-app); border-radius:4px; margin-bottom:8px; font-size:13px;">
                    <div style="display:flex; flex-direction:column;">
                        <div><strong>${designation}</strong>${emissionBadge}</div>
                        <span style="font-size:11px;color:var(--text-muted);">
                            ${qte} spot(s) × ${duree}s @ ${formatCurrency(l.prixUniversitaire || 0)}/s ${remiseStr} &mdash; TVA ${tvaTaux}%
                        </span>
                    </div>
                    <strong style="align-self:center;">
                        ${formatCurrency(l.montantTTC || 0)}
                    </strong>
                </div>
            `;
        });

        $content.append(`
            <div style="margin-bottom:20px;">
                <h4 style="font-size:11px; text-transform:uppercase; color:var(--text-light); margin-bottom:6px; font-weight:700;">Informations Générales</h4>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; padding:12px; background:var(--bg-app); border:1px solid var(--border); border-radius:8px; font-size:13px;">
                    <div><span style="color:var(--text-muted);">N° Devis :</span> <strong>${d.numeroDevis || 'N/A'}</strong></div>
                    <div><span style="color:var(--text-muted);">Statut :</span> <span class="badge ${badgeClass}">${badgeLabel}</span></div>
                    <div><span style="color:var(--text-muted);">Date :</span> <strong>${dateDevis}</strong></div>
                    <div><span style="color:var(--text-muted);">Validité :</span> <strong>${dateValidite}</strong></div>
                    <div><span style="color:var(--text-muted);">Créé par :</span> <strong>${d.createdByUsername || 'N/A'}</strong></div>
                    <div><span style="color:var(--text-muted);">Mode Paiement :</span> <strong>${d.modePaiement || 'Virement Bancaire'}</strong></div>
                    <div><span style="color:var(--text-muted);">Période Campagne :</span> <strong>${(d.dateDebutDiffusion || d.dateFinDiffusion) ? `Du ${d.dateDebutDiffusion ? new Date(d.dateDebutDiffusion).toLocaleDateString('fr-FR') : '...'} au ${d.dateFinDiffusion ? new Date(d.dateFinDiffusion).toLocaleDateString('fr-FR') : '...'}` : 'Non restreinte'}</strong></div>
                    <div><span style="color:var(--text-muted);">Remise Globale :</span> <strong>${(d.remiseGlobale || 0) > 0 ? (d.typeRemiseGlobale === 'MontantFixe' ? Number(d.remiseGlobale).toFixed(3) + ' DT' : d.remiseGlobale + '%') : 'Aucune'}</strong></div>
                    <div><span style="color:var(--text-muted);">Total HT :</span> <strong>${formatCurrency(d.montantHT || 0)}</strong></div>
                    <div><span style="color:var(--text-muted);">Total TTC :</span> <strong class="text-primary">${formatCurrency(d.montantTTC || 0)}</strong></div>
                </div>
            </div>

            <div style="margin-bottom:20px;">
                ${actionsHtml}
                <h4 style="font-size:11px; text-transform:uppercase; color:var(--text-light); margin-bottom:6px; font-weight:700;">Client</h4>
                <div style="padding:12px; background:var(--bg-app); border:1px solid var(--border); border-radius:8px; font-size:13px;">
                    <strong>${d.nomPartenaire || 'N/A'}</strong>
                </div>
            </div>

            <div style="margin-bottom:20px;">
                <h4 style="font-size:11px; text-transform:uppercase; color:var(--text-light); margin-bottom:6px; font-weight:700;">Lignes du Devis</h4>
                ${linesHtml || '<p style="color:var(--text-muted); font-size:13px;">Aucune ligne dans ce devis.</p>'}
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
            const e = await res.json().catch(() => ({}));
            throw new Error(e.message || e.title || "Erreur lors de l'envoi");
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
            const e = await res.json().catch(() => ({}));
            throw new Error(e.message || e.title || "Erreur lors de l'annulation du devis");
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
            const e = await res.json().catch(() => ({}));
            throw new Error(e.message || e.title || "Erreur lors de l'acceptation du devis");
        }
        const cmd = await res.json();
        showToast(`Devis accepté ! Commande ${cmd.numeroCommande || ''} et PDF générés.`);
        chargerDevis();
        if (typeof chargerToutesLesDonnees === "function") {
            chargerToutesLesDonnees();
        }
    } catch (err) {
        showToast(err.message, true);
    }
}

async function accepterDevisDepuisPopup(id) {
    await accepterDevis(id);
    const popup = $("#popup-detail-devis").dxPopup("instance");
    if (popup) popup.hide();
}

async function envoyerDevisDepuisPopup(id) {
    await envoyerDevis(id);
    const popup = $("#popup-detail-devis").dxPopup("instance");
    if (popup) popup.hide();
}

async function refuserDevisDepuisPopup(id) {
    await refuserDevis(id);
    const popup = $("#popup-detail-devis").dxPopup("instance");
    if (popup) popup.hide();
}


// --- POPUP CREATION DEVIS ---
function initPopupDevis() {
    $("#popup-devis").dxPopup({
        title: "Créer un Devis Commercial",
        width: 1200,
        height: "80vh",
        maxHeight: "90vh",
        visible: false,
        deferRendering: false,
        dragEnabled: true,
        showCloseButton: true,
        contentTemplate: (container) => {
            container.css("overflow-y", "auto");
            const form = $("<div id='dx-form-devis-header'>").appendTo(container);

            form.dxForm({
                formData: {
                    clientId: null,
                    adresseFacturation: "",
                    adresseLivraison: "",
                    modePaiement: "Virement Bancaire",
                    remiseGlobale: 0,
                    typeRemiseGlobale: "Pourcentage",
                    dateDebutDiffusion: null,
                    dateFinDiffusion: null,
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
                            dataSource: clientsData || [],
                            valueExpr: "id_Partenaire",
                            displayExpr: item => item ? `${item.nom} (${item.entreprise})` : "",
                            searchEnabled: true,
                            placeholder: "-- Sélectionner le client --",
                            onValueChanged(e) {
                                const client = (clientsData || []).find(c => c.id_Partenaire === e.value);
                                if (!client) return;
                                const formInst = $("#dx-form-devis-header").dxForm("instance");
                                if (formInst) {
                                    formInst.updateData("adresseFacturation", client.adresse || "");
                                    formInst.updateData("adresseLivraison", client.adresse || "");
                                }
                            }
                        },
                        validationRules: [{ type: "required", message: "Le client est obligatoire." }]
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
                                    onClick() {
                                        if (typeof initPopupClient === "function") initPopupClient();
                                        const p = $("#popup-client").dxPopup("instance");
                                        if (p) p.show();
                                    }
                                }
                            },
                            {
                                itemType: "button",
                                buttonOptions: {
                                    icon: "product",
                                    text: "Nouveau spot",
                                    type: "normal",
                                    width: "100%",
                                    onClick() {
                                        if (typeof ouvrirPopupArticle === "function") ouvrirPopupArticle();
                                    }
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
                        dataField: "dateDebutDiffusion",
                        colSpan: 1,
                        label: { text: "Date Début Diffusion (Campagne)" },
                        editorType: "dxDateBox",
                        editorOptions: {
                            type: "date",
                            displayFormat: "dd/MM/yyyy",
                            showClearButton: true,
                            placeholder: "-- Début de campagne --"
                        }
                    },
                    {
                        dataField: "dateFinDiffusion",
                        colSpan: 1,
                        label: { text: "Date Fin Diffusion (Campagne)" },
                        editorType: "dxDateBox",
                        editorOptions: {
                            type: "date",
                            displayFormat: "dd/MM/yyyy",
                            showClearButton: true,
                            placeholder: "-- Fin de campagne --"
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

            $(`
                <div style="margin-top:20px; border-top:1px dashed var(--border); padding-top:15px;">
                    <h4 style="font-weight:700; font-size:13.5px; margin-bottom:8px;">
                        <i class="fa-solid fa-list"></i> Lignes du Devis
                    </h4>
                    <div id="dx-grid-devis-lines"></div>
                </div>
            `).appendTo(container);

            const grid = $("#dx-grid-devis-lines");

            grid.dxDataGrid({
                dataSource: internalDevisLines,
                allowColumnResizing: true,
                columnResizingMode: "widget",
                columnAutoWidth: true,
                editing: {
                    mode: "row",
                    allowAdding: false,
                    allowUpdating: false,
                    allowDeleting: true,
                    newRowPosition: "last",
                    confirmDelete: false
                },
                showBorders: true,
                height: 220,
                scrolling: { mode: "virtual" },
                toolbar: {
                    items: [
                        {
                            widget: "dxButton",
                            location: "before",
                            options: {
                                icon: "plus",
                                text: "Ajouter une ligne",
                                type: "default",
                                onClick: () => ouvrirPopupConfigDevisLigne()
                            }
                        }
                    ]
                },
                columns: [
                    {
                        dataField: "nomVariante",
                        caption: "Spot Publicitaire",
                        width: 200,
                        allowEditing: false,
                        cellTemplate: (container, options) => {
                            const row = options.data;
                            if (!row) return;
                            $('<div>')
                                .append($('<strong>').text(row.nomVariante || row.nomSpot || 'N/A'))
                                .append(row.nomPlage ? $('<span class="badge badge-blue" style="margin-left:6px;font-size:10px;">').text(row.nomPlage) : '')
                                .appendTo(container);
                        }
                    },
                    {
                        dataField: "prixUniversitaire",
                        caption: "Prix HT/sec",
                        dataType: "number",
                        allowEditing: false,
                        width: 100,
                        alignment: "right",
                        format: "#,##0.000"
                    },
                    {
                        dataField: "dureeSecondes",
                        caption: "Durée",
                        dataType: "number",
                        allowEditing: false,
                        width: 80,
                        alignment: "center",
                        cellTemplate: (container, options) => {
                            $('<span>').text(`${options.value || 30} s`).appendTo(container);
                        }
                    },
                    {
                        dataField: "quantite",
                        caption: "Quantité",
                        dataType: "number",
                        allowEditing: false,
                        width: 80,
                        alignment: "center",
                        cellTemplate: (container, options) => {
                            $('<span>').text(`${options.value || 1}`).appendTo(container);
                        }
                    },
                    {
                        dataField: "remise",
                        caption: "Remise",
                        width: 80,
                        allowEditing: false,
                        alignment: "center",
                        cellTemplate: (container, options) => {
                            const row = options.data;
                            if (!row) return;
                            const label = row.typeRemise === 'MontantFixe' ? `${(options.value || 0).toFixed(3)} TND` : `${options.value || 0}%`;
                            $('<span>').text(label).appendTo(container);
                        }
                    },
                    {
                        dataField: "TauxTVA",
                        caption: "TVA",
                        width: 60,
                        allowEditing: false,
                        alignment: "center",
                        cellTemplate: (container, options) => {
                            const val = options.value !== undefined ? options.value : (options.data ? options.data.tauxTVA : 19);
                            $('<span>').text(`${val || 0}%`).appendTo(container);
                        }
                    },
                    {
                        caption: "Total HT",
                        dataType: "number",
                        allowEditing: false,
                        alignment: "right",
                        width: 110,
                        calculateCellValue: (row) => {
                            if (!row || !row.prixUniversitaire) return 0;
                            const qte = row.quantite || 1;
                            const duree = row.dureeSecondes || 30;
                            let montantBrut = row.prixUniversitaire * duree * qte;
                            let remVal = 0;
                            if (row.typeRemise === "MontantFixe") {
                                remVal = row.remise || 0;
                            } else {
                                remVal = montantBrut * ((row.remise || 0) / 100);
                            }
                            let res = montantBrut - remVal;
                            return res < 0 ? 0 : res;
                        },
                        cellTemplate: (container, options) => {
                            $('<strong>').text(formatCurrency(options.value)).appendTo(container);
                        }
                    },
                    {
                        type: "buttons",
                        width: 100,
                        buttons: [
                            {
                                hint: "Modifier",
                                icon: "edit",
                                onClick: e => ouvrirPopupConfigDevisLigne(e.row.rowIndex)
                            },
                            {
                                name: "delete",
                                hint: "Supprimer"
                            }
                        ]
                    }
                ],
                onRowRemoved: () => recalculerTotauxDevisPopup()
            });

            $(`
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
            `).appendTo(container);
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
                    onClick: () => {
                        const popup = $("#popup-devis").dxPopup("instance");
                        if (popup) popup.hide();
                    }
                }
            }
        ]
    });
}

function ouvrirNouveauDevisPopup() {
    internalDevisLines = [];

    const popup = $("#popup-devis").dxPopup("instance");
    if (!popup) return;
    popup.show();

    const form = $("#dx-form-devis-header").dxForm("instance");
    if (form) {
        const clientEditor = form.getEditor("clientId");
        if (clientEditor) {
            clientEditor.option("dataSource", clientsData || []);
        }

        const defaultHeaderData = {
            clientId: null,
            adresseFacturation: "",
            adresseLivraison: "",
            modePaiement: "Virement Bancaire",
            remiseGlobale: 0,
            typeRemiseGlobale: "Pourcentage",
            dateDebutDiffusion: null,
            dateFinDiffusion: null,
            dateValidite: new Date(new Date().setDate(new Date().getDate() + 30))
        };

        form.option("formData", defaultHeaderData);
        if (typeof form.resetValidation === "function") {
            form.resetValidation();
        }
    }

    const grid = $("#dx-grid-devis-lines").dxDataGrid("instance");
    if (grid) {
        grid.option("dataSource", internalDevisLines);
        grid.refresh();
    }
    recalculerTotauxDevisPopup();
}

function recalculerTotauxDevisPopup() {
    const grid = $("#dx-grid-devis-lines").dxDataGrid("instance");
    const items = grid ? (grid.option("dataSource") || []) : internalDevisLines;
    let subtotalHT = 0;
    let totalTVA = 0;

    items.forEach(l => {
        if (l.prixUniversitaire) {
            const qte = l.quantite || 1;
            const duree = l.dureeSecondes || 30;
            let montantBrut = l.prixUniversitaire * duree * qte;
            let remVal = 0;
            if (l.typeRemise === "MontantFixe") {
                remVal = l.remise || 0;
            } else {
                remVal = montantBrut * ((l.remise || 0) / 100);
            }
            let lineHT = montantBrut - remVal;
            if (lineHT < 0) lineHT = 0;

            const tvaTaux = l.TauxTVA !== undefined ? l.TauxTVA : (l.tauxTVA !== undefined ? l.tauxTVA : 19);
            let lineTVA = lineHT * (tvaTaux / 100);
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
        const labelRem = typeRemiseGlobale === "MontantFixe" ? `${Number(remiseGlobale).toFixed(3)} DT` : `${remiseGlobale}%`;
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
    if (!headerForm || !headerForm.validate().isValid) return;

    const grid = $("#dx-grid-devis-lines").dxDataGrid("instance");
    if (grid) grid.closeEditCell();
    const lines = grid ? (grid.option("dataSource") || []) : internalDevisLines;

    if (lines.length === 0) {
        showToast("Veuillez ajouter au moins une ligne.", true);
        return;
    }

    // Vérification de validité
    for (const line of lines) {
        if (!line.produitId) {
            showToast("Chaque ligne doit comporter un spot publicitaire.", true);
            return;
        }
        const produit = (produitsData || []).find(p => p.id_Produit === line.produitId);
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
        dateDebutDiffusion: headerData.dateDebutDiffusion ? new Date(headerData.dateDebutDiffusion).toISOString() : null,
        dateFinDiffusion: headerData.dateFinDiffusion ? new Date(headerData.dateFinDiffusion).toISOString() : null,
        dateValidite: headerData.dateValidite,
        lignes: lines.map(l => ({
            id_Produit: l.produitId,
            description: l.nomVariante || l.nomSpot || "",
            quantite: l.quantite || 1,
            dureeSecondes: l.dureeSecondes || 30,
            prixUniversitaire: l.prixUniversitaire || 0,
            TauxTVA: l.TauxTVA !== undefined ? l.TauxTVA : (l.tauxTVA !== undefined ? l.tauxTVA : 19),
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
        if (!res.ok) {
            const e = await res.json().catch(() => ({}));
            throw new Error(e.message || e.title || "Erreur de création.");
        }
        showToast("Devis créé en brouillon !");
        const popup = $("#popup-devis").dxPopup("instance");
        if (popup) popup.hide();
        chargerDevis();
    } catch (err) {
        showToast(err.message, true);
    }
}
