// --- MODULE PARAMÈTRES & ENTREPRISE ---

async function chargerCompanySettings() {
    try {
        const res = await fetch('/api/CompanySettings');
        if (!res.ok) throw new Error("Erreur lors du chargement des paramètres");
        const s = await res.json();
        
        $("#settings-nom").val(s.nomEntreprise || "");
        $("#settings-activite").val(s.activite || "");
        $("#settings-adresse").val(s.adresse || "");
        $("#settings-tel").val(s.telephone || "");
        $("#settings-email").val(s.email || "");
        $("#settings-mf").val(s.matriculeFiscal || "");
        $("#settings-rib").val(s.rib || "");
        $("#settings-footer").val(s.piedDePage || "");

        if (s.logoUrl) {
            $("#settings-logo-preview").attr("src", s.logoUrl).show();
            $("#logo-placeholder-text").hide();
        } else {
            $("#settings-logo-preview").hide();
            $("#logo-placeholder-text").show();
        }
    } catch (err) {
        showToast(err.message, true);
    }
}

async function sauvegarderCompanySettings() {
    const payload = {
        nomEntreprise: $("#settings-nom").val(),
        activite: $("#settings-activite").val(),
        adresse: $("#settings-adresse").val(),
        telephone: $("#settings-tel").val(),
        email: $("#settings-email").val(),
        matriculeFiscal: $("#settings-mf").val(),
        rib: $("#settings-rib").val(),
        piedDePage: $("#settings-footer").val()
    };

    try {
        const res = await fetch('/api/CompanySettings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Erreur de sauvegarde");
        showToast("Paramètres d'entreprise mis à jour avec succès !");
    } catch (err) {
        showToast(err.message, true);
    }
}

function initSettingsEvents() {
    $("#btn-save-settings").on("click", function() {
        sauvegarderCompanySettings();
    });

    $("#btn-select-logo").on("click", function() {
        $("#settings-logo-file").click();
    });

    $("#settings-logo-file").on("change", async function() {
        const file = this.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("logoFile", file);

        try {
            const res = await fetch('/api/CompanySettings/logo', {
                method: 'POST',
                body: formData
            });
            if (!res.ok) throw new Error("Erreur lors du téléversement du logo.");
            const data = await res.json();
            showToast(data.message || "Logo téléversé !");
            $("#settings-logo-preview").attr("src", data.logoUrl).show();
            $("#logo-placeholder-text").hide();
        } catch (err) {
            showToast(err.message, true);
        }
    });
}
