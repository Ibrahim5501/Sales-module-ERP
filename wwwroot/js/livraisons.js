// --- MODULE LIVRAISONS ---

async function chargerLivraisons() {
    try {
        const res = await fetch('/api/livraisons');
        if (!res.ok) throw new Error('Erreur chargement livraisons');
        livraisonsData = await res.json();

        // KPIs
        const total      = livraisonsData.length;
        const attente    = livraisonsData.filter(l => l.statut === 'EnAttente' || l.statut === 'EnCours').length;
        const livrees    = livraisonsData.filter(l => l.statut === 'Livree').length;
        const partielles = livraisonsData.filter(l => l.statut === 'Partielle').length;
        $('#kpi-liv-total').text(total);
        $('#kpi-liv-attente').text(attente);
        $('#kpi-liv-livrees').text(livrees);
        $('#kpi-liv-partielles').text(partielles);

        const gridEl = $("#grid-livraisons");
        if (gridEl.data("dxDataGrid")) {
            gridEl.dxDataGrid("instance").option("dataSource", livraisonsData);
        } else {
            gridEl.dxDataGrid({
                dataSource: livraisonsData,
                keyExpr: "id_Livraison",
                allowColumnReordering: true,
                allowColumnResizing: true,
                columnResizingMode: "widget",
                columnAutoWidth: true,
                showBorders: false,
                searchPanel: { visible: true, width: 260, placeholder: "Rechercher une livraison..." },
                groupPanel: { visible: true, placeholder: "Faites glisser une colonne pour grouper" },
                filterRow: { visible: true },
                headerFilter: { visible: true },
                paging: { pageSize: 10 },
                pager: { showPageSizeSelector: true, allowedPageSizes: [5, 10, 20], showInfo: true },
                columns: [
                    {
                        dataField: "numeroLivraison",
                        caption: "N° Livraison",
                        width: 150,
                        cellTemplate: (container, options) => {
                            $("<strong>").text(options.value).appendTo(container);
                        }
                    },
                    { dataField: "nomPartenaire",  caption: "Client",         width: 250 },
                    { dataField: "numeroCommande", caption: "N° Commande",  width: 140 },
                    { dataField: "devisOrigine",   caption: "Devis Origine",   width: 140 },
                    { dataField: "adresse",        caption: "Adresse Livraison", width: 200 },
                    {
                        dataField: "datePrevue",
                        caption: "Date Prévue",
                        dataType: "date",
                        format: "dd/MM/yyyy",
                        width: 120
                    },
                    {
                        dataField: "dateEcheance",
                        caption: "Date Échéance",
                        dataType: "date",
                        format: "dd/MM/yyyy",
                        width: 120
                    },
                    {
                        dataField: "statut",
                        caption: "Statut",
                        width: 130,
                        alignment: "center",
                        cellTemplate: renderLivraisonStatutBadge
                    },
                    {
                        caption: "Actions",
                        alignment: "center",
                        width: 280,
                        cellTemplate: renderLivraisonActions
                    }
                ]
            });
        }
    } catch (err) {
        console.error(err);
        showToast("Erreur de chargement des livraisons.", true);
    }
}

// BADGE STATUT LIVRAISON
function renderLivraisonStatutBadge(container, options) {
    const val = options.value;
    let badgeClass = 'badge-gray';
    let label = val;
    switch (val) {
        case 'EnAttente': badgeClass = 'badge-orange'; label = 'En Attente'; break;
        case 'EnCours':   badgeClass = 'badge-blue';   label = 'En Cours';   break;
        case 'Livree':    badgeClass = 'badge-green';  label = 'Livrée';    break;
        case 'Partielle': badgeClass = 'badge-gray';   label = 'Partielle';  break;
        case 'Annulee':   badgeClass = 'badge-red';    label = 'Annulée';   break;
    }
    $('<span>').addClass(`badge ${badgeClass}`).text(label).appendTo(container);
}

