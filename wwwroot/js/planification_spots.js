// ============================================================================
// MODULE: PLANIFICATION DES SPOTS PUBLICITAIRES
// ============================================================================

// Enum statut labels (must match C# StatutPlanificationSpot.ToFrenchString())
const STATUTS_SPOT = {
    PLANIFIE: "Planifié",
    DIFFUSE:  "Diffusé",
    ANNULE:   "Annulé"
};

const STATUT_LIST = [STATUTS_SPOT.PLANIFIE, STATUTS_SPOT.DIFFUSE, STATUTS_SPOT.ANNULE];

const STATUT_COLORS = {
    [STATUTS_SPOT.PLANIFIE]: { badge: "badge-warning",  hex: "#f59e0b" },
    [STATUTS_SPOT.DIFFUSE]:  { badge: "badge-success",  hex: "#22c55e" },
    [STATUTS_SPOT.ANNULE]:   { badge: "badge-danger",   hex: "#ef4444" }
};

let currentCommandePlanning  = null;
let currentCommandePlannedSpots = [];
let currentViewMode = "grid"; // "grid" | "calendar"

$(document).ready(function () {
    if ($("#grid-planification-spots").length) {
        initGridPlanificationSpots();
    }
});

// ----------------------------------------------------------------------------
// 1. GRID PRINCIPALE: TOUS LES SPOTS PLANIFIÉS
// ----------------------------------------------------------------------------
function initGridPlanificationSpots() {
    $("#grid-planification-spots").dxDataGrid({
        dataSource: [],
        keyExpr: "id_PlanificationSpot",
        showBorders: true,
        columnAutoWidth: true,
        rowAlternationEnabled: true,
        paging: { pageSize: 10 },
        pager: {
            showPageSizeSelector: true,
            allowedPageSizes: [5, 10, 20, 50],
            showInfo: true
        },
        searchPanel: { visible: true, placeholder: "Rechercher un spot, une commande, un client..." },
        filterRow: { visible: true },
        headerFilter: { visible: true },
        sorting: { mode: "multiple" },
        export: { enabled: true, fileName: "Planification_Spots_Publicitaires" },
        columns: [
            {
                dataField: "numeroCommande",
                caption: "N° Bon de Commande",
                width: 160,
                cellTemplate: function (container, options) {
                    const row = options.data;
                    $("<span>")
                        .addClass("badge-blue")
                        .css("cursor", "pointer")
                        .html(`<i class="fa-solid fa-cart-shopping"></i> ${row.numeroCommande || 'CMD-' + row.id_Commande}`)
                        .appendTo(container)
                        .on("click", function () {
                            ouvrirPopupPlanificationCommande(row.id_Commande);
                        });
                }
            },
            {
                dataField: "nomPartenaire",
                caption: "Client / Partenaire",
                width: 200,
                cellTemplate: function (container, options) {
                    $("<div>")
                        .html(`<strong>${options.value || 'Client'}</strong>`)
                        .appendTo(container);
                }
            },
            {
                dataField: "designationProduit",
                caption: "Spot Publicitaire",
                cellTemplate: function (container, options) {
                    const row = options.data;
                    $("<div>")
                        .html(`<strong>${row.designationProduit}</strong> <small style="color:#64748b;">(${row.codeProduit})</small>`)
                        .appendTo(container);
                }
            },
            {
                dataField: "dateHeureDiffusion",
                caption: "Date & Heure Diffusion",
                dataType: "datetime",
                format: "dd/MM/yyyy HH:mm",
                sortOrder: "asc",
                width: 170,
                cellTemplate: function (container, options) {
                    const d = new Date(options.value);
                    $("<div>")
                        .html(`<i class="fa-regular fa-calendar" style="color:#3b82f6;"></i> ${d.toLocaleDateString('fr-FR')} &nbsp;<i class="fa-regular fa-clock"></i> ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`)
                        .appendTo(container);
                }
            },
            {
                dataField: "dureeSecondes",
                caption: "Durée",
                width: 80,
                alignment: "center",
                cellTemplate: (c, o) => $("<span>").text(`${o.value} s`).appendTo(c)
            },
            {
                dataField: "nomPlageHoraire",
                caption: "Plage Horaire",
                width: 150,
                cellTemplate: function (container, options) {
                    const row = options.data;
                    if (!options.value) {
                        $("<span style='color:#94a3b8; font-style:italic;'>").text("Libre").appendTo(container);
                    } else {
                        $("<span>").text(`${options.value} (${row.heureDebutPlage}-${row.heureFinPlage})`).appendTo(container);
                    }
                }
            },
            {
                dataField: "statut",
                caption: "Statut",
                width: 120,
                alignment: "center",
                lookup: {
                    dataSource: STATUT_LIST
                },
                cellTemplate: function (container, options) {
                    const val = options.value || STATUTS_SPOT.PLANIFIE;
                    const color = STATUT_COLORS[val] || STATUT_COLORS[STATUTS_SPOT.PLANIFIE];
                    $(`<span class="badge ${color.badge}">`).text(val).appendTo(container);
                }
            },
            {
                caption: "Actions",
                width: 160,
                alignment: "center",
                cellTemplate: function (container, options) {
                    const row = options.data;
                    const wrap = $("<div style='display:flex; gap:4px; justify-content:center;'>").appendTo(container);

                    $("<button class='btn btn-xs btn-outline-primary' title='Planifier'>")
                        .html("<i class='fa-solid fa-calendar-days'></i>")
                        .on("click", () => ouvrirPopupPlanificationCommande(row.id_Commande))
                        .appendTo(wrap);

                    $("<button class='btn btn-xs btn-outline-danger' title='Supprimer'>")
                        .html("<i class='fa-solid fa-trash'></i>")
                        .on("click", () => supprimerSpotPlanifie(row.id_PlanificationSpot))
                        .appendTo(wrap);
                }
            }
        ]
    });
}

