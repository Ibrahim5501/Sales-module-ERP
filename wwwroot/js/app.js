// APPLICATION BOOTSTRAP - ERP SELLING MODULE (DEVEXTREME - FRANÇAIS)
// ============================================================
// This file initialises the application on DOM ready.
// Business logic is split into separate module files:
//   common.js      - Auth, globals, navigation, formatters
//   dashboard.js   - Tableau de bord
//   commandes.js   - Commandes & detail popup
//   factures.js    - Factures & règlement
//   clients.js     - Clients
//   articles.js    - Articles & catégories
//   devis.js       - Devis
//   livraisons.js  - Livraisons
//   settings.js    - Paramètres PDF & Entreprise
// ============================================================

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

    $("#btn-register").on("click", showRegisterScreen);

    $("#btn-login").on("click", showLoginScreen);

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
            localStorage.setItem("digi_erp_user_name", data.username);
            localStorage.setItem("digi_erp_user_email", data.email);

            updateUserInfoUI();

            // Masquer l'écran de connexion et afficher l'ERP
            $("#login-screen").hide();
            $(".app-container").css("display", "flex");

            showToast("Connexion réussie. Bienvenue, " + data.username + " !");

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

    $("#register-form").on("submit", async function (e) {

        e.preventDefault();

        const password = $("#register-password").val();
        const confirm = $("#register-confirm-password").val();

        if (password !== confirm) {
            $("#register-error")
                .text("Les mots de passe ne correspondent pas.")
                .show();
            return;
        }

        const payload = {
            Username: $("#register-name").val(),
            Email: $("#register-email").val(),
            Password: password
        };

        try {

            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok)
                throw new Error(await res.text());

            alert("Compte créé avec succès.");

            showLoginScreen();

        } catch (err) {

            $("#register-error")
                .text(err.message)
                .show();
        }

    });

    // Configurer la navigation SPA
    setupNavigation();

    // Initialiser les settings events
    initSettingsEvents();

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
    initPopupFormPlageHoraire();

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
    $("#btn-creer-plage-horaire-dx").on("click", () => {
        ouvrirPopupFormPlageHoraire();
    });

    // Popup ajout stock
    /*
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
    */

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
});

window.showRegisterScreen = function () {
    $("#login-screen").css("display", "none");
    $("#register-screen").css("display", "flex");
};

window.showLoginScreen = function () {
    $("#register-screen").css("display", "none");
    $("#login-screen").css("display", "flex");
};