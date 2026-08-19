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

// Scheduler view configurations optimized for broadcast spot planning
const SPOT_SCHEDULER_VIEWS = [
    { type: "timelineDay",  name: "Timeline (Jour)",    cellDuration: 15 },
    { type: "timelineWeek", name: "Timeline (Semaine)", cellDuration: 60 },
    { type: "day",          name: "Grille Jour",        cellDuration: 15 },
    { type: "week",         name: "Grille Semaine",     cellDuration: 30 },
    { type: "month",        name: "Mois" },
    { type: "agenda",       name: "Agenda (Liste)",     agendaDuration: 7 }
];

let currentCommandePlanning     = null;
let currentCommandePlannedSpots = [];
let currentViewMode             = "grid"; // "grid" | "calendar" (modal)
let currentGlobalSpotsView      = "grid"; // "grid" | "calendar" (main page)

$(document).ready(function () {
    if ($("#grid-planification-spots").length) {
        initGridPlanificationSpots();
        initGlobalSpotsViewSwitchers();
    }
});

// ----------------------------------------------------------------------------
// HELPER: MAPPING SPOT -> DEVEXTREME SCHEDULER APPOINTMENT
// ----------------------------------------------------------------------------
// Broadcast spots usually last between 10 to 60 seconds.
// In standard calendar scales, a 30s event is < 1px tall and completely illegible.
// We map each spot with a visual duration of 15 minutes for optimal layout geometry
// while preserving and displaying the exact second-level timestamps.
function mapSpotToSchedulerAppointment(s) {
    const realStart = new Date(s.dateHeureDiffusion);
    const dureeSec  = Math.max(1, s.dureeSecondes || 30);
    const realEnd   = new Date(realStart.getTime() + dureeSec * 1000);

    // 15 minutes visual block for scheduler tile rendering
    const VISUAL_MINUTES_MS = 15 * 60 * 1000;
    const visualEnd = new Date(Math.max(realEnd.getTime(), realStart.getTime() + VISUAL_MINUTES_MS));
    const colorInfo = STATUT_COLORS[s.statut] || STATUT_COLORS[STATUTS_SPOT.PLANIFIE];

    const pad = n => String(n).padStart(2, '0');
    const startHourStr = `${pad(realStart.getHours())}:${pad(realStart.getMinutes())}:${pad(realStart.getSeconds())}`;
    const endHourStr   = `${pad(realEnd.getHours())}:${pad(realEnd.getMinutes())}:${pad(realEnd.getSeconds())}`;

    return {
        id:           s.id_PlanificationSpot,
        text:         `${s.designationProduit || 'Spot'} (${dureeSec}s)`,
        startDate:    realStart,
        endDate:      visualEnd,
        color:        colorInfo.hex,
        spotData:     s,
        realStart:    realStart,
        realEnd:      realEnd,
        startTimeStr: startHourStr,
        endTimeStr:   endHourStr,
        dureeSec:     dureeSec,
        statut:       s.statut || STATUTS_SPOT.PLANIFIE
    };
}

// ----------------------------------------------------------------------------
// TEMPLATE: APPOINTMENT TILE (HIGH READABILITY FOR BROADCAST SPOTS)
// ----------------------------------------------------------------------------
function renderSpotAppointmentTemplate(model, index, element) {
    const appt = model.appointmentData;
    const s = appt.spotData || {};
    const statut = s.statut || STATUTS_SPOT.PLANIFIE;
    const statutKey = statut === STATUTS_SPOT.DIFFUSE ? 'diffuse' : (statut === STATUTS_SPOT.ANNULE ? 'annule' : 'planifie');
    const dureeSec = appt.dureeSec || s.dureeSecondes || 30;

    element.empty();
    element.addClass("dx-scheduler-appointment-custom");

    const tile = $(`
        <div class="spot-card-tile status-${statutKey}" title="${s.designationProduit || 'Spot'} — ${statut} (${dureeSec}s à ${appt.startTimeStr})">
            <div class="spot-tile-header">
                <span class="spot-tile-time">
                    <i class="fa-regular fa-clock"></i> ${appt.startTimeStr}
                </span>
                <span class="spot-tile-duration">
                    <i class="fa-solid fa-stopwatch"></i> ${dureeSec}s
                </span>
            </div>
            <div class="spot-tile-title">
                ${s.designationProduit || 'Spot Publicitaire'}
            </div>
            <div class="spot-tile-footer">
                <span class="spot-tile-badge">${statut}</span>
                ${s.nomPartenaire ? `<span class="spot-tile-client" title="${s.nomPartenaire}"><i class="fa-solid fa-user-tie"></i> ${s.nomPartenaire}</span>` : (s.nomPlageHoraire ? `<span class="spot-tile-client">${s.nomPlageHoraire}</span>` : '')}
            </div>
        </div>
    `);

    element.append(tile);
}