// Charge et rafraîchit le datagrid principal
function chargerPlanificationSpots() {
    makeRequest('/api/PlanificationSpots', 'GET')
        .then(data => {
            planificationSpotsData = data || [];
            const grid = $("#grid-planification-spots");
            if (grid.length && grid.data("dxDataGrid")) {
                grid.dxDataGrid("instance").option("dataSource", planificationSpotsData);
                grid.dxDataGrid("instance").refresh();
            }
            mettreAJourKpiSpots(planificationSpotsData);
        })
        .catch(err => {
            console.error("Erreur chargement planification spots:", err);
        });
}

function mettreAJourKpiSpots(data) {
    const total     = data.length;
    const planifies = data.filter(s => s.statut === STATUTS_SPOT.PLANIFIE).length;
    const diffuses  = data.filter(s => s.statut === STATUTS_SPOT.DIFFUSE).length;
    const annules   = data.filter(s => s.statut === STATUTS_SPOT.ANNULE).length;

    $("#kpi-spots-total").text(total);
    $("#kpi-spots-planifies").text(planifies);
    $("#kpi-spots-diffuses").text(diffuses);
    $("#kpi-spots-annules").text(annules);
}

// ----------------------------------------------------------------------------
// POPUP DE PLANIFICATION DES SPOTS POUR UN BON DE COMMANDE
// ----------------------------------------------------------------------------
function ouvrirPopupPlanificationCommande(commandeId) {
    if (!commandeId) return;

    Promise.all([
        makeRequest(`/api/Commandes/${commandeId}`, 'GET'),
        makeRequest(`/api/PlanificationSpots/commande/${commandeId}`, 'GET'),
        makeRequest(`/api/PlagesHoraires`, 'GET')
    ]).then(([commande, spots, plages]) => {
        currentCommandePlanning     = commande;
        currentCommandePlannedSpots = spots || [];
        window.plagesHorairesData   = plages || [];
        currentViewMode = "grid"; // reset to grid view each open

        afficherModalPlanificationCommande(commande, spots);
    }).catch(err => {
        console.error("Erreur chargement données commande spot:", err);
        showToast("Impossible de charger la commande.", "error");
    });
}

