// --- MODULE TABLEAU DE BORD ---

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

    } catch (err) {
        console.error(err);
        showToast("Erreur de chargement du dashboard.", true);
    }
}

// RENDU GRAPHIQUES DEVEXTREME
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
            label: {
                font: {
                    family: "Inter",
                    color: labelColor
                }
            },
            grid: {
                visible: true,
                color: isDark ? "#1e293b" : "#f1f5f9"
            }
        },
        valueAxis: {
            label: {
                font: {
                    family: "Inter",
                    color: labelColor
                }
            },
            grid: {
                visible: true,
                color: isDark ? "#1e293b" : "#f1f5f9"
            }
        },
        legend: {
            verticalAlignment: "top",
            horizontalAlignment: "center",
            font: {
                family: "Inter",
                color: labelColor
            }
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
                connector: {
                    visible: true
                },
                customizeText(arg) {
                    return `${formatCurrency(arg.value)} (${arg.percentText})`;
                }
            }
        }],
        palette: "Soft Pastel",
        legend: {
            verticalAlignment: "bottom",
            horizontalAlignment: "center",
            font: {
                family: "Inter",
                color: labelColor
            }
        },
        tooltip: {
            enabled: true,
            customizeTooltip: (info) => ({
                text: `${info.argument} : ${formatCurrency(info.value)}`
            })
        }
    });
}