// ACTIONS LIVRAISON
function renderLivraisonActions(container, options) {
    const l = options.data;
    const $wrapper = $("<div style='display:flex; gap:4px; justify-content:center; flex-wrap:wrap;'>");

    // Voir Détails
    $("<button>").addClass("action-btn-dx btn-view")
        .html("<i class='fa-solid fa-eye'></i> Détails")
        .on("click", () => ouvrirDetailLivraison(l.id_Livraison))
        .appendTo($wrapper);

    // Saisir Quantités (si pas clôturée)
    if (l.statut === 'EnAttente' || l.statut === 'EnCours') {
        $("<button>").addClass("action-btn-dx btn-approve")
            .html("<i class='fa-solid fa-pen-to-square'></i> Saisir Qtés")
            .on("click", () => ouvrirSaisirQte(l.id_Livraison))
            .appendTo($wrapper);

        $("<button>").addClass("action-btn-dx btn-invoice")
            .html("<i class='fa-solid fa-check-double'></i> Valider")
            .on("click", () => validerLivraison(l.id_Livraison))
            .appendTo($wrapper);
    }

    // PDF (si livrée ou partielle)
    if (l.statut === 'Livree' || l.statut === 'Partielle') {
        $("<button>")
            .addClass("action-btn-dx btn-view")
            .html("<i class='fa-solid fa-file-pdf'></i> PDF")
            .on("click", function (e) {
                e.preventDefault();
                window.open(`/api/livraisons/${l.id_Livraison}/pdf`, "_blank");
            })
            .appendTo($wrapper);
    }

    // Annuler
    if (l.statut !== 'Livree' && l.statut !== 'Annulee') {
        $("<button>").addClass("action-btn-dx btn-cancel")
            .html("<i class='fa-solid fa-xmark'></i> Annuler")
            .on("click", () => annulerLivraison(l.id_Livraison))
            .appendTo($wrapper);
    }

    $wrapper.appendTo(container);
}

// POPUP DÉTAIL LIVRAISON (lecture seule)
function initPopupDetailLivraison() {
    $("#popup-detail-livraison").dxPopup({
        title: "Détail du Bon de Livraison",
        width: 700,
        height: "auto",
        maxHeight: "90vh",
        visible: false,
        dragEnabled: true,
        showCloseButton: true,
        contentTemplate: (container) => {
            $("<div id='detail-livraison-content' style='padding:12px;'>").appendTo(container);
        }
    });
}

