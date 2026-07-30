// --- MODULE COMMANDES ---

async function chargerCommandes() {
    try {
        const res = await fetch('/api/commandes');
        commandesData = await res.json();
        
        $("#grid-commandes").dxDataGrid({
            dataSource: commandesData,
            allowColumnReordering: true,
            allowColumnResizing: true,
            columnResizingMode: "widget",
            columnAutoWidth: true,
            showBorders: false,
            searchPanel: {
                visible: true,
                width: 260,
                placeholder: "Rechercher une commande..."
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
            pager: {
                showPageSizeSelector: true,
                allowedPageSizes: [5, 10, 20],
                showInfo: true
            },
            columns: [
                {
                    dataField: "numeroCommande",
                    caption: "N° Commande",
                    width: 150,
                    cellTemplate: (container, options) => {
                        $("<strong>").text(options.value).appendTo(container);
                }},
                {
                    dataField: "nomPartenaire",
                    caption: "Client",
                    width: 350,
                },
                {
                    dataField: "numeroDevis",
                    caption: "N° Devis",
                    width: 130
                },
                {
                    dataField: "dateCommande",
                    caption: "Date",
                    dataType: "date",
                    format: "dd/MM/yyyy",
                    width: 110
                },
                {
                    dataField: "statut",
                    caption: "Statut",
                    width: 120,
                    alignment: "center",
                    cellTemplate: renderStatusBadge
                },
                {
                    dataField: "montantTTC",
                    caption: "Montant TTC (TND)",
                    alignment: "right",
                    width: 160,
                    calculateCellValue: (row) => formatCurrency(row.montantTTC)
                },
                {
                    caption: "Actions",
                    alignment: "center",
                    cellTemplate: renderCommandeActions
                }
            ]
        });

    } catch (err) {
        console.error(err);
        showToast("Erreur de chargement des commandes.", true);
    }
}

// RENDU BADGE DE STATUT DANS LES GRIDS
function renderStatusBadge(container, options) {
    const val = options.value;
    let badgeClass = 'badge-gray';
    let label = val;
    if (val === 'Brouillon')
        badgeClass = 'badge-gray';
    else if (val === 'Validee') {
        badgeClass = 'badge-blue';
        label = 'Validée';
    }
    else if (val === 'Facturee') {
        badgeClass = 'badge-orange';
        label = 'Facturée';
    }
    else if (val === 'Cloturee') {
        badgeClass = 'badge-green';
        label = 'Clôturée';
    }
    else if (val === 'Annulee') {
        badgeClass = 'badge-red';
        label = 'Annulée';
    }
    else if (val === 'Payee') {
        badgeClass = 'badge-green';
        label = 'Payée';
    }
    else if (val === 'NonPayee') {
        badgeClass = 'badge-orange';
        label = 'Non Payée';
    }
    else if (val === 'EnRetard') {
        badgeClass = 'badge-red';
        label = 'En Retard';
    }
    $(`<span>`).addClass(`badge ${badgeClass}`).text(label).appendTo(container);
}

// RENDU ACTIONS DES COMMANDES
function renderCommandeActions(container, options) {
    const c = options.data;
    const $wrapper = $("<div style='display:flex; gap:4px; justify-content:center; flex-wrap:wrap;'>");

    // Bouton Voir Détails
    $("<button>").addClass("action-btn-dx btn-view")
        .html("<i class='fa-solid fa-eye'></i> Détails")
        .on("click", () => ouvrirDetailCommande(c.id_Commande))
        .appendTo($wrapper);

    // Bouton Télécharger PDF
    $("<button>")
        .addClass("action-btn-dx btn-view")
        .html("<i class='fa-solid fa-file-pdf'></i> PDF")
        .on("click", function (e) {
            e.preventDefault();
            window.open(`/api/commandes/${c.id_Commande}/pdf`, "_blank");
        })
        .appendTo($wrapper);

    if (c.statut === 'EnAttente') {
        // Valider
        $("<button>").addClass("action-btn-dx btn-approve")
            .html("<i class='fa-solid fa-check'></i> Valider")
            .on("click", () => validerCommande(c.id_Commande))
            .appendTo($wrapper);
        // Annuler
        $("<button>").addClass("action-btn-dx btn-cancel")
            .html("<i class='fa-solid fa-xmark'></i> Annuler")
            .on("click", () => annulerCommande(c.id_Commande))
            .appendTo($wrapper);
    } else if (c.statut === 'Validee') {
        // Facturer
        $("<button>").addClass("action-btn-dx btn-invoice")
            .html("<i class='fa-solid fa-file-invoice'></i> Facturer")
            .on("click", () => facturerCommande(c.id_Commande))
            .appendTo($wrapper);
        // Annuler
        $("<button>").addClass("action-btn-dx btn-cancel")
            .html("<i class='fa-solid fa-xmark'></i> Annuler")
            .on("click", () => annulerCommande(c.id_Commande))
            .appendTo($wrapper);
    }
    $wrapper.appendTo(container);
}

// ACTION LOGIQUE DES COMMANDES
async function validerCommande(id) {
    if (!confirm("Valider cette commande ? Un fichier PDF sera généré.")) return;
    try {
        const res = await fetch(`/api/commandes/${id}/valider`, { method: 'POST' });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || "Erreur de validation");
        }
        showToast("Commande validée ! Fichier PDF généré.");
        chargerToutesLesDonnees();
        chargerCommandes();
    } catch (err) {
        showToast(err.message, true);
    }
}