function afficherModalPlanificationCommande(commande, spots) {
    const popupContainer = $("#popup-planification-commande");
    if (!popupContainer.length) return;

    const devisPlageText = (commande.dateDebutDiffusion || commande.dateFinDiffusion)
        ? `Du ${commande.dateDebutDiffusion ? new Date(commande.dateDebutDiffusion).toLocaleDateString('fr-FR') : '...'} au ${commande.dateFinDiffusion ? new Date(commande.dateFinDiffusion).toLocaleDateString('fr-FR') : '...'}`
        : "Aucune restriction (Toutes dates autorisées)";

    const totalSpotsDemandés          = (commande.lignes || []).reduce((sum, l) => sum + (parseFloat(l.quantite) || 0), 0);
    const totalSpotsPlanifiesOuDiffuses = spots.filter(s => s.statut !== STATUTS_SPOT.ANNULE).length;
    const restants = Math.max(0, totalSpotsDemandés - totalSpotsPlanifiesOuDiffuses);

    const popupTitle = `Planification des Spots — Bon de Commande N° ${commande.numeroCommande || ('CMD-' + commande.id_Commande)}`;

    popupContainer.dxPopup({
        title: popupTitle,
        width: "92vw",
        maxWidth: 1150,
        height: "90vh",
        visible: true,
        dragEnabled: true,
        showCloseButton: true,
        contentTemplate: function (container) {
            container.empty();

            const content = $(`
                <div class="popup-planification-content" style="display:flex; flex-direction:column; gap:14px; height:100%; overflow:hidden;">

                    <!-- Entête info commande -->
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px 16px; display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
                        <div>
                            <div style="font-weight:700; color:#1e293b; font-size:15px;">
                                <i class="fa-solid fa-user-tie" style="color:#3b82f6;"></i> Client : ${commande.nomPartenaire || 'N/A'}
                            </div>
                            <div style="color:#64748b; font-size:13px; margin-top:3px;">
                                <i class="fa-regular fa-calendar-check" style="color:#f59e0b;"></i> Période Campagne : <strong>${devisPlageText}</strong>
                            </div>
                        </div>
                        <div style="text-align:right;">
                            <div class="badge ${restants > 0 ? 'badge-warning' : 'badge-success'}" style="font-size:13px; padding:6px 12px;">
                                <i class="fa-solid fa-bullhorn"></i> Planifiés : ${totalSpotsPlanifiesOuDiffuses} / ${totalSpotsDemandés}
                                ${restants > 0 ? `<span style="margin-left:8px; opacity:.85;">(${restants} restants)</span>` : ''}
                            </div>
                        </div>
                    </div>

                    <!-- Barre d'outils: titre + switch vue + bouton ajouter -->
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-shrink:0; gap:8px;">
                        <h4 style="margin:0; font-size:15px; color:#334155;">
                            <i class="fa-solid fa-list-check"></i> Créneaux de diffusion
                        </h4>
                        <div style="display:flex; gap:8px; align-items:center;">
                            <!-- Switch vue: Grille / Calendrier -->
                            <div id="btn-grp-view" style="display:flex; border:1px solid #cbd5e1; border-radius:6px; overflow:hidden;">
                                <button id="btn-view-grid" class="view-toggle-btn active"
                                        style="padding:5px 12px; border:none; background:#3b82f6; color:#fff; font-size:12px; cursor:pointer;">
                                    <i class="fa-solid fa-table-list"></i> Grille
                                </button>
                                <button id="btn-view-calendar" class="view-toggle-btn"
                                        style="padding:5px 12px; border:none; background:#f1f5f9; color:#475569; font-size:12px; cursor:pointer;">
                                    <i class="fa-regular fa-calendar"></i> Calendrier
                                </button>
                            </div>
                            <button class="btn btn-primary btn-sm" id="btn-ajouter-spot-commande">
                                <i class="fa-solid fa-plus"></i> Ajouter une diffusion
                            </button>
                        </div>
                    </div>

                    <!-- Formulaire d'ajout (masqué par défaut) -->
                    <div id="form-ajout-spot-container" style="display:none; background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:14px; flex-shrink:0;">
                        <h5 style="margin-top:0; margin-bottom:10px; color:#1e40af;"><i class="fa-solid fa-calendar-plus"></i> Nouveau créneau de spot</h5>
                        <div id="dx-form-nouveau-spot"></div>
                        <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:10px;">
                            <button class="btn btn-secondary btn-sm" id="btn-annuler-form-spot">Annuler</button>
                            <button class="btn btn-primary btn-sm" id="btn-valider-nouveau-spot">
                                <i class="fa-solid fa-check"></i> Enregistrer
                            </button>
                        </div>
                    </div>

                    <!-- Contenu principal: vue grille ou calendrier -->
                    <div style="flex:1; min-height:0; overflow:hidden; position:relative;">
                        <!-- Vue Grille -->
                        <div id="pane-view-grid" style="height:100%; overflow:auto;">
                            <div id="grid-commande-spots"></div>
                        </div>
                        <!-- Vue Calendrier -->
                        <div id="pane-view-calendar" style="height:100%; display:none;">
                            <div id="scheduler-commande-spots" style="height:100%;"></div>
                        </div>
                    </div>
                </div>
            `);

            container.append(content);

            // --- Initialiser la grille ---
            initGridCommandeSpots(spots, commande);

            // --- Initialiser le scheduler calendrier ---
            initSchedulerCommandeSpots(spots, commande);

            // --- Basculer les vues ---
            $("#btn-view-grid").on("click", function () {
                currentViewMode = "grid";
                $(this).css({ background: "#3b82f6", color: "#fff" });
                $("#btn-view-calendar").css({ background: "#f1f5f9", color: "#475569" });
                $("#pane-view-grid").show();
                $("#pane-view-calendar").hide();
            });

            $("#btn-view-calendar").on("click", function () {
                currentViewMode = "calendar";
                $(this).css({ background: "#3b82f6", color: "#fff" });
                $("#btn-view-grid").css({ background: "#f1f5f9", color: "#475569" });
                $("#pane-view-grid").hide();
                $("#pane-view-calendar").show();
                // Repaint scheduler after show
                const sc = $("#scheduler-commande-spots");
                if (sc.data("dxScheduler")) sc.dxScheduler("instance").repaint();
            });

            // --- Formulaire ---
            $("#btn-ajouter-spot-commande").on("click", function () {
                $("#form-ajout-spot-container").slideDown();
                initFormNouveauSpot(commande);
            });
            $("#btn-annuler-form-spot").on("click", () => $("#form-ajout-spot-container").slideUp());
            $("#btn-valider-nouveau-spot").on("click", () => enregistrerNouveauSpotCommande(commande.id_Commande));
        }
    });

    popupContainer.dxPopup("instance").show();
}

