// PLAGES HORAIRES MANAGEMENT MODULE (DEVEXTREME - FRANÇAIS)
// ============================================================

let currentEditPlageId = 0;

// Initialiser le Popup de création / modification
function initPopupFormPlageHoraire() {
    if (!$("#popup-form-plage-horaire").length) return;

    $("#popup-form-plage-horaire").dxPopup({
        title: "Gestion Plage Horaire",
        width: 500,
        height: "auto",
        visible: false,
        deferRendering: false,
        dragEnabled: true,
        showCloseButton: true,
        contentTemplate: function (container) {
            const formHtml = `
                <form id="form-plage-horaire" style="display: flex; flex-direction: column; gap: 16px; padding: 10px 5px;">
                    <input type="hidden" id="plage-id" value="0">
                    <div class="input-group">
                        <label for="plage-nom"><i class="fa-solid fa-tag"></i> Nom / Libellé *</label>
                        <input type="text" id="plage-nom" placeholder="ex: Matinale, Prime Time" required class="dx-texteditor-input" style="width:100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px;">
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                        <div class="input-group">
                            <label for="plage-debut"><i class="fa-regular fa-clock"></i> Heure Début *</label>
                            <input type="text" id="plage-debut" placeholder="ex: 06:00" required class="dx-texteditor-input" style="width:100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px;">
                        </div>
                        <div class="input-group">
                            <label for="plage-fin"><i class="fa-regular fa-clock"></i> Heure Fin *</label>
                            <input type="text" id="plage-fin" placeholder="ex: 09:00" required class="dx-texteditor-input" style="width:100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px;">
                        </div>
                    </div>
                    <div class="input-group">
                        <label for="plage-desc"><i class="fa-solid fa-align-left"></i> Description / Note</label>
                        <textarea id="plage-desc" placeholder="Optionnel" rows="3" class="dx-texteditor-input" style="width:100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; resize: vertical;"></textarea>
                    </div>
                </form>
            `;
            container.append(formHtml);
        },
        toolbarItems: [
            {
                widget: "dxButton",
                toolbar: "bottom",
                location: "after",
                options: {
                    text: "Enregistrer",
                    type: "success",
                    icon: "check",
                    onClick: enregistrerPlageHoraire
                }
            },
            {
                widget: "dxButton",
                toolbar: "bottom",
                location: "after",
                options: {
                    text: "Annuler",
                    icon: "close",
                    onClick: function () {
                        $("#popup-form-plage-horaire").dxPopup("instance").hide();
                    }
                }
            }
        ]
    });
}

// Ouvrir le Popup en mode création ou modification
function ouvrirPopupFormPlageHoraire(data = null) {
    const popup = $("#popup-form-plage-horaire").dxPopup("instance");

    if (data) {
        currentEditPlageId = data.id_PlageHoraire || data.id || 0;
        popup.option("title", "Modifier la Plage Horaire");
        $("#plage-id").val(currentEditPlageId);
        $("#plage-nom").val(data.nom || "");
        $("#plage-debut").val(data.heureDebut || "08:00");
        $("#plage-fin").val(data.heureFin || "12:00");
        $("#plage-desc").val(data.description || "");
    } else {
        currentEditPlageId = 0;
        popup.option("title", "Ajouter une Plage Horaire");
        $("#plage-id").val(0);
        $("#plage-nom").val("");
        $("#plage-debut").val("08:00");
        $("#plage-fin").val("12:00");
        $("#plage-desc").val("");
    }

    popup.show();
}

