// --- MODULE TABLEAU DE BORD ---

// Statut label maps
const DEVIS_STATUT_LABELS = {
    'Brouillon': 'Brouillon',
    'Envoye':    'Envoyé',
    'Accepte':   'Accepté',
    'Refuse':    'Refusé',
    'Expire':    'Expiré'
};

const COMMANDE_STATUT_LABELS = {
    'EnAttente': 'En Attente',
    'Validee':   'Validée',
    'Facutree':  'Facturée',
    'Cloturee':  'Clôturée',
    'Annulee':   'Annulée'
};

const SPOT_STATUT_LABELS = {
    'Planifie': 'Planifié',
    'Diffuse':  'Diffusé',
    'Annule':   'Annulé'
};

// Color palettes
const PIE_PALETTE_DEVIS    = ['#94a3b8', '#3b82f6', '#10b981', '#ef4444', '#f59e0b'];
const PIE_PALETTE_COMMANDE = ['#f59e0b', '#3b82f6', '#f97316', '#10b981', '#ef4444'];
const PIE_PALETTE_SPOTS    = ['#6366f1', '#10b981', '#ef4444'];
const PIE_PALETTE_CONV     = ['#10b981', '#e2e8f0'];

// -----------------------------------------------------------------------
// CHARGEMENT PRINCIPAL DU DASHBOARD
// -----------------------------------------------------------------------
async function chargerDashboard() {
    try {
        const res = await fetch('/api/tableaubord');
        const data = await res.json();
        
        // Mettre à jour les KPI
        $("#kpi-ca").text(formatCurrency(data.indicateurs.chiffreAffairesTotal));
        $("#kpi-commandes").text(data.indicateurs.nombreCommandes);
        $("#kpi-impayes").text(formatCurrency(data.indicateurs.montantImpaye));
        $("#kpi-taux-recouvrement").text(`Recouvrement : ${data.indicateurs.tauxRecouvrement}%`);
        
        // Alertes spots / diffusion
        $("#stock-alert-badge").text(0);
        $("#stock-alert-count").text(`Spots en diffusion`);

        // Rendre les graphiques DevExtreme
        renderDashboardCharts(data);

        // Top Clients (Mini dxDataGrid)
        $("#grid-top-clients").dxDataGrid({
            dataSource: data.topClients,
            columns: [
                {
                    dataField: "nomClient",
                    caption: "Client",
                    cellTemplate: (container, options) => {
                        $("<strong>").text(options.value).appendTo(container);
                    }
                },
                {
                    dataField: "entreprise",
                    caption: "Entreprise"
                },
                {
                    dataField: "totalAchats",
                    caption: "Total Commandé",
                    alignment: "right",
                    calculateCellValue: (row) => formatCurrency(row.totalAchats)
                },
                {
                    dataField: "nombreCommandes",
                    caption: "Commandes",
                    alignment: "center"
                }
            ],
            showBorders: false,
            showColumnHeaders: true,
            paging: { enabled: false },
            scrolling: { mode: "none" }
        });

        const alertsContainer = $("#dashboard-stock-alerts");
        alertsContainer.empty();
        alertsContainer.html(`<div class="text-center text-muted" style="padding:24px;"><i class="fa-solid fa-signal text-success" style="margin-right:6px;"></i> Tous les spots publicitaires et grilles d'antenne sont actifs.</div>`);

        // Charger les données analytiques
        await chargerAnalytics();

    } catch (err) {
        console.error(err);
        showToast("Erreur de chargement du dashboard.", true);
    }
}