// ----------------------------------------------------------------------------
// VUE GRILLE DES SPOTS DE LA COMMANDE
// ----------------------------------------------------------------------------
function initGridCommandeSpots(spots, commande) {
    $("#grid-commande-spots").dxDataGrid({
        dataSource: spots,
        keyExpr: "id_PlanificationSpot",
        showBorders: true,
        columnAutoWidth: true,
        rowAlternationEnabled: true,
        paging: { pageSize: 8 },
        columns: [
            {
                dataField: "designationProduit",
                caption: "Spot",
                cellTemplate: (c, o) => $("<strong>").text(o.value).appendTo(c)
            },
            {
                dataField: "dateHeureDiffusion",
                caption: "Date & Heure",
                dataType: "datetime",
                format: "dd/MM/yyyy HH:mm",
                sortOrder: "asc",
                width: 160
            },
            {
                dataField: "dureeSecondes",
                caption: "Durée",
                width: 75,
                alignment: "center",
                cellTemplate: (c, o) => $("<span>").text(`${o.value} s`).appendTo(c)
            },
            {
                dataField: "statut",
                caption: "Statut",
                width: 115,
                alignment: "center",
                lookup: { dataSource: STATUT_LIST },
                cellTemplate: function (container, options) {
                    const val = options.value || STATUTS_SPOT.PLANIFIE;
                    const color = STATUT_COLORS[val] || STATUT_COLORS[STATUTS_SPOT.PLANIFIE];
                    $(`<span class="badge ${color.badge}">`).text(val).appendTo(container);
                }
            },
            {
                caption: "Changer Statut",
                width: 200,
                alignment: "center",
                cellTemplate: function (container, options) {
                    const row  = options.data;
                    const wrap = $("<div style='display:flex; gap:3px; justify-content:center;'>").appendTo(container);

                    STATUT_LIST.forEach(s => {
                        const btnClass = s === STATUTS_SPOT.PLANIFIE ? "btn-outline-warning"
                                       : s === STATUTS_SPOT.DIFFUSE  ? "btn-outline-success"
                                       : "btn-outline-danger";
                        $(`<button class='btn btn-xs ${btnClass}'>`)
                            .text(s)
                            .prop("disabled", row.statut === s)
                            .on("click", () => majStatutSpotQuick(row.id_PlanificationSpot, s))
                            .appendTo(wrap);
                    });
                }
            },
            {
                caption: "Action",
                width: 60,
                alignment: "center",
                cellTemplate: function (container, options) {
                    $("<button class='btn btn-xs btn-outline-danger' title='Supprimer'>")
                        .html('<i class="fa-solid fa-trash"></i>')
                        .on("click", () => supprimerSpotPlanifie(options.data.id_PlanificationSpot))
                        .appendTo(container);
                }
            }
        ]
    });
}

