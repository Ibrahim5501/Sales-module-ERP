// APPLICATION JS - ERP SELLING MODULE (DEVEXTREME - FRANÇAIS)

// Initialiser la langue de DevExtreme en français
DevExpress.localization.locale("fr");

// Interception Fetch pour JWT
const originalFetch = window.fetch;
window.fetch = async function (url, options) {
    options = options || {};
    const token = localStorage.getItem("digi_erp_token");
    
    // Ajouter l'en-tête d'autorisation pour les requêtes API locales
    if (token && (url.startsWith("/api/") || url.startsWith("api/"))) {
        options.headers = options.headers || {};
        if (options.headers.append) {
            options.headers.set("Authorization", "Bearer " + token);
        } else {
            options.headers["Authorization"] = "Bearer " + token;
        }
    }
    
    const response = await originalFetch(url, options);
    
    // Si non autorisé (token expiré/invalide), forcer la déconnexion
    if (response.status === 401 && !url.includes("api/auth/login")) {
        triggerLogout();
    }
    
    return response;
};

function triggerLogout() {
    localStorage.removeItem("digi_erp_token");
    localStorage.removeItem("digi_erp_user_name");
    localStorage.removeItem("digi_erp_user_email");
    $("#login-screen").css("display", "flex");
    $(".app-container").css("display", "none");
    $("#login-password").val("");
    $("#login-error").hide();
}

function updateUserInfoUI() {
    const userName = localStorage.getItem("digi_erp_user_name") || "Utilisateur";
    $(".user-name").text(userName);
}

// Variables d'état global
let clientsData = [];
let produitsData = [];
let commandesData = [];
let facturesData = [];
let devisData = [];
let categoriesData = [];
let livraisonsData = [];
let internalDevisLines = [];
let activeTab = 'tableau-bord';
let toastInstance = null;
let activeReglementFactId = 0;
let produitSelectionne = null;

// INITIALISATION DE L'APPLICATION
$(document).ready(() => {
    // Initialiser les notifications Toast
    initToast();

    // Renseigner la date du jour
    formatCurrentDate();

    // Configurer la déconnexion
    $("#logout-btn").on("click", () => {
        triggerLogout();
        showToast("Vous avez été déconnecté.");
    });

    // Configurer le formulaire de connexion
    $("#login-form").on("submit", async (e) => {
        e.preventDefault();
        const email = $("#login-email").val();
        const password = $("#login-password").val();
        $("#login-error").hide();
        $("#btn-login-submit").prop("disabled", true).find("span").text("Connexion...");

        try {
            const res = await originalFetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || "Identifiants invalides");
            }

            const data = await res.json();
            localStorage.setItem("digi_erp_token", data.token);
            localStorage.setItem("digi_erp_user_name", data.email);
            localStorage.setItem("digi_erp_user_email", data.email);

            updateUserInfoUI();
            
            // Masquer l'écran de connexion et afficher l'ERP
            $("#login-screen").hide();
            $(".app-container").css("display", "flex");
            
            showToast("Connexion réussie. Bienvenue, " + data.email + " !");
            
            // Charger les listes de base et le dashboard
            chargerToutesLesDonnees();
        } catch (err) {
            console.error(err);
            $("#login-error").find("span").text(err.message);
            $("#login-error").fadeIn();
        } finally {
            $("#btn-login-submit").prop("disabled", false).find("span").text("Se connecter");
        }
    });

    // Configurer la navigation SPA
    setupNavigation();

    // Initialiser les widgets de Popups
    initPopupClient();
    initPopupArticle();
    initPopupReglement();
    initPopupDetailCommande();
    initPopupDevis();
    initPopupDetailDevis();
    initPopupCategorie();
    initPopupDetailLivraison();
    initPopupSaisirQte();

    // Lier les boutons d'ouverture aux Popups DevExtreme
    $("#btn-creer-client-dx").on("click", () => {
        $("#popup-client").dxPopup("instance").show();
    });
    $("#btn-creer-article-dx").on("click", () => {
        $("#popup-article").dxPopup("instance").show();
    });
    $("#btn-creer-devis-dx").on("click", () => {
        ouvrirNouveauDevisPopup();
    });

    // Gérer l'état de démarrage de l'authentification
    if (localStorage.getItem("digi_erp_token")) {
        updateUserInfoUI();
        $("#login-screen").hide();
        $(".app-container").css("display", "flex");
        chargerToutesLesDonnees();
    } else {
        $("#login-screen").css("display", "flex");
        $(".app-container").css("display", "none");
    }

    $("#popup-ajout-stock").dxPopup({
        title: "Ajouter du stock",
        width: 350,
        height: "auto",
        visible: false,
        showCloseButton: true,
        contentTemplate: (container) => {
            $("<div id='form-ajout-stock'>").appendTo(container);
        },
        toolbarItems: [{
            widget: "dxButton",
            toolbar: "bottom",
            location: "after",
            options: {
                text: "Ajouter",
                type: "success",
                onClick: ajouterStock
            }
        }]
    });
});

// INITIALISER DX TOAST
function initToast() {
    toastInstance = $("#dx-toast").dxToast({
        displayTime: 3000,
        position: "bottom right",
        animation: {
            show: {
                type: "slide",
                duration: 300,
                from: {
                    position: {
                        my: "right bottom",
                        at: "right bottom",
                        offset: "0 100"
                    }
                }
            },
            hide: {
                type: "fadeOut",
                duration: 200
            }
        }
    }).dxToast("instance");
}