// -----------------------------------------------------------------------
// GRAPHIQUES PRINCIPAUX (existants)
// -----------------------------------------------------------------------
function renderDashboardCharts(data) {
    const isDark = $("body").hasClass("dark-mode");
    const labelColor = isDark ? "#94a3b8" : "#64748b";

    // 1. dxChart - Évolution des ventes & encaissements
    $("#chart-evolution").dxChart({
        dataSource: data.evolutionVentes,
        commonSeriesSettings: {
            argumentField: "mois",
            type: "spline",
            point: {
                visible: true,
                size: 8
            }
        },
        series: [
            {
                valueField: "ventes",
                name: "Ventes facturées (TND)",
                color: "#3b82f6"
            },
            {
                valueField: "encaissements",
                name: "Règlements encaissés (TND)",
                color: "#10b981"
            }
        ],
        argumentAxis: {
            label: { font: { family: "Inter", color: labelColor } },
            grid: { visible: true, color: isDark ? "#1e293b" : "#f1f5f9" }
        },
        valueAxis: {
            label: { font: { family: "Inter", color: labelColor } },
            grid: { visible: true, color: isDark ? "#1e293b" : "#f1f5f9" }
        },
        legend: {
            verticalAlignment: "top",
            horizontalAlignment: "center",
            font: { family: "Inter", color: labelColor }
        },
        tooltip: {
            enabled: true,
            customizeTooltip: (info) => ({
                text: `${info.seriesName} : ${formatCurrency(info.value)}`
            })
        }
    });

    // 2. dxPieChart - Répartition par catégorie
    $("#chart-categories").dxPieChart({
        dataSource: data.ventesParCategorie,
        series: [{
            argumentField: "categorie",
            valueField: "montant",
            label: {
                visible: true,
                connector: { visible: true },
                customizeText(arg) {
                    return `${formatCurrency(arg.value)} (${arg.percentText})`;
                }
            }
        }],
        palette: "Soft Pastel",
        legend: {
            verticalAlignment: "bottom",
            horizontalAlignment: "center",
            font: { family: "Inter", color: labelColor }
        },
        tooltip: {
            enabled: true,
            customizeTooltip: (info) => ({
                text: `${info.argument} : ${formatCurrency(info.value)}`
            })
        }
    });
}

// -----------------------------------------------------------------------
// ANALYTICS : fetch + render
// -----------------------------------------------------------------------
async function chargerAnalytics() {
    try {
        const res = await fetch('/api/tableaubord/analytics');
        if (!res.ok) throw new Error("Erreur chargement analytics.");
        const data = await res.json();
        renderAnalyticsKpiBar(data);
        renderAnalyticsCharts(data);
    } catch (err) {
        console.error("Analytics error:", err);
    }
}

// Mini KPI bar for conversion rate
function renderAnalyticsKpiBar(data) {
    const $bar = $("#analytics-kpi-bar");
    $bar.empty();

    const totalDevis = data.tauxConversion.reduce((s, x) => s + x.valeur, 0);
    const convertis  = (data.tauxConversion.find(x => x.label === "Convertis en commande") || {}).valeur || 0;
    const pct = data.tauxConversionPct;

    const kpis = [
        {
            icon: "fa-file-pen", color: "#3b82f6", bg: "#eff6ff",
            label: "Total Devis", value: totalDevis + " devis"
        },
        {
            icon: "fa-arrows-turn-to-dots", color: "#10b981", bg: "#f0fdf4",
            label: "Taux de Conversion", value: pct + "%"
        },
        {
            icon: "fa-check-double", color: "#f59e0b", bg: "#fffbeb",
            label: "Devis Convertis", value: convertis + " → commande(s)"
        },
        {
            icon: "fa-calendar-days", color: "#8b5cf6", bg: "#f5f3ff",
            label: "Total Planifications",
            value: data.spotsParStatut.reduce((s, x) => s + x.count, 0) + " spots"
        }
    ];

    kpis.forEach(k => {
        $bar.append(`
            <div style="flex:1; min-width:160px; background:${k.bg}; border:1px solid ${k.color}22;
                        border-radius:10px; padding:14px 18px; display:flex; align-items:center; gap:12px;">
                <div style="width:38px; height:38px; border-radius:50%; background:${k.color}22;
                            display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                    <i class="fa-solid ${k.icon}" style="color:${k.color}; font-size:16px;"></i>
                </div>
                <div>
                    <div style="font-size:11px; color:#64748b; font-weight:600; text-transform:uppercase; letter-spacing:.04em;">${k.label}</div>
                    <div style="font-size:18px; font-weight:800; color:#1e293b;">${k.value}</div>
                </div>
            </div>
        `);
    });
}