// ----------------------------------------------------------------------------
// VUE CALENDRIER (dxScheduler)
// ----------------------------------------------------------------------------
function initSchedulerCommandeSpots(spots, commande) {
    // Map spots to DevExtreme Scheduler appointments
    const appointments = spots.map(s => {
        const start = new Date(s.dateHeureDiffusion);
        const end   = new Date(start.getTime() + s.dureeSecondes * 1000);
        const color = (STATUT_COLORS[s.statut] || STATUT_COLORS[STATUTS_SPOT.PLANIFIE]).hex;
        return {
            id:          s.id_PlanificationSpot,
            text:        `${s.designationProduit} [${s.statut}]`,
            startDate:   start,
            endDate:     end,
            color:       color,
            spotData:    s
        };
    });

    // Compute scheduler initial date
    const initialDate = spots.length > 0
        ? new Date(spots.reduce((a, b) => new Date(a.dateHeureDiffusion) < new Date(b.dateHeureDiffusion) ? a : b).dateHeureDiffusion)
        : new Date();

    $("#scheduler-commande-spots").dxScheduler({
        dataSource: appointments,
        views: ["timelineDay", "timelineWeek", "week", "month"],
        currentView: "timelineDay",
        currentDate: initialDate,
        startDayHour: 0,
        endDayHour: 24,
        cellDuration: 30,
        height: "100%",
        editing: {
            allowAdding: false,   // additions done via form
            allowDeleting: true,
            allowUpdating: false, // updates done via grid buttons
            allowResizing: false,
            allowDragging: false
        },
        appointmentTemplate: function (model, index, element) {
            const s = model.appointmentData.spotData;
            const color = (STATUT_COLORS[s.statut] || STATUT_COLORS[STATUTS_SPOT.PLANIFIE]).hex;
            element.css({
                background: color,
                color: "#fff",
                borderRadius: "4px",
                padding: "2px 6px",
                fontSize: "11px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
            });
            element.html(`<i class="fa-solid fa-broadcast-tower"></i> <strong>${s.designationProduit}</strong><br>
                          <small>${s.dureeSecondes}s — ${s.statut}</small>`);
        },
        onAppointmentDeleting: function (e) {
            e.cancel = true; // intercept default delete
            supprimerSpotPlanifie(e.appointmentData.id);
        },
        onAppointmentClick: function (e) {
            e.cancel = true;
            const s = e.appointmentData.spotData;
            // Show a small action balloon
            DevExpress.ui.notify(
                `${s.designationProduit} — ${s.statut} (${s.dureeSecondes}s)`,
                "info",
                2500
            );
        },
        onCellClick: function (e) {
            // Clicking an empty cell opens the add form pre-filled with that time
            const clickedDate = e.cellData && e.cellData.startDate;
            if (!clickedDate) return;
            $("#form-ajout-spot-container").slideDown();
            initFormNouveauSpot(commande, clickedDate);
        }
    });
}