// Enregistrer (POST / PUT)
async function enregistrerPlageHoraire() {
    const id = parseInt($("#plage-id").val()) || 0;
    const nom = $("#plage-nom").val().trim();
    const heureDebut = $("#plage-debut").val().trim();
    const heureFin = $("#plage-fin").val().trim();
    const description = $("#plage-desc").val().trim();

    if (!nom) {
        showToast("Veuillez saisir un nom ou un libellé.", true);
        return;
    }
    if (!heureDebut || !heureFin) {
        showToast("Veuillez renseigner l'heure de début et l'heure de fin.", true);
        return;
    }

    const payload = {
        nom: nom,
        heureDebut: heureDebut,
        heureFin: heureFin,
        description: description,
        actif: true
    };

    try {
        let res;
        if (id > 0) {
            res = await fetch(`/api/plageshoraires/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
        } else {
            res = await fetch("/api/plageshoraires", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
        }

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.message || "Erreur lors de l'enregistrement");
        }

        showToast(id > 0 ? "Plage horaire modifiée avec succès." : "Nouvelle plage horaire ajoutée.");
        $("#popup-form-plage-horaire").dxPopup("instance").hide();
        await chargerPlagesHoraires();
    } catch (err) {
        console.error(err);
        showToast(err.message || "Erreur de communication avec le serveur.", true);
    }
}

// Supprimer une plage horaire
function supprimerPlageHoraire(id, nom) {
    const result = DevExpress.ui.dialog.confirm(
        `Voulez-vous vraiment supprimer la plage horaire "${nom || 'sélectionnée'}" ?`,
        "Confirmation de suppression"
    );

    result.done(async function (dialogResult) {
        if (!dialogResult) return;

        try {
            const res = await fetch(`/api/plageshoraires/${id}`, {
                method: "DELETE"
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || "Erreur lors de la suppression.");
            }

            showToast("Plage horaire supprimée avec succès.");
            await chargerPlagesHoraires();
        } catch (err) {
            console.error(err);
            showToast(err.message || "Impossible de supprimer cette plage horaire.", true);
        }
    });
}

// Charger et afficher la grille des plages horaires
async function chargerPlagesHoraires() {
    try {
        const res = await fetch('/api/plageshoraires');
        if (!res.ok) throw new Error("Erreur de chargement des plages horaires.");

        window.plagesHorairesData = await res.json();

        $("#grid-plages-horaires").dxDataGrid({
            dataSource: window.plagesHorairesData,
            keyExpr: "id_PlageHoraire",
            showBorders: true,
            hoverStateEnabled: true,
            columnAutoWidth: true,
            rowAlternationEnabled: true,
            searchPanel: { visible: true, placeholder: "Rechercher une plage horaire..." },
            filterRow: { visible: true },
            headerFilter: { visible: true },
            paging: { pageSize: 10 },
            pager: { showPageSizeSelector: true, allowedPageSizes: [5, 10, 20], showInfo: true },
            columns: [
                {
                    dataField: "id_PlageHoraire",
                    caption: "ID",
                    width: 70,
                    alignment: "center"
                },
                {
                    dataField: "nom",
                    caption: "Libellé / Emission",
                    validationRules: [{ type: "required" }]
                },
                {
                    dataField: "heureDebut",
                    caption: "Heure Début",
                    width: 120,
                    alignment: "center"
                },
                {
                    dataField: "heureFin",
                    caption: "Heure Fin",
                    width: 120,
                    alignment: "center"
                },
                {
                    caption: "Plage Complète",
                    calculateCellValue: function (rowData) {
                        if (!rowData) return "";
                        return rowData.nom ? `${rowData.nom} (${rowData.heureDebut} - ${rowData.heureFin})` : `${rowData.heureDebut} - ${rowData.heureFin}`;
                    },
                    width: 240
                },
                {
                    dataField: "description",
                    caption: "Description"
                },
                {
                    type: "buttons",
                    caption: "Actions",
                    width: 120,
                    buttons: [
                        {
                            hint: "Modifier",
                            icon: "edit",
                            onClick: function (e) {
                                ouvrirPopupFormPlageHoraire(e.row.data);
                            }
                        },
                        {
                            hint: "Supprimer",
                            icon: "trash",
                            onClick: function (e) {
                                supprimerPlageHoraire(e.row.data.id_PlageHoraire, e.row.data.nom);
                            }
                        }
                    ]
                }
            ]
        });


    } catch (err) {
        console.error(err);
        showToast("Erreur lors du chargement des plages horaires.", true);
    }
}