function renderAnalyticsCharts(data) {
    const isDark = $("body").hasClass("dark-mode");
    const labelColor = isDark ? "#94a3b8" : "#64748b";

    const pieConfig = {
        legend: {
            verticalAlignment: "bottom",
            horizontalAlignment: "center",
            font: { family: "Inter", size: 11, color: labelColor }
        },
        tooltip: { enabled: true }
    };

    // -------------------------------------------------------------------
    // 1. Pie : Devis par statut
    // -------------------------------------------------------------------
    $("#chart-devis-statut").dxPieChart({
        ...pieConfig,
        dataSource: data.devisParStatut.map(x => ({
            statut: DEVIS_STATUT_LABELS[x.statut] || x.statut,
            count: x.count
        })),
        series: [{
            argumentField: "statut",
            valueField: "count",
            label: {
                visible: true,
                connector: { visible: true },
                customizeText(arg) { return `${arg.argument}: ${arg.value} (${arg.percentText})`; }
            }
        }],
        customizePoint: function(e) {
            return { color: PIE_PALETTE_DEVIS[e.index % PIE_PALETTE_DEVIS.length] };
        },
        tooltip: {
            enabled: true,
            customizeTooltip(info) { return { text: `${info.argument} : ${info.value} devis`}; }
        }
    });

    // -------------------------------------------------------------------
    // 2. Pie : Commandes par statut
    // -------------------------------------------------------------------
    $("#chart-commandes-statut").dxPieChart({
        ...pieConfig,
        dataSource: data.commandesParStatut.map(x => ({
            statut: COMMANDE_STATUT_LABELS[x.statut] || x.statut,
            count: x.count
        })),
        series: [{
            argumentField: "statut",
            valueField: "count",
            label: {
                visible: true,
                connector: { visible: true },
                customizeText(arg) { return `${arg.argument}: ${arg.value} (${arg.percentText})`; }
            }
        }],
        customizePoint: function(e) {
            return { color: PIE_PALETTE_COMMANDE[e.index % PIE_PALETTE_COMMANDE.length] };
        },
        tooltip: {
            enabled: true,
            customizeTooltip(info) { return { text: `${info.argument} : ${info.value} commande(s)`}; }
        }
    });

    // -------------------------------------------------------------------
    // 3. Pie : Taux de conversion devis → commande
    // -------------------------------------------------------------------
    const conversionData = data.tauxConversion.map(x => ({ label: x.label, valeur: x.valeur }));
    $("#chart-conversion").dxPieChart({
        ...pieConfig,
        dataSource: conversionData,
        innerRadius: 0.55,   // donut
        type: "doughnut",
        series: [{
            argumentField: "label",
            valueField: "valeur",
            label: {
                visible: true,
                connector: { visible: true },
                customizeText(arg) { return `${arg.argument}: ${arg.value} (${arg.percentText})`; }
            }
        }],
        customizePoint: function(e) {
            return { color: PIE_PALETTE_CONV[e.index % PIE_PALETTE_CONV.length] };
        },
        tooltip: {
            enabled: true,
            customizeTooltip(info) { return { text: `${info.argument} : ${info.value} devis`}; }
        },
        centerTemplate: function(pieChart, element) {
            const pct = data.tauxConversionPct;
            element.innerHTML = `
                <text text-anchor="middle" style="font-family:Inter;">
                    <tspan x="0" y="-6" style="font-size:22px; font-weight:800; fill:#10b981;">${pct}%</tspan>
                    <tspan x="0" y="16" style="font-size:11px; fill:#64748b;">Conversion</tspan>
                </text>`;
        }
    });

    // -------------------------------------------------------------------
    // 4. Bar stacked : Revenus par plage horaire, divisé par statut spot
    // -------------------------------------------------------------------
    const plageData = (data.revenuParPlage || []).map(x => ({
        plage:    x.plage,
        planifie: Number(x.planifie) || 0,
        diffuse:  Number(x.diffuse)  || 0,
        annule:   Number(x.annule)   || 0
    }));

    $("#chart-plage-horaire-revenu").dxChart({
        dataSource: plageData,
        commonSeriesSettings: {
            argumentField: "plage",
            type: "stackedBar",
            barPadding: 0.3
        },
        series: [
            { valueField: "planifie", name: "Planifié",  color: "#6366f1" },
            { valueField: "diffuse",  name: "Diffusé",   color: "#10b981" },
            { valueField: "annule",   name: "Annulé",    color: "#ef4444" }
        ],
        argumentAxis: {
            label: { font: { family: "Inter", color: labelColor, size: 11 }, wordWrap: "none", overlappingBehavior: "stagger" }
        },
        valueAxis: {
            label: {
                font: { family: "Inter", color: labelColor, size: 11 },
                customizeText(info) { return formatCurrency(info.value); }
            }
        },
        legend: {
            verticalAlignment: "top",
            horizontalAlignment: "right",
            font: { family: "Inter", size: 11, color: labelColor }
        },
        tooltip: {
            enabled: true,
            customizeTooltip(info) {
                return { text: `${info.seriesName} — ${info.argument}: ${formatCurrency(info.value)}` };
            }
        }
    });

    // -------------------------------------------------------------------
    // 5. Bar : Revenus par variante (produit spot)
    // -------------------------------------------------------------------
    const varianteData = (data.revenuParVariante || []).map(x => ({
        variante: x.variante,
        revenu:   Number(x.revenu) || 0,
        count:    x.count
    }));

    $("#chart-spots-revenu").dxChart({
        dataSource: varianteData,
        commonSeriesSettings: {
            argumentField: "variante",
            type: "bar",
            barPadding: 0.25
        },
        series: [
            { valueField: "revenu", name: "Revenu TTC (TND)", color: "#ec4899" }
        ],
        argumentAxis: {
            label: {
                font: { family: "Inter", color: labelColor, size: 10 },
                overlappingBehavior: "rotate",
                rotationAngle: -30
            }
        },
        valueAxis: {
            label: {
                font: { family: "Inter", color: labelColor, size: 11 },
                customizeText(info) { return formatCurrency(info.value); }
            }
        },
        legend: { visible: false },
        tooltip: {
            enabled: true,
            customizeTooltip(info) {
                const row = varianteData.find(d => d.variante === info.argument);
                return { text: `${info.argument}\nRevenu : ${formatCurrency(info.value)}\nQté : ${row ? row.count : ''}` };
            }
        }
    });

    // -------------------------------------------------------------------
    // 6. Pie : Planification spots par statut
    // -------------------------------------------------------------------
    $("#chart-spots-statut").dxPieChart({
        ...pieConfig,
        dataSource: data.spotsParStatut.map(x => ({
            statut: SPOT_STATUT_LABELS[x.statut] || x.statut,
            count:  x.count
        })),
        series: [{
            argumentField: "statut",
            valueField: "count",
            label: {
                visible: true,
                connector: { visible: true },
                customizeText(arg) { return `${arg.argument}: ${arg.value} (${arg.percentText})`; }
            }
        }],
        customizePoint: function(e) {
            return { color: PIE_PALETTE_SPOTS[e.index % PIE_PALETTE_SPOTS.length] };
        },
        tooltip: {
            enabled: true,
            customizeTooltip(info) { return { text: `${info.argument} : ${info.value} spot(s)`}; }
        }
    });
}