// ----------------------------------------------------------------------------
// INITIALISATION DU FORMULAIRE DE CRÉATION DE SPOT
// ----------------------------------------------------------------------------
function initFormNouveauSpot(commande, prefilledDate) {
    const produitsOptions = (commande.lignes || []).map(l => ({
        id_CommandeLigne: l.id_CommandeLigne,
        id_Produit: l.id_Produit,
        dureeSecondes: l.dureeSecondes || 30,
        label: `${l.designation || 'Spot'} (${l.dureeSecondes || 30}s — ${l.quantite || 1} spot(s))`
    }));

    const defaultProdId  = produitsOptions.length > 0 ? produitsOptions[0].id_Produit : null;
    const defaultLigneId = produitsOptions.length > 0 ? produitsOptions[0].id_CommandeLigne : null;
    const defaultDuree   = produitsOptions.length > 0 ? (produitsOptions[0].dureeSecondes || 30) : 30;

    const defaultDate = prefilledDate ? new Date(prefilledDate) : (() => {
        const d = new Date(); d.setMinutes(0, 0, 0); return d;
    })();

    // Destroy existing instance if any
    const formEl = $("#dx-form-nouveau-spot");
    if (formEl.data("dxForm")) {
        formEl.dxForm("instance").dispose();
        formEl.empty();
    }

    formEl.dxForm({
        labelLocation: "top",
        colCount: 3,
        formData: {
            id_CommandeLigne:   defaultLigneId,
            id_Produit:         defaultProdId,
            dateHeureDiffusion: defaultDate,
            dureeSecondes:      defaultDuree,
            id_PlageHoraire:    commande.id_PlageHoraire || null,
            statut:             STATUTS_SPOT.PLANIFIE,
            remarques:          ""
        },
        items: [
            {
                dataField: "id_Produit",
                colSpan: 1,
                label: { text: "Spot Publicitaire" },
                editorType: "dxSelectBox",
                editorOptions: {
                    dataSource: produitsOptions,
                    valueExpr: "id_Produit",
                    displayExpr: "label",
                    onValueChanged(e) {
                        const opt = produitsOptions.find(o => o.id_Produit === e.value);
                        if (opt) {
                            const inst = formEl.dxForm("instance");
                            inst.updateData("id_CommandeLigne", opt.id_CommandeLigne);
                            if (opt.dureeSecondes) {
                                inst.updateData("dureeSecondes", opt.dureeSecondes);
                            }
                        }
                    }
                },
                validationRules: [{ type: "required", message: "Veuillez choisir un spot." }]
            },
            {
                dataField: "dateHeureDiffusion",
                colSpan: 1,
                label: { text: "Date & Heure de Diffusion" },
                editorType: "dxDateBox",
                editorOptions: {
                    type: "datetime",
                    displayFormat: "dd/MM/yyyy HH:mm",
                    value: defaultDate
                },
                validationRules: [{ type: "required", message: "Date/heure requise." }]
            },
            {
                dataField: "dureeSecondes",
                colSpan: 1,
                label: { text: "Durée (secondes)" },
                editorType: "dxNumberBox",
                editorOptions: { min: 1, value: 30, format: "#0 s" },
                validationRules: [{ type: "required" }]
            },
            {
                dataField: "id_PlageHoraire",
                colSpan: 1,
                label: { text: "Plage Horaire Restrictive" },
                editorType: "dxSelectBox",
                editorOptions: {
                    dataSource: window.plagesHorairesData || [],
                    valueExpr: "id_PlageHoraire",
                    displayExpr: p => `${p.nom} (${p.heureDebut}-${p.heureFin})`,
                    showClearButton: true,
                    placeholder: "-- Automatique --"
                }
            },
            {
                dataField: "statut",
                colSpan: 1,
                label: { text: "Statut Initial" },
                editorType: "dxSelectBox",
                editorOptions: {
                    dataSource: STATUT_LIST,
                    value: STATUTS_SPOT.PLANIFIE
                }
            },
            {
                dataField: "remarques",
                colSpan: 1,
                label: { text: "Remarques" },
                editorType: "dxTextBox"
            }
        ]
    });
}