function showToast(message, isError = false) {
    if (toastInstance) {
        toastInstance.option({
            message: message,
            type: isError ? "error" : "success"
        });
        toastInstance.show();
    } else {
        alert(message);
    }
}

// FORMATER LA DATE DU JOUR
function formatCurrentDate() {
    // No date element in topnav layout â€” function kept for compatibility
}

// NAVIGATION SPA
function setupNavigation() {
    $(".topnav-item").on("click", function(e) {
        e.preventDefault();
        const targetId = $(this).attr("href").substring(1);
        switchTab(targetId);
    });
}

function switchTab(tabId) {
    activeTab = tabId;
    
    // Mettre à jour la classe active sur les liens nav
    $(".topnav-item").removeClass("active");
    $(`.topnav-item[href="#${tabId}"]`).addClass("active");

    // Afficher le bon pane
    $(".tab-pane").removeClass("active");
    $(`#pane-${tabId}`).addClass("active");

    // Recharger les données de la vue correspondante
    if (tabId === 'tableau-bord') {
        chargerDashboard();
    } else if (tabId === 'devis') {
        chargerDevis();
    } else if (tabId === 'commandes') {
        chargerCommandes();
    } else if (tabId === 'factures') {
        chargerFactures();
    } else if (tabId === 'clients') {
        chargerClients();
    } else if (tabId === 'articles') {
        chargerProduits();
    } else if (tabId === 'livraisons') {
        chargerLivraisons();
    }
}

// CHARGEMENT INITIAL DES DONNÉES
async function chargerToutesLesDonnees() {
    try {
        const [clientsRes, produitsRes] = await Promise.all([
            fetch('/api/clients'),
            fetch('/api/produits')
        ]);
        
        clientsData = await clientsRes.json();
        produitsData = await produitsRes.json();

        // Mettre à jour le dashboard au démarrage
        chargerDashboard();
    } catch (err) {
        console.error(err);
        showToast("Impossible de charger les données du serveur.", true);
    }
}

// FORMAT DEVISE HT
function formatCurrency(val) {
    return new Intl.NumberFormat('fr-FR').format(val);
}

// --- VUE TABLEAU DE BORD ---
async function chargerDashboard() {
    try {
        const res = await fetch('/api/tableaubord');
        const data = await res.json();
        
        // Mettre à jour les KPI
        $("#kpi-ca").text(formatCurrency(data.indicateurs.chiffreAffairesTotal));
        $("#kpi-commandes").text(data.indicateurs.nombreCommandes);
        $("#kpi-impayes").text(formatCurrency(data.indicateurs.montantImpaye));
        $("#kpi-taux-recouvrement").text(`Recouvrement : ${data.indicateurs.tauxRecouvrement}%`);
        
        // Alerte badges
        $("#stock-alert-badge").text(data.indicateurs.alertesStock);
        $("#stock-alert-count").text(`${data.indicateurs.alertesStock} alerte${data.indicateurs.alertesStock > 1 ? 's' : ''}`);

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
                }},
                {
                    dataField: "entreprise",
                    caption: "Entreprise"
                },
                {
                    dataField: "totalAchats",
                    caption: "Total Commandé",
                    alignment: "right"
                },
                {
                    dataField: "nombreCommandes",
                    caption: "Commandes",
                    alignment: "center"
                }
            ],
            showBorders: false,
            showColumnHeaders: true,
            paging: {
                enabled: false
            },
            scrolling: {
                mode: "none"
            }
        });

        // Alertes stocks
        const alertsContainer = $("#dashboard-stock-alerts");
        alertsContainer.empty();
        const alertProds = produitsData.filter(p => p.quantiteStock <= 5);
        if (alertProds.length === 0) {
            alertsContainer.html(`<div class="text-center text-muted" style="padding:24px;">Tous les stocks sont corrects.</div>`);
        } else {
            alertProds.forEach(p => {
                const enRupture = p.quantiteStock === 0;
                alertsContainer.append(`
                    <div class="alert-item ${enRupture ? '' : 'warning'}">
                        <div class="alert-item-icon"><i class="fa-solid ${enRupture ? 'fa-triangle-exclamation' : 'fa-circle-exclamation'}"></i></div>
                        <div class="alert-item-details">
                            <span class="alert-item-title">${p.designation}</span>
                            <span class="alert-item-meta">SKU: ${p.code} | Categorie: ${p.nomCategorie}</span>
                        </div>
                        <span class="alert-stock-badge">${enRupture ? 'RUPTURE' : p.quantiteStock + ' ' + p.unite}</span>
                    </div>
                `);
            });
        }

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

// --- VUE COMMANDES (dxDataGrid) ---
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
                    width: 400,
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
                    width: 170
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
    if (!confirm("Valider cette commande ? Le stock sera mis à jour et un fichier PDF sera généré.")) return;
    try {
        const res = await fetch(`/api/commandes/${id}/valider`, { method: 'POST' });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || "Erreur de validation");
        }
        showToast("Commande validée ! Fichier PDF généré et stock mis à jour.");
        chargerToutesLesDonnees();
        chargerCommandes();
    } catch (err) {
        showToast(err.message, true);
    }
}