async function annulerCommande(id) {
    if (!confirm("Annuler cette commande ?")) return;
    try {
        const res = await fetch(`/api/commandes/${id}/annuler`, { method: 'POST' });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || "Erreur d'annulation");
        }
        showToast("Commande annulée.");
        chargerToutesLesDonnees();
        chargerCommandes();
    } catch (err) {
        showToast(err.message, true);
    }
}

async function facturerCommande(id) {
    try {
        const res = await fetch(`/api/commandes/${id}/facturer`, { method: 'POST' });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || "Erreur de facturation");
        }
        const fact = await res.json();
        showToast(`Facture ${fact.numeroFacture} émise avec succès !`);
        chargerToutesLesDonnees();
        chargerCommandes();
    } catch (err) {
        showToast(err.message, true);
    }
}

// --- DRAWER DÉTAILS COMMANDES (dxPopup) ---
function initPopupDetailCommande() {
    $("#popup-detail-commande").dxPopup({
        title: "Détail du Bon de Commande",
        width: 550,
        height: "auto",
        visible: false,
        dragEnabled: true,
        showCloseButton: true,
        contentTemplate: (container) => {
            $("<div id='detail-commande-content'>").appendTo(container);
        }
    });
}

async function validerCommandeDepuisPopup(id) {
    await validerCommande(id);
    $("#popup-detail-commande").dxPopup("instance").hide();
}

async function annulerCommandeDepuisPopup(id) {
    await annulerCommande(id);
    $("#popup-detail-commande").dxPopup("instance").hide();
}

async function facturerCommandeDepuisPopup(id) {
    await facturerCommande(id);
    $("#popup-detail-commande").dxPopup("instance").hide();
}

async function cloturerCommandeDepuisPopup(id) {
    await cloturerCommande(id);
    $("#popup-detail-commande").dxPopup("instance").hide();
}