// ----------------------------------------------------------------------------
// TEMPLATE: RICH TOOLTIP POPOVER CARD WITH 1-CLICK ACTIONS
// ----------------------------------------------------------------------------
function renderSpotTooltipTemplate(model, index, element) {
    const appt = model.appointmentData;
    const s = appt.spotData || {};
    const statut = s.statut || STATUTS_SPOT.PLANIFIE;
    const dureeSec = appt.dureeSec || s.dureeSecondes || 30;
    const colorInfo = STATUT_COLORS[statut] || STATUT_COLORS[STATUTS_SPOT.PLANIFIE];

    const realStart = appt.realStart || new Date(s.dateHeureDiffusion);
    const dateFormatted = realStart.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const isPlanifie = statut === STATUTS_SPOT.PLANIFIE;
    const isDiffuse  = statut === STATUTS_SPOT.DIFFUSE;
    const isAnnule   = statut === STATUTS_SPOT.ANNULE;

    element.empty();

    const tooltipCard = $(`
        <div class="spot-tooltip-card">
            <div class="spot-tooltip-header" style="border-left: 4px solid ${colorInfo.hex};">
                <div class="spot-tooltip-title-wrap">
                    <div class="spot-tooltip-title">
                        <i class="fa-solid fa-tower-broadcast" style="color:${colorInfo.hex};"></i>
                        ${s.designationProduit || 'Spot Publicitaire'}
                    </div>
                    ${s.codeProduit ? `<span class="spot-tooltip-code">${s.codeProduit}</span>` : ''}
                </div>
                <div class="spot-tooltip-badges">
                    <span class="badge ${colorInfo.badge}">${statut}</span>
                    <span class="spot-duration-pill"><i class="fa-solid fa-stopwatch"></i> ${dureeSec}s</span>
                </div>
            </div>

            <div class="spot-tooltip-body">
                <div class="spot-tooltip-row">
                    <div class="spot-tooltip-label"><i class="fa-regular fa-calendar" style="color:#3b82f6;"></i> Date :</div>
                    <div class="spot-tooltip-value"><strong>${dateFormatted}</strong></div>
                </div>
                <div class="spot-tooltip-row">
                    <div class="spot-tooltip-label"><i class="fa-regular fa-clock" style="color:#f59e0b;"></i> Créneau précis :</div>
                    <div class="spot-tooltip-value">
                        <strong style="color:#1e40af; font-size:13px;">${appt.startTimeStr}</strong>
                        <span style="color:#64748b; margin:0 3px;">➔</span>
                        <strong style="color:#1e40af; font-size:13px;">${appt.endTimeStr}</strong>
                        <span class="badge badge-secondary" style="font-size:10px; margin-left:5px;">${dureeSec} sec</span>
                    </div>
                </div>
                ${s.nomPartenaire ? `
                <div class="spot-tooltip-row">
                    <div class="spot-tooltip-label"><i class="fa-solid fa-user-tie" style="color:#10b981;"></i> Client :</div>
                    <div class="spot-tooltip-value"><strong>${s.nomPartenaire}</strong></div>
                </div>` : ''}
                ${(s.numeroCommande || s.id_Commande) ? `
                <div class="spot-tooltip-row">
                    <div class="spot-tooltip-label"><i class="fa-solid fa-file-invoice" style="color:#8b5cf6;"></i> N° Commande :</div>
                    <div class="spot-tooltip-value">
                        <button type="button" class="btn btn-link btn-xs btn-open-cmd-modal" style="font-weight:700; padding:0; color:#2563eb; text-decoration:underline;">
                            <i class="fa-solid fa-cart-shopping"></i> ${s.numeroCommande || ('CMD-' + s.id_Commande)}
                        </button>
                    </div>
                </div>` : ''}
                <div class="spot-tooltip-row">
                    <div class="spot-tooltip-label"><i class="fa-solid fa-sliders" style="color:#ec4899;"></i> Plage Horaire :</div>
                    <div class="spot-tooltip-value">
                        ${s.nomPlageHoraire ? `<span>${s.nomPlageHoraire} (${s.heureDebutPlage || ''}-${s.heureFinPlage || ''})</span>` : '<span style="color:#94a3b8; font-style:italic;">Libre</span>'}
                    </div>
                </div>
                ${s.remarques ? `
                <div class="spot-tooltip-row">
                    <div class="spot-tooltip-label"><i class="fa-regular fa-comment" style="color:#64748b;"></i> Note :</div>
                    <div class="spot-tooltip-value" style="font-style:italic; color:#475569;">${s.remarques}</div>
                </div>` : ''}
            </div>

            <div class="spot-tooltip-actions">
                <div class="spot-status-btn-group">
                    <button type="button" class="btn btn-xs ${isPlanifie ? 'btn-warning active' : 'btn-outline-warning'} btn-tooltip-statut" data-statut="${STATUTS_SPOT.PLANIFIE}" ${isPlanifie ? 'disabled' : ''}>
                        <i class="fa-solid fa-clock"></i> Planifié
                    </button>
                    <button type="button" class="btn btn-xs ${isDiffuse ? 'btn-success active' : 'btn-outline-success'} btn-tooltip-statut" data-statut="${STATUTS_SPOT.DIFFUSE}" ${isDiffuse ? 'disabled' : ''}>
                        <i class="fa-solid fa-check"></i> Diffusé
                    </button>
                    <button type="button" class="btn btn-xs ${isAnnule ? 'btn-danger active' : 'btn-outline-danger'} btn-tooltip-statut" data-statut="${STATUTS_SPOT.ANNULE}" ${isAnnule ? 'disabled' : ''}>
                        <i class="fa-solid fa-ban"></i> Annulé
                    </button>
                </div>
                <button type="button" class="btn btn-xs btn-outline-danger btn-tooltip-delete" title="Supprimer cette diffusion">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        </div>
    `);

    tooltipCard.find(".btn-tooltip-statut").on("click", function () {
        const targetStatut = $(this).data("statut");
        majStatutSpotQuick(s.id_PlanificationSpot, targetStatut);
    });

    tooltipCard.find(".btn-tooltip-delete").on("click", function () {
        supprimerSpotPlanifie(s.id_PlanificationSpot);
    });

    tooltipCard.find(".btn-open-cmd-modal").on("click", function () {
        ouvrirPopupPlanificationCommande(s.id_Commande);
    });

    element.append(tooltipCard);
}