// ----------------------------------------------------------------------------
// ENREGISTREMENT D'UN SPOT DEPUIS LE FORMULAIRE
// ----------------------------------------------------------------------------
function enregistrerNouveauSpotCommande(commandeId) {
    const formEl = $("#dx-form-nouveau-spot");
    if (!formEl.data("dxForm")) return;

    const formInstance = formEl.dxForm("instance");
    const res = formInstance.validate();
    if (!res.isValid) return;

    const formData = formInstance.option("formData");

    const payload = {
        id_Commande:        commandeId,
        id_CommandeLigne:   formData.id_CommandeLigne,
        id_Produit:         formData.id_Produit,
        dateHeureDiffusion: formData.dateHeureDiffusion
            ? new Date(formData.dateHeureDiffusion).toISOString()
            : new Date().toISOString(),
        dureeSecondes:    parseInt(formData.dureeSecondes) || 30,
        id_PlageHoraire:  formData.id_PlageHoraire || null,
        statut:           formData.statut || STATUTS_SPOT.PLANIFIE,
        remarques:        formData.remarques || ""
    };

    makeRequest('/api/PlanificationSpots', 'POST', payload)
        .then(() => {
            showToast("Diffusion du spot planifiée avec succès !", "success");
            $("#form-ajout-spot-container").slideUp();
            ouvrirPopupPlanificationCommande(commandeId);
            chargerPlanificationSpots();
        })
        .catch(err => {
            const msg = (err && err.responseJSON && err.responseJSON.message)
                ? err.responseJSON.message
                : "Erreur lors de la planification du spot.";
            showToast(msg, "error");
        });
}

// ----------------------------------------------------------------------------
// MODIFICATION RAPIDE DU STATUT
// ----------------------------------------------------------------------------
function majStatutSpotQuick(spotId, nouveauStatut) {
    makeRequest(`/api/PlanificationSpots/${spotId}/statut`, 'PUT', { statut: nouveauStatut })
        .then(() => {
            showToast(`Statut mis à jour : ${nouveauStatut}`, "info");
            chargerPlanificationSpots();
            if (currentCommandePlanning) {
                ouvrirPopupPlanificationCommande(currentCommandePlanning.id_Commande);
            }
        })
        .catch(err => {
            const msg = (err && err.responseJSON && err.responseJSON.message)
                ? err.responseJSON.message
                : "Impossible de modifier le statut.";
            showToast(msg, "error");
        });
}

// ----------------------------------------------------------------------------
// SUPPRESSION D'UN SPOT
// ----------------------------------------------------------------------------
function supprimerSpotPlanifie(spotId) {
    DevExpress.ui.dialog.confirm(
        "Voulez-vous vraiment supprimer cette planification de spot ?",
        "Confirmation"
    ).then(result => {
        if (!result) return;

        makeRequest(`/api/PlanificationSpots/${spotId}`, 'DELETE')
            .then(() => {
                showToast("Planification de spot supprimée.", "success");
                chargerPlanificationSpots();
                if (currentCommandePlanning) {
                    ouvrirPopupPlanificationCommande(currentCommandePlanning.id_Commande);
                }
            })
            .catch(err => {
                showToast("Erreur lors de la suppression.", "error");
            });
    });
}
