// COMMON JS - SHARED GLOBALS, AUTHENTICATION, TOAST & NAVIGATION

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
    const username = localStorage.getItem("digi_erp_user_name") || "Administrateur";
    $(".user-name").text(username);
}

// Variables d'état global
let clientsData = [];
let produitsData = [];
let commandesData = [];
let facturesData = [];
let devisData = [];
let categoriesData = [];
let livraisonsData = [];
var plagesHorairesData = [];
window.plagesHorairesData = window.plagesHorairesData || [];
var articlesVariantesData = [];
window.articlesVariantesData = window.articlesVariantesData || [];
let planificationSpotsData = [];
let internalDevisLines = [];
let activeTab = 'tableau-bord';
let toastInstance = null;
let activeReglementFactId = 0;
let produitSelectionne = null;
let currentLivraisonPourQte = null;

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

function formatCurrentDate() {
    // Keep function for compatibility
}

// NAVIGATION SPA
function setupNavigation() {
    // Dropdown toggle click
    $(".topnav-dropdown-toggle").on("click", function(e) {
        e.preventDefault();
        e.stopPropagation();
        $(this).closest(".topnav-dropdown").toggleClass("open");
    });

    // Close dropdown when clicking outside
    $(document).on("click", function(e) {
        if (!$(e.target).closest(".topnav-dropdown").length) {
            $(".topnav-dropdown").removeClass("open");
        }
    });

    // Nav link click
    $(".topnav-item[href], .topnav-dropdown-item[href]").on("click", function(e) {
        e.preventDefault();
        const href = $(this).attr("href");
        if (!href) return;
        $(".topnav-dropdown").removeClass("open");
        const targetId = href.substring(1);
        switchTab(targetId);
    });
}

function switchTab(tabId) {
    activeTab = tabId;
    
    // Mettre à jour la classe active sur les liens nav
    $(".topnav-item, .topnav-dropdown-item").removeClass("active");
    $(`.topnav-item[href="#${tabId}"], .topnav-dropdown-item[href="#${tabId}"]`).addClass("active");

    // Highlight parent dropdown if child selected
    if (['articles', 'plages-horaires', 'articles-variantes'].includes(tabId)) {
        $(".topnav-dropdown-toggle").addClass("active");
    }

    // Afficher le bon pane
    $(".tab-pane").removeClass("active");
    $(`#pane-${tabId}`).addClass("active");

    // Recharger les données de la vue correspondante
    if (tabId === 'tableau-bord') {
        if (typeof chargerDashboard === 'function') chargerDashboard();
    } else if (tabId === 'devis') {
        if (typeof chargerDevis === 'function') chargerDevis();
    } else if (tabId === 'commandes') {
        if (typeof chargerCommandes === 'function') chargerCommandes();
    } else if (tabId === 'factures') {
        if (typeof chargerFactures === 'function') chargerFactures();
    } else if (tabId === 'clients') {
        if (typeof chargerClients === 'function') chargerClients();
    } else if (tabId === 'articles') {
        if (typeof chargerProduits === 'function') chargerProduits();
    } else if (tabId === 'livraisons') {
        if (typeof chargerLivraisons === 'function') chargerLivraisons();
    } else if (tabId === 'plages-horaires') {
        if (typeof chargerPlagesHoraires === 'function') chargerPlagesHoraires();
    } else if (tabId === 'articles-variantes') {
        if (typeof chargerArticlesVariantes === 'function') chargerArticlesVariantes();
    } else if (tabId === 'planification-spots') {
        if (typeof chargerPlanificationSpots === 'function') chargerPlanificationSpots();
    } else if (tabId === 'settings') {
        if (typeof chargerCompanySettings === 'function') chargerCompanySettings();
    }
}

// CHARGEMENT INITIAL DES DONNÉES
async function chargerToutesLesDonnees() {
    try {
        const [clientsRes, produitsRes, plagesRes, variantesRes] = await Promise.all([
            fetch('/api/partenaires'),
            fetch('/api/produits'),
            fetch('/api/plageshoraires'),
            fetch('/api/articlesvariantes')
        ]);
        clientsData = await clientsRes.json();
        produitsData = await produitsRes.json();
        if (plagesRes.ok) {
            window.plagesHorairesData = await plagesRes.json();
            plagesHorairesData = window.plagesHorairesData;
        }
        if (variantesRes.ok) {
            window.articlesVariantesData = await variantesRes.json();
            articlesVariantesData = window.articlesVariantesData;
        }

        // Charger l'onglet actif par défaut
        switchTab(activeTab);
    } catch (err) {
        console.error(err);
        showToast("Impossible de charger les données du serveur.", true);
    }
}

// FORMAT DEVISE HT (3 chiffres après la virgule TND)
function formatCurrency(val) {
    if (val === undefined || val === null || isNaN(val)) return "0,000 TND";
    return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(val) + " TND";
}

async function makeRequest(url, method = "GET", data = null) {
    const options = {
        method,
        headers: {
            "Content-Type": "application/json"
        }
    };

    if (data !== null) {
        options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`${response.status}: ${text}`);
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        return await response.json();
    }

    return null;
}