async function ouvrirDetailLivraison(id) {
    try {
        const res = await fetch(`/api/livraisons/${id}`);
        const liv = await res.json();

        const statusLabels = {
            'EnAttente': 'En Attente', 'EnCours': 'En Cours',
            'Livree': 'Livrée', 'Partielle': 'Partielle', 'Annulee': 'Annulée'
        };
        const statusClasses = {
            'EnAttente': 'badge-orange', 'EnCours': 'badge-blue',
            'Livree': 'badge-green', 'Partielle': 'badge-gray', 'Annulee': 'badge-red'
        };

        const lignesRows = (liv.lignes || []).map(l => `
            <tr>
                <td style="padding:8px 10px;">${l.designation || 'Produit #' + l.id_Produit}</td>
                <td style="padding:8px 10px; text-align:center;">${l.qteCommande}</td>
                <td style="padding:8px 10px; text-align:center;">${l.qteReserve}</td>
                <td style="padding:8px 10px; text-align:center; font-weight:600;">${l.qteFait}</td>
            </tr>
        `).join('');

        const html = `
            <div style="font-family:Inter,sans-serif;">
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px;">
                    <div style="background:#f8fafc; border-radius:8px; padding:14px; border:1px solid #e2e8f0;">
                        <div style="font-size:11px; color:#64748b; text-transform:uppercase; letter-spacing:.05em; margin-bottom:8px;">Livraison</div>
                        <div style="font-size:18px; font-weight:700; color:#0f172a; margin-bottom:4px;">${liv.numeroLivraison}</div>
                        <div style="font-size:13px; color:#475569;">Commande: <strong>${liv.numeroCommande || '—'}</strong></div>
                        <div style="font-size:13px; color:#475569;">Devis: <strong>${liv.devisOrigine || '—'}</strong></div>
                        <div style="margin-top:8px;"><span class="badge ${statusClasses[liv.statut] || 'badge-gray'}">${statusLabels[liv.statut] || liv.statut}</span></div>
                    </div>
                    <div style="background:#f8fafc; border-radius:8px; padding:14px; border:1px solid #e2e8f0;">
                        <div style="font-size:11px; color:#64748b; text-transform:uppercase; letter-spacing:.05em; margin-bottom:8px;">Client &amp; Adresses</div>
                        <div style="font-size:14px; font-weight:600; color:#0f172a;">${liv.nomPartenaire}</div>
                        <div style="font-size:13px; color:#475569; margin-top:4px;">Adresse client: ${liv.adresseClient || '—'}</div>
                        <div style="font-size:13px; color:#475569;">Adresse livraison: <strong>${liv.adresse || '—'}</strong></div>
                        <div style="font-size:13px; color:#475569; margin-top:6px;">
                            Prévue: <strong>${new Date(liv.datePrevue).toLocaleDateString('fr-FR')}</strong> &nbsp;|&nbsp;
                            Échéance: <strong>${new Date(liv.dateEcheance).toLocaleDateString('fr-FR')}</strong>
                        </div>
                    </div>
                </div>

                <div style="background:#fff; border-radius:8px; border:1px solid #e2e8f0; overflow:hidden;">
                    <table style="width:100%; border-collapse:collapse;">
                        <thead>
                            <tr style="background:#0f172a; color:#fff;">
                                <th style="padding:10px; text-align:left; font-size:12px;">Produit / Article</th>
                                <th style="padding:10px; text-align:center; font-size:12px;">Qté Commandée</th>
                                <th style="padding:10px; text-align:center; font-size:12px;">Qté Réservée</th>
                                <th style="padding:10px; text-align:center; font-size:12px;">Qté Livrée</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${lignesRows || '<tr><td colspan="4" style="text-align:center; padding:20px; color:#94a3b8;">Aucune ligne</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        $("#detail-livraison-content").html(html);
        $("#popup-detail-livraison").dxPopup("instance").show();
    } catch (err) {
        showToast("Erreur lors du chargement du détail.", true);
    }
}

function initPopupSaisirQte() {
    $("#popup-saisir-qte").dxPopup({
        title: "Saisir les Quantités Livrées",
        width: 650,
        height: "auto",
        maxHeight: "90vh",
        visible: false,
        dragEnabled: true,
        showCloseButton: true,
        contentTemplate: (container) => {
            $("<div id='saisir-qte-content' style='padding:12px;'>").appendTo(container);
        },
        toolbarItems: [
            {
                widget: "dxButton",
                toolbar: "bottom",
                location: "after",
                options: {
                    text: "Enregistrer les Quantités",
                    type: "success",
                    icon: "save",
                    onClick: () => enregistrerQteFait()
                }
            },
            {
                widget: "dxButton",
                toolbar: "bottom",
                location: "after",
                options: {
                    text: "Fermer",
                    type: "normal",
                    onClick: () => $("#popup-saisir-qte").dxPopup("instance").hide()
                }
            }
        ]
    });
}

async function ouvrirSaisirQte(id) {
    try {
        const res = await fetch(`/api/livraisons/${id}`);
        const liv = await res.json();
        currentLivraisonPourQte = liv;

        const lignesHtml = (liv.lignes || []).map(l => `
            <tr>
                <td style="padding:10px 8px; font-size:13px;">${l.designation || 'Produit #' + l.id_Produit}</td>
                <td style="padding:10px 8px; text-align:center; font-size:13px;">${l.qteCommande}</td>
                <td style="padding:10px 8px; text-align:center; font-size:13px;">${l.qteReserve}</td>
                <td style="padding:10px 8px; text-align:center;">
                    <input
                        type="number"
                        id="qte-fait-${l.id_LivraisonLigne}"
                        data-ligne-id="${l.id_LivraisonLigne}"
                        data-qte-max="${l.qteCommande}"
                        value="${l.qteFait}"
                        min="0"
                        max="${l.qteCommande}"
                        step="1"
                        style="width:80px; padding:6px 8px; border:1px solid #cbd5e1; border-radius:6px; text-align:center; font-size:13px;"
                    />
                </td>
            </tr>
        `).join('');

        const html = `
            <div style="font-family:Inter,sans-serif;">
                <div style="background:#f0fdf4; border-radius:8px; padding:12px; margin-bottom:16px; border:1px solid #bbf7d0; font-size:13px; color:#166534;">
                    <i class="fa-solid fa-circle-info"></i>&nbsp;
                    Saisissez les quantités effectivement livrées. Si inférieure à la quantité commandée,
                    une livraison partielle sera créée automatiquement pour le reliquat.
                </div>
                <div style="font-size:14px; font-weight:600; color:#0f172a; margin-bottom:12px;">
                    ${liv.numeroLivraison} — ${liv.nomPartenaire}
                </div>
                <div style="background:#fff; border-radius:8px; border:1px solid #e2e8f0; overflow:hidden;">
                    <table style="width:100%; border-collapse:collapse;">
                        <thead>
                            <tr style="background:#0f172a; color:#fff;">
                                <th style="padding:10px; text-align:left; font-size:12px;">Article</th>
                                <th style="padding:10px; text-align:center; font-size:12px;">Qté Commandée</th>
                                <th style="padding:10px; text-align:center; font-size:12px;">Qté Réservée</th>
                                <th style="padding:10px; text-align:center; font-size:12px;">Qté Livrée ✏️</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${lignesHtml}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        $("#saisir-qte-content").html(html);
        $("#popup-saisir-qte").dxPopup("instance").show();
    } catch (err) {
        showToast("Erreur lors du chargement de la livraison.", true);
    }
}