async function annulerCommande(id) {
    if (!confirm("Annuler cette commande ? Le stock validé sera récrédité.")) return;
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
                }
                else {
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
            linesHtml += `
                <div class="detail-item-row" style="display:flex; justify-content:space-between; padding:8px 12px; background:var(--bg-app); border-radius:4px; margin-bottom:8px; font-size:13px;">
                    <div style="display:flex; flex-direction:column;">
                        <strong>${l.designation}</strong>
                        <span style="font-size:11px; color:var(--text-muted);">${l.quantite} x ${formatCurrency(l.prixUniversitaire)} ${remiseStr}</span>
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
                    <div><span style="color:var(--text-muted);">Total TTC (TND):</span> <strong class="text-primary">${formatCurrency(c.montantTTC)}</strong></div>
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

// --- VUE FACTURES (dxDataGrid) ---
async function chargerFactures() {
    try {
        const res = await fetch('/api/factures');
        facturesData = await res.json();
        
        // Calcul des KPI Factures
        const totalHT = facturesData.reduce((sum, f) => sum + (f.montantHT || f.montantTotal / 1.2), 0);
        const totalTTC = facturesData.reduce((sum, f) => sum + f.montantTotal, 0);
        const totalPaye = facturesData.reduce((sum, f) => sum + (f.montantPaye || 0), 0);
        const totalReste = totalTTC - totalPaye;
        
        const fmt = (v) => new Intl.NumberFormat('fr-FR', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(v);
        $("#kpi-fact-ca-ht").text(fmt(totalHT));
        $("#kpi-fact-ca-ttc").text(fmt(totalTTC));
        $("#kpi-fact-perdu").text(fmt(totalPaye));
        $("#kpi-fact-reste").text(fmt(totalReste));
        
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
                    width: 150
                },
                {
                    dataField: "dateEcheance",
                    caption: "Date Échéance",
                    dataType: "date",
                    format: "dd/MM/yyyy",
                    width: 150
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
                    width: 150
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

// --- VUE CLIENTS (dxDataGrid) ---
async function chargerClients() {
    try {
        const res = await fetch('/api/clients');
        clientsData = await res.json();

        $("#grid-clients").dxDataGrid({
            dataSource: clientsData,
            allowColumnResizing: true,
            columnResizingMode: "widget",
            columnAutoWidth: true,
            showBorders: false,
            searchPanel: {
                visible: true,
                width: 260,
                placeholder: "Rechercher un client..."
            },
            filterRow: {
                visible: true
            },
            groupPanel: {
                visible: true,
                placeholder: "Faites glisser une colonne pour grouper"
            },
            paging: {
                pageSize: 10
            },
            columns: [
                {
                    dataField: "entreprise",
                    caption: "Entreprise / Raison Sociale",
                    cellTemplate: (container, options) => {
                        $("<strong>").text(options.value).appendTo(container);
                }},
                {
                    dataField: "nom",
                    caption: "Nom Contact"
                },
                {
                    dataField: "email",
                    caption: "Email"
                },
                {
                    dataField: "telephone",
                    caption: "Téléphone",
                    width: 140
                },
                {
                    dataField: "adresse",
                    caption: "Adresse Postale"
                },
            ]
        });
    } catch (err) {
        console.error(err);
        showToast("Erreur de chargement des clients.", true);
    }
}

// CREER CLIENT (POPUP + FORMULAIRE DX)
function initPopupClient() {
    $("#popup-client").dxPopup({
        title: "Créer une fiche Client",
        width: 500,
        height: "auto",
        visible: false,
        dragEnabled: true,
        showCloseButton: true,
        contentTemplate: (container) => {
            $("<div id='dx-form-client'>").appendTo(container);
        },
        toolbarItems: [
            {
                shortcut: "done",
                location: "after",
                toolbar: "bottom",
                widget: "dxButton",
                options: {
                    text: "Enregistrer",
                    type: "default",
                    onClick: () => soumettreClient()
                }
            },
            {
                shortcut: "cancel",
                location: "after",
                toolbar: "bottom",
                widget: "dxButton",
                options: {
                    text: "Annuler",
                    onClick: () => $("#popup-client").dxPopup("instance").hide()
                }
            }
        ],
        onShowing: () => {
            // Initialiser ou réinitialiser le formulaire
            $("#dx-form-client").dxForm({
                formData: {
                    nom: "",
                    entreprise: "",
                    email: "",
                    telephone: "",
                    adresse: "",
                },
                labelLocation: "top",
                items: [
                    {
                        dataField: "nom",
                        label: {
                            text: "Nom du Contact Principal"
                        },
                        validationRules: [{
                            type: "required",
                            message: "Le nom est requis."
                        }]
                    },
                    {
                        dataField: "entreprise",
                        editorType: "dxAutocomplete",
                        editorOptions: {
                            dataSource: [...new Set(clientsData.map(c => c.entreprise))],
                            searchMode: "contains",
                            minSearchLength: 1,

                            onValueChanged(e) {

                                const client = clientsData.find(c =>
                                    c.entreprise === e.value);

                                if (!client)
                                    return;

                                const form = $("#dx-form-client").dxForm("instance");

                                form.updateData("nom", client.nom);
                                form.updateData("email", client.email);
                                form.updateData("telephone", client.telephone);
                                form.updateData("adresse", client.adresse);
                            }
                        }
                    },
                    {
                        dataField: "email",
                        label: {
                            text: "Adresse E-mail"
                        },
                        validationRules: [
                            {
                                type: "required",
                                message: "L'email est requis."
                            },
                            {
                                type: "email",
                                message: "Format d'email invalide."
                            }]
                    },
                    {
                        dataField: "telephone",
                        label: {
                            text: "Téléphone"
                        }
                    },
                    {
                        dataField: "adresse",
                        label: {
                            text: "Adresse Postale"
                        }
                    },
                ]
            });
        }
    });
}

async function soumettreClient() {
    const form = $("#dx-form-client").dxForm("instance");
    const result = form.validate();
    
    if (!result.isValid) return;
    
    const payload = form.option("formData");

    try {
        const res = await fetch('/api/clients', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error("Erreur serveur lors de la création.");
        
        showToast("Nouveau client créé avec succès !");
        $("#popup-client").dxPopup("instance").hide();
        
        chargerToutesLesDonnees();
        if (activeTab === 'clients') chargerClients();
    } catch (err) {
        showToast(err.message, true);
    }
}

// --- VUE ARTICLES (dxDataGrid) ---
async function chargerProduits() {
    try {
        const res = await fetch('/api/produits');
        produitsData = await res.json();

        $("#grid-articles").dxDataGrid({
            dataSource: produitsData,
            allowColumnResizing: true,
            columnResizingMode: "widget",
            columnAutoWidth: true,
            showBorders: false,
            searchPanel: {
                visible: true,
                width: 260,
                placeholder: "Rechercher un article..."
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
                    dataField: "code",
                    caption: "Code / SKU",
                    width: 130,
                    cellTemplate: (container, options) => {
                        $("<strong style='font-family:monospace;'>").text(options.value).appendTo(container);
                }},
                {
                    dataField: "designation",
                    caption: "D\u00e9signation"
                },
                {
                    dataField: "nomCategorie",
                    caption: "Cat\u00e9gorie",
                    width: 150
                },
                {
                    dataField: "unite",
                    caption: "Unit\u00e9",
                    width: 100,
                    alignment: "center"
                },
                {
                    dataField: "prixUniversitaire",
                    caption: "Prix Unit. HT (TND)",
                    alignment: "right",
                    width: 170
                },
                {
                    dataField: "tauxTVA",
                    caption: "TVA (%)",
                    alignment: "center",
                    width: 100
                },
                {
                    dataField: "quantiteStock",
                    caption: "Stock",
                    alignment: "center",
                    width: 180,
                    cellTemplate: renderStockProgressBar
                },
                {
                    caption: "Actions",
                    width: 120,
                    alignment: "center",
                    cellTemplate: (container, options) => {
                        $("<div>").dxButton({
                            icon: "plus",
                            text: "Stock",
                            type: "success",
                            onClick: () => ouvrirPopupAjoutStock(options.data)
                        }).appendTo(container);
                    }
                },
                {
                    dataField: "actif",
                    caption: "Actif",
                    dataType: "boolean",
                    width: 100,
                    alignment: "center",
                    cellTemplate: (container, options) => {
                        $("<div>").dxSwitch({
                            value: options.value,
                            onValueChanged: async function (e) {
                                await fetch(`/api/produits/${options.data.id_Produit}/Actif`, {
                                    method: "PUT",
                                    headers: {
                                        "Content-Type": "application/json"
                                    },
                                    body: JSON.stringify(e.value)
                                });
                                showToast("Statut modifié");
                        }
                    }).appendTo(container);
                }}
            ]
        });
    } catch (err) {
        console.error(err);
        showToast("Erreur de chargement des articles.", true);
    }
}

function ouvrirPopupAjoutStock(produit) {
    produitSelectionne = produit;
    $("#popup-ajout-stock").dxPopup("instance").show();
    $("#form-ajout-stock").dxForm({
        formData: {
            quantite: 1
        },
        items: [{
            dataField: "quantite",
            label: {
                text: "Quantité à ajouter"
            },
            editorType: "dxNumberBox",
            editorOptions: {
                min: 1
            },
            validationRules: [{
                type: "required"
            }]
        }]
    });
}

async function ajouterStock() {
    const form = $("#form-ajout-stock").dxForm("instance");
    if (!form.validate().isValid)
        return;
    const qte = form.option("formData").quantite;
    const res = await fetch(`/api/produits/${produitSelectionne.id_Produit}/stock`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(qte)
    });
    if (!res.ok) {
        showToast("Erreur lors de l'ajout du stock", true);
        return;
    }
    showToast("Stock mis à jour");
    $("#popup-ajout-stock").dxPopup("instance").hide();
    chargerProduits();
}

// RENDU CELLULE JAUGE DE STOCK
function renderStockProgressBar(container, options) {
    const p = options.data;
    const stock = p.quantiteStock;
    const seuil = p.seuilAlerte;
    const sousAlerte = stock <= seuil;
    const enRupture = stock === 0;
    let stockFillClass = '';
    if (enRupture)
        stockFillClass = 'danger';
    else if (sousAlerte)
        stockFillClass = 'warning';
    
    const pct = Math.min((stock / 50) * 100, 100);
    const $wrapper = $("<div style='display:flex; flex-direction:column; gap:4px; width:100%;'>");
    $wrapper.append(`
        <div style="display:flex; justify-content:space-between; font-size:12px; font-weight:600;">
            <span>${stock} ${p.unite}</span>
            ${enRupture ? '<span class="text-danger" style="font-size:10px;">RUPTURE</span>' : (sousAlerte ? '<span class="text-warning" style="font-size:10px;">BAS</span>' : '')}
        </div>
        <div class="stock-bar-bg" style="height:6px; background-color:var(--border); border-radius:10px; overflow:hidden; width:100%;">
            <div class="stock-bar-fill ${stockFillClass}" style="height:100%; width:${pct}%; border-radius:10px;"></div>
        </div>
    `);
    $wrapper.appendTo(container);
}

// CHARGER CATEGORIES
async function chargerCategories() {
    const res = await fetch('/api/categories');
    if (!res.ok) {
        throw new Error("Impossible de charger les catégories.");
    }
    categoriesData = await res.json();
}

function initPopupCategorie() {
    $("#popup-categorie").dxPopup({
        title: "Nouvelle catégorie",
        width: 400,
        height: "auto",
        visible: false,
        contentTemplate: container => {
            $("<div id='form-categorie'>").appendTo(container);
        },
        toolbarItems: [
            {
                widget: "dxButton",
                location: "after",
                toolbar: "bottom",
                options: {
                    text: "Créer",
                    type: "success",
                    onClick: creerCategorie
                }
            },
            {
                widget: "dxButton",
                location: "after",
                toolbar: "bottom",
                options: {
                    text: "Annuler",
                    onClick: () =>
                        $("#popup-categorie").dxPopup("instance").hide()
                }
            }
        ],
        onShowing() {
            $("#form-categorie").dxForm({
                formData: {
                    nom: "",
                    description: ""
                },
                labelLocation: "top",
                items: [
                    {
                        dataField: "nom",
                        validationRules: [
                            {
                                type: "required"
                            }
                        ]
                    },
                    {
                        dataField: "description",
                        editorType: "dxTextArea"
                    }
                ]
            });
        }
    });
}

// CREER ARTICLE (POPUP DX)
function initPopupArticle() {
    $("#popup-article").dxPopup({
        title: "Ajouter un article au catalogue",
        width: 520,
        height: "auto",
        visible: false,
        dragEnabled: true,
        showCloseButton: true,
        contentTemplate: (container) => {
            $("<div id='dx-form-article'>").appendTo(container);
        },
        toolbarItems: [
            {
                shortcut: "done",
                location: "after",
                toolbar: "bottom",
                widget: "dxButton",
                options: {
                    text: "Créer l'Article",
                    type: "default", onClick: () => soumettreArticle()
                }
            },
            {
                shortcut: "cancel",
                location: "after",
                toolbar: "bottom",
                widget: "dxButton",
                options: {
                    text: "Annuler", 
                    onClick: () => $("#popup-article").dxPopup("instance").hide()
                }
            }
        ],
        onShowing: async () => {
            await chargerCategories();
            $("#dx-form-article").dxForm({
                formData: {
                    Code: "",
                    Designation: "",
                    id_Categorie: null,
                    prixUniversitaire: 0,
                    QuantiteStock: 10,
                    Unite: "Unité",
                    seuilAlerte: 3,
                    TauxTVA: 19,
                    Actif: 1
                },
                labelLocation: "top",
                items: [
                    {
                        dataField: "Code",
                        label: {
                            text: "Code Unique (SKU)"
                        },
                        validationRules: [{
                            type: "required",
                            message: "Le code SKU est requis."
                        }]
                    },
                    {
                        dataField: "Designation",
                        label: {
                            text: "Nom de l'Article"
                        },
                        validationRules: [{
                            type: "required",
                            message: "La désignation est requise."
                        }]
                    },
                    {
                        itemType: "group",
                        colCount: 2,
                        items: [
                            {
                                dataField: "id_Categorie",
                                colSpan: 1,
                                label: {
                                    text: "Catégorie"
                                },
                                editorType: "dxSelectBox",
                                editorOptions: {
                                    dataSource: categoriesData,
                                    displayExpr: "nom",
                                    valueExpr: "id_Categorie",
                                    searchEnabled: true,
                                    placeholder: "Sélectionner une catégorie"
                                }
                            },
                            {
                                itemType: "button",
                                horizontalAlignment: "left",
                                buttonOptions: {
                                    icon: "plus",
                                    text: "Catégorie",
                                    type: "default",
                                    onClick: () => $("#popup-categorie").dxPopup("instance").show()
                                }
                            }
                        ]
                    },
                    {
                        dataField: "prixUniversitaire",
                        label: {
                            text: "Prix Unitaire HT (TND)"
                        },
                        editorType: "dxNumberBox",
                        editorOptions: {
                            min: 0.01,
                            format: "#,###0.000 TND"
                        }
                    },
                    {
                        dataField: "QuantiteStock",
                        label: {
                            text: "Stock Initial"
                        },
                        editorType: "dxNumberBox",
                        editorOptions: {
                            min: 0
                        }
                    },
                    {
                        dataField: "TauxTVA",
                        label: {
                            text: "TVA (%)"
                        },
                        editorType: "dxNumberBox",
                        editorOptions: {
                            min: 0.1,
                            format: "00.0%"
                        }
                    },
                    {
                        dataField: "Unite",
                        label: {
                            text: "Unité de vente (cm, kg, etc...)"
                        }
                    },
                ]
            });
        }
    });
}

function ouvrirPopupArticle() {
    const popup = $("#popup-article").dxPopup("instance");

    // Reset the form if it already exists
    const form = $("#dx-form-article").dxForm("instance");

    if (form) {
        form.option("formData", {
            Code: "",
            Designation: "",
            id_Categorie: null,
            prixUniversitaire: 0,
            QuantiteStock: 10,
            Unite: "Unité",
            seuilAlerte: 3,
            TauxTVA: 19,
            Actif: 1
        });

        form.resetValidation();
    }

    popup.show();
}

async function creerCategorie() {
    const form = $("#form-categorie").dxForm("instance");
    if (!form.validate().isValid)
        return;
    const data = form.option("formData");
    const response = await fetch("/api/categories", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        showToast("Erreur lors de la création.", true);
        return;
    }
    const nouvelleCategorie = await response.json();
    await chargerCategories();
    $("#popup-categorie").dxPopup("instance").hide();
    showToast("Catégorie créée.");

    // Refresh the dropdown
    const articleForm = $("#dx-form-article").dxForm("instance");

    const editor = articleForm.getEditor("id_Categorie");
    editor.option("dataSource", categoriesData);

    // Automatically select the new category
    editor.option("value", nouvelleCategorie.id_Categorie);
}

async function soumettreArticle() {
    const form = $("#dx-form-article").dxForm("instance");
    const result = form.validate();
    
    if (!result.isValid)
        return;
    
    const payload = form.option("formData");

    try {
        const res = await fetch('/api/produits', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || "Erreur de création de l'article.");
        }
        showToast("Article créé avec succès !");
        $("#popup-article").dxPopup("instance").hide();
        chargerToutesLesDonnees();
        if (activeTab === 'articles')
            chargerProduits();
        const grid = $("#dx-grid-devis-lines").dxDataGrid("instance");
        if (grid) {
            grid.refresh();
        }
    } catch (err) {
        showToast(err.message, true);
    }
}

async function soumettreCommande() {
    const headerForm = $("#dx-form-commande-header").dxForm("instance");
    const headerValidation = headerForm.validate();
    
    if (!headerValidation.isValid)
        return;

    const grid = $("#dx-grid-commande-lines").dxDataGrid("instance");
    
    // S'assurer que le mode édition est validé
    grid.closeEditCell();
    
    const lines = grid.option("dataSource") || [];
    if (lines.length === 0) {
        showToast("Veuillez saisir au moins une ligne d'article.", true);
        return;
    }

    // Vérifier les lignes valides
    let aDesErreurs = false;
    lines.forEach(l => {
        if (!l.produitId || !l.quantite || l.quantite <= 0) {
            aDesErreurs = true;
        }
    });

    if (aDesErreurs) {
        showToast("Veuillez corriger les erreurs dans le tableau des articles.", true);
        return;
    }

    // Construire le payload
    const headerData = headerForm.option("formData");
    const payload = {
        clientId: headerData.clientId,
        notes: headerData.notes || "",
        lignes: lines.map(l => ({
            produitId: l.produitId,
            quantite: l.quantite,
            tauxRemise: l.tauxRemise || 0
        }))
    };

    try {
        const res = await fetch('/api/commandes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || "Erreur de création de commande.");
        }

        showToast("Commande créée en statut Brouillon !");
        $("#popup-commande").dxPopup("instance").hide();
        
        chargerToutesLesDonnees();
        if (activeTab === 'commandes') chargerCommandes();
    } catch (err) {
        showToast(err.message, true);
    }
}

// ============================================================
// --- VUE DEVIS (dxDataGrid) ---
// ============================================================
async function chargerDevis() {
    try {
        const res = await fetch('/api/devis');
        devisData = await res.json();

        // KPI Devis
        const total = devisData.length;
        const envoyes = devisData.filter(d => d.statut === 'Envoye').length;
        const acceptes = devisData.filter(d => d.statut === 'Accepte').length;
        const montantTotal = devisData.reduce((s, d) => s + (d.montantTTC || 0), 0);
        const fmt = v => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

        $("#kpi-devis-total").text(total);
        $("#kpi-devis-envoyes").text(envoyes);
        $("#kpi-devis-acceptes").text(acceptes);
        $("#kpi-devis-montant").text(fmt(montantTotal));

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
                    width: 150,
                    cellTemplate: (container, options) => {
                        $("<strong>").text(options.value).appendTo(container); 
                    }},
                {
                    dataField: "nomPartenaire",
                    caption: "Client",
                    width: 250
                },
                {
                    dataField: "dateDevis",
                    caption: "Date",
                    dataType: "date",
                    format: "dd/MM/yyyy",
                    width: 110
                },
                {
                    dataField: "dateValidite",
                    caption: "Validité",
                    dataType: "date",
                    format: "dd/MM/yyyy",
                    width: 110
                },
                {
                    dataField: "statut",
                    caption: "Statut",
                    width: 120,
                    alignment: "center",
                    cellTemplate: renderDevisBadge
                },
                {
                    dataField: "montantHT",
                    caption: "Montant HT (TND)",
                    alignment: "right",
                    width: 170
                },
                {
                    dataField: "montantTTC",
                    caption: "Total TTC (TND)",
                    alignment: "right",
                    width: 170
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
        if (!res.ok)
            throw new Error("Impossible de charger le devis.");

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
                }
                else {
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

            const remiseStr = l.remise > 0 ? `(-${l.remise}%)` : "";

            linesHtml += `
                <div class="detail-item-row"
                     style="display:flex;
                            justify-content:space-between;
                            padding:8px 12px;
                            background:var(--bg-app);
                            border-radius:4px;
                            margin-bottom:8px;
                            font-size:13px;">

                    <div style="display:flex; flex-direction:column;">
                        <strong>${l.designation}</strong>

                        <span style="font-size:11px;color:var(--text-muted);">
                            ${l.quantite} × ${formatCurrency(l.prixUniversitaire)} ${remiseStr}
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

                <h4 style="font-size:11px;
                           text-transform:uppercase;
                           color:var(--text-light);
                           margin-bottom:6px;
                           font-weight:700;">
                    Informations Générales
                </h4>

                <div style="display:grid;
                            grid-template-columns:1fr 1fr;
                            gap:12px;
                            padding:12px;
                            background:var(--bg-app);
                            border:1px solid var(--border);
                            border-radius:8px;
                            font-size:13px;">

                    <div>
                        <span style="color:var(--text-muted);">
                            N° Devis :
                        </span>

                        <strong>${d.numeroDevis}</strong>
                    </div>

                    <div>
                        <span style="color:var(--text-muted);">
                            Statut :
                        </span>

                        <span class="badge ${badgeClass}">
                            ${badgeLabel}
                        </span>
                    </div>

                    <div>
                        <span style="color:var(--text-muted);">
                            Date :
                        </span>

                        <strong>${dateDevis}</strong>
                    </div>

                    <div>
                        <span style="color:var(--text-muted);">
                            Validité :
                        </span>

                        <strong>${dateValidite}</strong>
                    </div>

                    <div>
                        <span style="color:var(--text-muted);">
                            Total HT :
                        </span>

                        <strong>${formatCurrency(d.montantHT)}</strong>
                    </div>

                    <div>
                        <span style="color:var(--text-muted);">
                            Total TTC :
                        </span>

                        <strong class="text-primary">
                            ${formatCurrency(d.montantTTC)}
                        </strong>
                    </div>

                </div>

            </div>

            <div style="margin-bottom:20px;">

                ${actionsHtml}

                <h4 style="font-size:11px;
                           text-transform:uppercase;
                           color:var(--text-light);
                           margin-bottom:6px;
                           font-weight:700;">
                    Client
                </h4>

                <div style="padding:12px;
                            background:var(--bg-app);
                            border:1px solid var(--border);
                            border-radius:8px;
                            font-size:13px;">

                    <strong>${d.nomPartenaire}</strong>

                </div>

            </div>

            <div style="margin-bottom:20px;">

                <h4 style="font-size:11px;
                           text-transform:uppercase;
                           color:var(--text-light);
                           margin-bottom:6px;
                           font-weight:700;">
                    Lignes du Devis
                </h4>

                ${linesHtml}

            </div>

            ${d.notes ? `
                <div>

                    <h4 style="font-size:11px;
                               text-transform:uppercase;
                               color:var(--text-light);
                               margin-bottom:6px;
                               font-weight:700;">
                        Notes
                    </h4>

                    <div style="padding:12px;
                                background:var(--warning-light);
                                border-left:3px solid var(--warning);
                                border-radius:4px;
                                font-size:13px;
                                color:#92400e;">

                        ${d.notes}

                    </div>

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
        width: 820,
        height: "auto",
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
                <div style="margin-top:15px; margin-left:auto; width:260px; padding:10px; background:var(--bg-app); border:1px solid var(--border); border-radius:6px; font-size:12.5px;">
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

function ouvrirPopupClient() {
    $("#popup-client")
        .dxPopup("instance")
        .show();
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
            dateValidite: new Date(new Date().setDate(new Date().getDate() + 30))
        },
        colCount: 2,
        items: [
            {
                dataField: "clientId",
                colSpan: 1,
                label: {
                    text: "Client"
                },
                editorType: "dxSelectBox",
                editorOptions: {
                    dataSource: clientsData,
                    valueExpr: "id_Partenaire",
                    displayExpr: item =>
                        item ? `${item.nom} (${item.entreprise})` : "",
                    searchEnabled: true,
                    placeholder: "-- Sélectionner le client --",

                    onValueChanged(e) {

                        const client = clientsData.find(c =>
                            c.id_Partenaire === e.value);

                        if (!client)
                            return;

                        const form = $("#dx-form-devis-header")
                            .dxForm("instance");

                        form.updateData("adresseFacturation",
                            client.adresse);

                        form.updateData("adresseLivraison",
                            client.adresse);
                    }
                },
                validationRules: [{
                    type: "required"
                }]
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
                                ouvrirPopupClient();
                            }
                        }
                    },
                    {
                        itemType: "button",
                        buttonOptions: {
                            icon: "product",
                            text: "Nouveau article",
                            type: "normal",
                            width: "100%",
                            onClick() {
                                ouvrirPopupArticle();
                            }
                        }
                    }
                ]
            },
            {
                dataField: "adresseFacturation",
                colSpan: 2,
                label: {
                    text: "Adresse de facturation"
                },
                editorType: "dxTextArea",
                editorOptions: {
                    height: 60
                }
            },
            {
                dataField: "adresseLivraison",
                colSpan: 2,
                label: {
                    text: "Adresse de livraison"
                },
                editorType: "dxTextArea",
                editorOptions: {
                    height: 60
                }
            },
            {
                dataField: "dateValidite",
                colSpan: 2,
                label: {
                    text: "Date de validité"
                },
                editorType: "dxDateBox",
                editorOptions: {
                    type: "date",
                    displayFormat: "dd/MM/yyyy",
                    useMaskBehavior: true,
                    min: new Date()
                },
                validationRules: [
                    {
                        type: "required",
                        message: "La date de validité est obligatoire."
                    }
                ]
            },
        ]
    }
    );

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
        height: 200,
        scrolling: {
            mode: "virtual"
        },
        columns: [
            {
                dataField: "produitId",
                caption: "Article / Produit",
                width: 150,
                lookup: {
                    dataSource: produitsData.filter(p =>
                        p.actif === true &&
                        p.quantiteStock > 0
                    ),
                    valueExpr: "id_Produit",
                    displayExpr: item =>
                        item ? `${item.designation} (${item.code})` : ""
                },
                validationRules: [{
                    type: "required"
                }],
                setCellValue: (rowData, value) => {
                    rowData.produitId = value;
                    const prod = produitsData.find(p => p.id_Produit === value);
                    if (prod) {
                        rowData.prixUniversitaire = prod.prixUniversitaire;
                        rowData.TauxTVA = prod.TauxTVA || 19;
                        rowData.quantite = 1;
                        rowData.remise = 0;
                        rowData.stockDisponible = prod.quantiteStock;
                    }
                },
            },
            {
                dataField: "prixUniversitaire",
                caption: "Prix Unit. HT (TND)",
                dataType: "number",
                allowEditing: true,
                width: 120,
                alignment: "right"
            },
            {
                dataField: "quantite",
                caption: "Qté",
                dataType: "number",
                width: 70,
                alignment: "center",
                editorOptions: {
                    min: 1
                },
                validationRules: [{
                    type: "required"
                }],
                setCellValue: (rowData, value) => {
                    if (value > rowData.stockDisponible) {
                        // showToast( `Stock disponible : ${rowData.stockDisponible}`, true);
                        rowData.quantite = rowData.stockDisponible;
                    } else {
                        rowData.quantite = value;
                    }
                }
            },
            {
                dataField: "remise",
                caption: "Remise (%)",
                width: 90,
                alignment: "center",
                editorOptions: {
                    min: 0,
                    max: 100
                }
            },
            {
                dataField: "TauxTVA",
                caption: "TVA",
                width: 130,
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
                    return (row.prixUniversitaire - (row.prixUniversitaire * ((row.remise || 0) / 100))) * (row.quantite || 1);
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
    const items = grid.option("dataSource") || [];
    let totalHT = 0;
    let totalTVA = 0;
    items.forEach(l => {
        if (l.prixUniversitaire) {
            totalHT += (l.prixUniversitaire - (l.prixUniversitaire * ((l.remise || 0) / 100))) * (l.quantite || 1);
            totalTVA += totalHT * (l.TauxTVA/100);
        }
    });
    const totalTTC = totalHT + totalTVA;
    $("#devis-summary-ht").text(formatCurrency(totalHT));
    $("#devis-summary-tva").text(formatCurrency(totalTVA));
    $("#devis-summary-ttc").text(formatCurrency(totalTTC));
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

    // Vérification du stock
    for (const line of lines) {

        const produit = produitsData.find(p => p.id_Produit === line.produitId);

        if (!produit) {
            showToast("Produit introuvable.", true);
            return;
        }

        if (line.quantite > produit.quantiteStock) {
            showToast(
                `Stock insuffisant pour "${produit.designation}". Disponible : ${produit.quantiteStock}, demandé : ${line.quantite}.`,
                true
            );
            return;
        }
    }

    const headerData = headerForm.option("formData");
    const payload = {
        id_Partenaire: headerData.clientId,
        adresseFacturation: headerData.adresseFacturation,
        adresseLivraison: headerData.adresseLivraison,
        dateValidite: headerData.dateValidite,
        lignes: lines.map(l => ({
            id_Produit: l.produitId,
            description: "",
            quantite: l.quantite || 1,
            prixUniversitaire: l.prixUniversitaire || 0,
            TauxTVA: l.TauxTVA || 19,
            remise: l.remise || 0,
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

// ============================================================
// --- MODULE LIVRAISONS ---
// ============================================================

// VUE LIVRAISONS (dxDataGrid)
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

// POPUP SAISIR QUANTITÉS LIVRÉES
let currentLivraisonPourQte = null;

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

// VALIDER LIVRAISON (vérif stock + partielle auto)
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

// ANNULER LIVRAISON
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