async function ouvrirDetailCommande(id) {
    try {
        const res = await fetch(`/api/commandes/${id}`);
        if (!res.ok) throw new Error("Impossible de charger la commande.");
        const c = await res.json();

        const popup = $("#popup-detail-commande").dxPopup("instance");
        popup.show();

        const $content = $("#detail-commande-content");
        $content.empty();

        const dateFormatted = new Date(c.dateCommande).toLocaleDateString('fr-FR');
        let badgeClass = 'badge-gray';
        let badgeLabel = c.statut;
        
        if (c.statut === 'EnAttente')
            badgeClass = 'badge-gray';
        else if (c.statut === 'Validee') {
            badgeClass = 'badge-blue';
            badgeLabel = 'Validée';
        }
        else if (c.statut === 'Facturee') {
            badgeClass = 'badge-orange';
            badgeLabel = 'Facturée';
        }
        else if (c.statut === 'Cloturee') {
            badgeClass = 'badge-green';
            badgeLabel = 'Clôturée';
        }
        else if (c.statut === 'Annulee') {
            badgeClass = 'badge-red';
            badgeLabel = 'Annulée';
        }

        let actionsHtml = '';
        let linesHtml = '';

        if (c.statut === "EnAttente") {
            actionsHtml = `
                <div style="display:flex; gap:10px; margin-top:16px; flex-wrap:wrap;">
                    <button class="action-btn-dx btn-approve"
                            onclick="validerCommandeDepuisPopup(${c.id_Commande})">
                        <i class="fa-solid fa-check"></i> Valider
                    </button>

                    <button class="action-btn-dx btn-view"
                            onclick="window.open('/api/commandes/${c.id_Commande}/pdf', '_blank')">
                        <i class="fa-solid fa-file-pdf"></i> Télécharger PDF
                    </button>

                    <button class="action-btn-dx btn-cancel"
                            onclick="annulerCommandeDepuisPopup(${c.id_Commande})">
                        <i class="fa-solid fa-xmark"></i> Annuler
                    </button>
                </div>
            `;
        } else {
            actionsHtml = `
                <div style="display:flex; gap:10px; margin-top:16px; flex-wrap:wrap;">
                    ${c.statut === "Validee" ? `
                    <button class="action-btn-dx btn-invoice"
                            onclick="facturerCommandeDepuisPopup(${c.id_Commande})">
                        <i class="fa-solid fa-file-invoice"></i> Générer Facture
                    </button>
                    ` : ""}

                    <button class="action-btn-dx btn-view"
                            onclick="window.open('/api/commandes/${c.id_Commande}/pdf', '_blank')">
                        <i class="fa-solid fa-file-pdf"></i> Télécharger PDF
                    </button>
                </div>
            `;
        }
        c.lignes.forEach(l => {
            const remiseStr = l.remise > 0 ? `(-${l.remise}%)` : '';
            const emissionBadge = l.emission
                ? `<span class="badge badge-blue" style="margin-left:6px; font-size:11px;">${l.emission}</span>`
                : '';
            linesHtml += `
                <div class="detail-item-row" style="display:flex; justify-content:space-between; padding:8px 12px; background:var(--bg-app); border-radius:4px; margin-bottom:8px; font-size:13px;">
                    <div style="display:flex; flex-direction:column;">
                        <div><strong>${l.designation}</strong>${emissionBadge}</div>
                        <span style="font-size:11px; color:var(--text-muted);">${l.quantite} sec × ${formatCurrency(l.prixUniversitaire)} ${remiseStr} &mdash; TVA ${l.tauxTVA}%</span>
                    </div>
                    <strong style="align-self:center;">${formatCurrency(l.montantTTC)}</strong>
                </div>
            `;
        });
        $content.append(`
            <div style="margin-bottom: 20px;">
                <h4 style="font-size:11px; text-transform:uppercase; color:var(--text-light); margin-bottom:6px; font-weight:700;">Informations Générales</h4>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; padding:12px; background:var(--bg-app); border:1px solid var(--border); border-radius:8px; font-size:13px;">
                    <div><span style="color:var(--text-muted);">N° Commande:</span> <strong>${c.numeroCommande}</strong></div>
                    <div><span style="color:var(--text-muted);">Statut:</span> <span class="badge ${badgeClass}">${badgeLabel}</span></div>
                    <div><span style="color:var(--text-muted);">Date:</span> <strong>${dateFormatted}</strong></div>
                    <div><span style="color:var(--text-muted);">Réf. Devis:</span> <strong>${c.numeroDevis || 'N/A'}</strong></div>
                    <div><span style="color:var(--text-muted);">Total HT:</span> <strong>${formatCurrency(c.montantHT)}</strong></div>
                    <div><span style="color:var(--text-muted);">Total TVA:</span> <strong>${formatCurrency(c.montantTVA)}</strong></div>
                    <div><span style="color:var(--text-muted);">Total TTC:</span> <strong class="text-primary">${formatCurrency(c.montantTTC)}</strong></div>
                </div>
            </div>

            ${actionsHtml}

            <div style="margin-bottom: 20px;">
                <h4 style="font-size:11px; text-transform:uppercase; color:var(--text-light); margin-bottom:6px; font-weight:700;">Client</h4>
                <div style="padding:12px; background:var(--bg-app); border:1px solid var(--border); border-radius:8px; font-size:13px;">
                    <strong>${c.nomPartenaire}</strong>
                </div>
            </div>
            <div style="margin-bottom: 20px;">
                <h4 style="font-size:11px; text-transform:uppercase; color:var(--text-light); margin-bottom:6px; font-weight:700;">Lignes de Commande</h4>
                <div>${linesHtml}</div>
            </div>

            ${c.notes ? `
            <div>
                <h4 style="font-size:11px; text-transform:uppercase; color:var(--text-light); margin-bottom:6px; font-weight:700;">Notes</h4>
                <div style="padding:12px; background:var(--warning-light); border-left:3px solid var(--warning); border-radius:4px; font-size:13px; color:#92400e;">${c.notes}</div>
            </div>
            ` : ''}
        `);
    } catch (err) {
        showToast(err.message, true);
    }
}