// ----------------------------------------------------------------------------
// 1. GRID PRINCIPALE: TOUS LES SPOTS PLANIFIÉS
// ----------------------------------------------------------------------------
function initGridPlanificationSpots() {
    $("#grid-planification-spots").dxDataGrid({
        dataSource: [],
        keyExpr: "id_PlanificationSpot",
        showBorders: true,
        columnAutoWidth: true,
        allowColumnResizing: true,
        allowColumnReordering: true,
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
                width: 200,
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
                width: 250,
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
                        .html(`<strong>${row.designationProduit || 'Spot'}</strong> <small style="color:#64748b;">(${row.codeProduit || ''})</small>`)
                        .appendTo(container);
                },
                width: 250
            },
            {
                dataField: "dateHeureDiffusion",
                caption: "Date & Heure Diffusion",
                dataType: "datetime",
                format: "dd/MM/yyyy HH:mm:ss",
                sortOrder: "asc",
                width: 220,
                cellTemplate: function (container, options) {
                    const d = new Date(options.value);
                    $("<div>")
                        .html(`<i class="fa-regular fa-calendar" style="color:#3b82f6;"></i> ${d.toLocaleDateString('fr-FR')} &nbsp;<i class="fa-regular fa-clock"></i> <strong>${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</strong>`)
                        .appendTo(container);
                }
            },
            {
                dataField: "dureeSecondes",
                caption: "Durée",
                width: 100,
                alignment: "center",
                cellTemplate: (c, o) => $("<span>").addClass("spot-duration-pill").html(`<i class="fa-solid fa-stopwatch"></i> ${o.value}s`).appendTo(c)
            },
            {
                dataField: "nomPlageHoraire",
                caption: "Plage Horaire",
                width: 200,
                cellTemplate: function (container, options) {
                    const row = options.data;
                    if (!options.value) {
                        $("<span style='color:#94a3b8; font-style:italic;'>").text("Libre").appendTo(container);
                    } else {
                        $("<span>").text(`${options.value} (${row.heureDebutPlage || ''}-${row.heureFinPlage || ''})`).appendTo(container);
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

// ----------------------------------------------------------------------------
// 2. SCHEDULER GLOBAL: VUE BROADCAST SUR TOUS LES SPOTS
// ----------------------------------------------------------------------------
function initSchedulerGlobalSpots(spots) {
    const container = $("#scheduler-global-spots");
    if (!container.length) return;

    const appointments = (spots || []).map(mapSpotToSchedulerAppointment);
    const initialDate = appointments.length > 0
        ? new Date(appointments[0].startDate)
        : new Date();

    if (container.data("dxScheduler")) {
        const inst = container.dxScheduler("instance");
        inst.option("dataSource", appointments);
        inst.repaint();
        return;
    }

    container.dxScheduler({
        dataSource: appointments,
        views: SPOT_SCHEDULER_VIEWS,
        currentView: "timelineDay",
        currentDate: initialDate,
        startDayHour: 0,
        endDayHour: 24,
        cellDuration: 15,
        height: "100%",
        showCurrentTimeIndicator: true,
        showAllDayPanel: false,
        editing: {
            allowAdding: false,
            allowDeleting: true,
            allowUpdating: false,
            allowResizing: false,
            allowDragging: false
        },
        appointmentTemplate: renderSpotAppointmentTemplate,
        appointmentTooltipTemplate: renderSpotTooltipTemplate,
        onAppointmentDeleting: function (e) {
            e.cancel = true;
            supprimerSpotPlanifie(e.appointmentData.id);
        }
    });
}

function initGlobalSpotsViewSwitchers() {
    $("#btn-view-spots-grid").on("click", function () {
        currentGlobalSpotsView = "grid";
        $(this).addClass("active");
        $("#btn-view-spots-calendar").removeClass("active");
        $("#wrapper-planification-spots-grid").show();
        $("#wrapper-planification-spots-calendar").hide();
    });

    $("#btn-view-spots-calendar").on("click", function () {
        currentGlobalSpotsView = "calendar";
        $(this).addClass("active");
        $("#btn-view-spots-grid").removeClass("active");
        $("#wrapper-planification-spots-grid").hide();
        $("#wrapper-planification-spots-calendar").show();

        initSchedulerGlobalSpots(planificationSpotsData);
        const sc = $("#scheduler-global-spots");
        if (sc.data("dxScheduler")) {
            sc.dxScheduler("instance").repaint();
        }
    });
}

// Charge et rafraîchit le datagrid et le calendrier global
function chargerPlanificationSpots() {
    makeRequest('/api/PlanificationSpots', 'GET')
        .then(data => {
            planificationSpotsData = data || [];
            const grid = $("#grid-planification-spots");
            if (grid.length && grid.data("dxDataGrid")) {
                grid.dxDataGrid("instance").option("dataSource", planificationSpotsData);
                grid.dxDataGrid("instance").refresh();
            }

            if ($("#scheduler-global-spots").is(":visible") || $("#scheduler-global-spots").data("dxScheduler")) {
                initSchedulerGlobalSpots(planificationSpotsData);
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
// 3. POPUP DE PLANIFICATION DES SPOTS POUR UN BON DE COMMANDE
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

    const totalSpotsDemandes            = (commande.lignes || []).reduce((sum, l) => sum + (parseFloat(l.quantite) || 0), 0);
    const totalSpotsPlanifiesOuDiffuses = spots.filter(s => s.statut !== STATUTS_SPOT.ANNULE).length;
    const restants = Math.max(0, totalSpotsDemandes - totalSpotsPlanifiesOuDiffuses);
    const isAnnulee = (commande.statut === 'Annulee' || commande.statut === 3);

    const popupTitle = `Planification des Spots — Bon de Commande N° ${commande.numeroCommande || ('CMD-' + commande.id_Commande)}`;

    popupContainer.dxPopup({
        title: popupTitle,
        width: "94vw",
        maxWidth: 1200,
        height: "92vh",
        visible: true,
        dragEnabled: true,
        showCloseButton: true,
        contentTemplate: function (container) {
            container.empty();

            const content = $(`
                <div class="popup-planification-content" style="display:flex; flex-direction:column; gap:12px; height:100%; overflow:hidden;">

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
                            ${isAnnulee ? `
                                <div class="badge badge-danger" style="font-size:13px; padding:6px 12px;">
                                    <i class="fa-solid fa-ban"></i> Commande Annulée
                                </div>
                            ` : `
                                <div class="badge ${restants > 0 ? 'badge-warning' : 'badge-success'}" style="font-size:13px; padding:6px 12px;">
                                    <i class="fa-solid fa-bullhorn"></i> Planifiés : ${totalSpotsPlanifiesOuDiffuses} / ${totalSpotsDemandes}
                                    ${restants > 0 ? `<span style="margin-left:8px; opacity:.85;">(${restants} restants)</span>` : ''}
                                </div>
                            `}
                        </div>
                    </div>

                    <!-- Barre d'outils: titre + switch vue + bouton ajouter -->
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-shrink:0; gap:8px;">
                        <h4 style="margin:0; font-size:15px; color:#334155;">
                            <i class="fa-solid fa-list-check"></i> Créneaux de diffusion
                        </h4>
                        <div style="display:flex; gap:8px; align-items:center;">
                            <!-- Switch vue: Grille / Calendrier -->
                            <div class="btn-group-toggle" id="btn-grp-modal-view">
                                <button id="btn-view-grid" class="btn btn-sm active">
                                    <i class="fa-solid fa-table-list"></i> Grille
                                </button>
                                <button id="btn-view-calendar" class="btn btn-sm">
                                    <i class="fa-solid fa-calendar-days"></i> Calendrier
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
                $(this).addClass("active");
                $("#btn-view-calendar").removeClass("active");
                $("#pane-view-grid").show();
                $("#pane-view-calendar").hide();
            });

            $("#btn-view-calendar").on("click", function () {
                currentViewMode = "calendar";
                $(this).addClass("active");
                $("#btn-view-grid").removeClass("active");
                $("#pane-view-grid").hide();
                $("#pane-view-calendar").show();
                // Repaint scheduler after show
                const sc = $("#scheduler-commande-spots");
                if (sc.data("dxScheduler")) sc.dxScheduler("instance").repaint();
            });

            // --- Formulaire ---
            if (isAnnulee) {
                $("#btn-ajouter-spot-commande")
                    .prop("disabled", true)
                    .css({ opacity: 0.65, cursor: "not-allowed" })
                    .html("<i class='fa-solid fa-ban'></i> Commande Annulée (Planification désactivée)");
            } else if (restants === 0) {
                $("#btn-ajouter-spot-commande")
                    .prop("disabled", true)
                    .css({ opacity: 0.65, cursor: "not-allowed" })
                    .html("<i class='fa-solid fa-lock'></i> Quota complet (0 restant)");
            } else {
                $("#btn-ajouter-spot-commande").on("click", function () {
                    $("#form-ajout-spot-container").slideDown();
                    initFormNouveauSpot(commande);
                });
            }
            $("#btn-annuler-form-spot").on("click", () => $("#form-ajout-spot-container").slideUp());
            $("#btn-valider-nouveau-spot").on("click", () => enregistrerNouveauSpotCommande(commande.id_Commande));
        }
    });

    popupContainer.dxPopup("instance").show();
}

// ----------------------------------------------------------------------------
// 4. VUE GRILLE DES SPOTS DE LA COMMANDE
// ----------------------------------------------------------------------------
function initGridCommandeSpots(spots, commande) {
    $("#grid-commande-spots").dxDataGrid({
        dataSource: spots,
        keyExpr: "id_PlanificationSpot",
        showBorders: true,
        columnAutoWidth: true,
        allowColumnResizing: true,
        rowAlternationEnabled: true,
        paging: { pageSize: 8 },
        columns: [
            {
                dataField: "designationProduit",
                caption: "Spot",
                cellTemplate: (c, o) => $("<strong>").text(o.value || 'Spot').appendTo(c)
            },
            {
                dataField: "dateHeureDiffusion",
                caption: "Date & Heure",
                dataType: "datetime",
                format: "dd/MM/yyyy HH:mm:ss",
                sortOrder: "asc",
                width: 170,
                cellTemplate: function (container, options) {
                    const d = new Date(options.value);
                    $("<div>")
                        .html(`<i class="fa-regular fa-calendar" style="color:#3b82f6;"></i> ${d.toLocaleDateString('fr-FR')} &nbsp;<strong>${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</strong>`)
                        .appendTo(container);
                }
            },
            {
                dataField: "dureeSecondes",
                caption: "Durée",
                width: 85,
                alignment: "center",
                cellTemplate: (c, o) => $("<span>").addClass("spot-duration-pill").html(`<i class="fa-solid fa-stopwatch"></i> ${o.value}s`).appendTo(c)
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
                width: 150,
                alignment: "center",
                cellTemplate: function (container, options) {
                    const row  = options.data;
                    const wrap = $("<div style='display:flex; gap:3px; justify-content:center; flex-direction: column'>").appendTo(container);
                    const isCmdAnnulee = (commande && (commande.statut === 'Annulee' || commande.statut === 3));

                    STATUT_LIST.forEach(s => {
                        const btnClass = s === STATUTS_SPOT.PLANIFIE ? "btn-outline-warning"
                                       : s === STATUTS_SPOT.DIFFUSE  ? "btn-outline-success"
                                       : "btn-outline-danger";
                        $(`<button class='btn btn-xs ${btnClass}'>`)
                            .text(s)
                            .prop("disabled", row.statut === s || isCmdAnnulee)
                            .on("click", () => majStatutSpotQuick(row.id_PlanificationSpot, s))
                            .appendTo(wrap);
                    });
                }
            },
            {
                caption: "Action",
                width: 90,
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
// 5. VUE CALENDRIER DE LA COMMANDE (dxScheduler)
// ----------------------------------------------------------------------------
function initSchedulerCommandeSpots(spots, commande) {
    const container = $("#scheduler-commande-spots");
    if (!container.length) return;

    const appointments = (spots || []).map(mapSpotToSchedulerAppointment);

    const initialDate = spots.length > 0
        ? new Date(spots.reduce((a, b) => new Date(a.dateHeureDiffusion) < new Date(b.dateHeureDiffusion) ? a : b).dateHeureDiffusion)
        : (commande.dateDebutDiffusion ? new Date(commande.dateDebutDiffusion) : new Date());

    if (container.data("dxScheduler")) {
        const inst = container.dxScheduler("instance");
        inst.option("dataSource", appointments);
        inst.option("currentDate", initialDate);
        inst.repaint();
        return;
    }

    container.dxScheduler({
        dataSource: appointments,
        views: SPOT_SCHEDULER_VIEWS,
        currentView: "timelineDay",
        currentDate: initialDate,
        startDayHour: 0,
        endDayHour: 24,
        cellDuration: 15,
        height: "100%",
        showCurrentTimeIndicator: true,
        showAllDayPanel: false,
        editing: {
            allowAdding: false,   // additions done via form
            allowDeleting: true,
            allowUpdating: false, // updates done via quick status buttons
            allowResizing: false,
            allowDragging: false
        },
        appointmentTemplate: renderSpotAppointmentTemplate,
        appointmentTooltipTemplate: renderSpotTooltipTemplate,
        onAppointmentDeleting: function (e) {
            e.cancel = true; // intercept default delete
            supprimerSpotPlanifie(e.appointmentData.id);
        },
        onCellClick: function (e) {
            if (commande && (commande.statut === 'Annulee' || commande.statut === 3)) return;
            // Clicking an empty cell opens the add form pre-filled with that time
            const clickedDate = e.cellData && e.cellData.startDate;
            if (!clickedDate) return;
            $("#form-ajout-spot-container").slideDown();
            initFormNouveauSpot(commande, clickedDate);
        }
    });
}

// Helper to format local date to ISO without UTC shift (prevents 11h becoming 10h)
function formatLocalISO(d) {
    if (!d) return new Date().toISOString();
    const date = new Date(d);
    if (isNaN(date.getTime())) return new Date().toISOString();
    const pad = n => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

// Helper to resolve read-only plage horaire description for a commande line
function obtenirPlageInfoPourLigne(l) {
    if (!l) return "Aucune restriction (Toutes heures autorisées)";
    if (l.emission) return l.emission;
    const variante = (window.articlesVariantesData || []).find(v => v.id_Produit === l.id_Produit && v.actif !== false);
    if (variante && variante.nomPlageHoraire) {
        return `${variante.nomPlageHoraire} (${variante.heureDebut}-${variante.heureFin})`;
    }
    return "Aucune restriction (Toutes heures autorisées)";
}

// ----------------------------------------------------------------------------
// 6. INITIALISATION DU FORMULAIRE DE CRÉATION DE SPOT
// ----------------------------------------------------------------------------
function initFormNouveauSpot(commande, prefilledDate) {
    const produitsOptions = (commande.lignes || []).map(l => {
        const qteOrdered = Math.round(l.quantite || 1);
        const qtePlanned = (currentCommandePlannedSpots || []).filter(s => s.id_CommandeLigne === l.id_CommandeLigne && s.statut !== STATUTS_SPOT.ANNULE).length;
        const qteRemaining = Math.max(0, qteOrdered - qtePlanned);
        const isEpuise = qteRemaining === 0;

        return {
            id_CommandeLigne: l.id_CommandeLigne,
            id_Produit: l.id_Produit,
            dureeSecondes: l.dureeSecondes || 30,
            disabled: isEpuise,
            plageInfo: obtenirPlageInfoPourLigne(l),
            label: isEpuise
                ? `${l.designation || 'Spot'} (${l.dureeSecondes || 30}s — 0/${qteOrdered} restant [COMPLET])`
                : `${l.designation || 'Spot'} (${l.dureeSecondes || 30}s — ${qteRemaining}/${qteOrdered} restant(s))`
        };
    });

    const activeOption = produitsOptions.find(o => !o.disabled) || produitsOptions[0];
    const defaultProdId  = activeOption ? activeOption.id_Produit : null;
    const defaultLigneId = activeOption ? activeOption.id_CommandeLigne : null;
    const defaultPlageInfo = activeOption ? activeOption.plageInfo : "Aucune restriction";

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
            plageHoraireInfo:   defaultPlageInfo,
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
                            inst.updateData("plageHoraireInfo", opt.plageInfo);
                        }
                    }
                },
                validationRules: [{ type: "required", message: "Veuillez choisir un spot." }]
            },
            {
                dataField: "plageHoraireInfo",
                colSpan: 1,
                label: { text: "Plage Horaire Restrictive (Lecture seule)" },
                editorType: "dxTextBox",
                editorOptions: {
                    readOnly: true
                }
            },
            {
                dataField: "dateHeureDiffusion",
                colSpan: 1,
                label: { text: "Date & Heure de Diffusion" },
                editorType: "dxDateBox",
                editorOptions: {
                    type: "datetime",
                    displayFormat: "dd/MM/yyyy HH:mm:ss",
                    value: defaultDate
                },
                validationRules: [{ type: "required", message: "Date/heure requise." }]
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
                colSpan: 2,
                label: { text: "Remarques (optionnel)" },
                editorType: "dxTextBox"
            }
        ]
    });
}

// ----------------------------------------------------------------------------
// 7. ENREGISTREMENT D'UN SPOT DEPUIS LE FORMULAIRE
// ----------------------------------------------------------------------------
function enregistrerNouveauSpotCommande(commandeId) {
    if (currentCommandePlanning && (currentCommandePlanning.statut === 'Annulee' || currentCommandePlanning.statut === 3)) {
        showToast("Impossible de planifier des spots pour un bon de commande annulé.", true);
        return;
    }

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
        dateHeureDiffusion: formatLocalISO(formData.dateHeureDiffusion),
        statut:             formData.statut || STATUTS_SPOT.PLANIFIE,
        remarques:          formData.remarques || ""
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
// 8. MODIFICATION RAPIDE DU STATUT
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
// 9. SUPPRESSION D'UN SPOT
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