async function enregistrerQteFait() {
    if (!currentLivraisonPourQte) return;

    const lignes = [];
    let valid = true;

    $('[data-ligne-id]').each(function () {
        const ligneId = parseInt($(this).data('ligne-id'));
        const max     = parseFloat($(this).data('qte-max'));
        const val     = parseFloat($(this).val()) || 0;

        if (val < 0 || val > max) {
            showToast(`Quantité invalide (0 ≤ valeur ≤ ${max}).`, true);
            valid = false;
            return false;
        }
        lignes.push({ id_LivraisonLigne: ligneId, qteFait: val });
    });

    if (!valid) return;

    try {
        const res = await fetch(`/api/livraisons/${currentLivraisonPourQte.id_Livraison}/saisir-qte`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lignes })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || "Erreur lors de l'enregistrement.");
        }

        showToast("Quantités enregistrées avec succès !");
        $("#popup-saisir-qte").dxPopup("instance").hide();
        currentLivraisonPourQte = null;
        chargerLivraisons();
    } catch (err) {
        showToast(err.message, true);
    }
}

async function validerLivraison(id) {
    if (!confirm("Valider cette livraison ? Un PDF sera généré. En cas de livraison partielle, une 2ème livraison sera créée automatiquement.")) return;
    try {
        const res = await fetch(`/api/livraisons/${id}/valider`, { method: 'POST' });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || "Erreur de validation.");
        }
        const data = await res.json();

        if (data.estPartielle) {
            showToast(`⚠️ Livraison partielle ! Une 2ème livraison ${data.secondeLivraison?.numeroLivraison || ''} a été créée automatiquement pour le reliquat.`);
        } else {
            showToast(`✅ Livraison ${data.livraison.numeroLivraison} validée ! PDF disponible.`);
        }
        chargerLivraisons();
    } catch (err) {
        showToast(err.message, true);
    }
}

async function annulerLivraison(id) {
    if (!confirm("Annuler cette livraison ?")) return;
    try {
        const res = await fetch(`/api/livraisons/${id}/annuler`, { method: 'POST' });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || "Erreur d'annulation.");
        }
        showToast("Livraison annulée.");
        chargerLivraisons();
    } catch (err) {
        showToast(err.message, true);
    }
}
