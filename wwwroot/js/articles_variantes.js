// --- MODULE ARTICLES VARIANTES ---
// Variante = Spot Publicitaire + Plage Horaire + données prédéfinies (prix, TVA, durée)

// articlesVariantesData is declared globally in common.js
let varianteFormInstance = null;

// ---------------------------------------------------------------------------
// CHARGER LA GRILLE ARTICLES VARIANTES
// ---------------------------------------------------------------------------
async function chargerArticlesVariantes() {
    try {
        const res = await fetch('/api/articlesvariantes');
        if (!res.ok) throw new Error("Erreur chargement variantes.");
        articlesVariantesData = await res.json();
        window.articlesVariantesData = articlesVariantesData;

        const existingGrid = $("#grid-articles-variantes").dxDataGrid("instance");
        if (existingGrid) {
            existingGrid.option("dataSource", articlesVariantesData);
            existingGrid.refresh();
            return;
        }

        $("#grid-articles-variantes").dxDataGrid({
            dataSource: articlesVariantesData,
            allowColumnResizing: true,
            columnResizingMode: "widget",
            columnAutoWidth: true,
            showBorders: false,
            searchPanel: {
                visible: true,
                width: 280,
                placeholder: "Rechercher une variante..."
            },
            filterRow: { visible: true },
            groupPanel: {
                visible: true,
                placeholder: "Faites glisser une colonne pour grouper"
            },
            headerFilter: { visible: true },
            paging: { pageSize: 15 },
            pager: {
                showPageSizeSelector: true,
                allowedPageSizes: [10, 15, 25],
                showInfo: true
            },
            columns: [
                {
                    dataField: "nomProduit",
                    caption: "Spot Publicitaire",
                    width: 200,
                    cellTemplate: (container, options) => {
                        const code = options.data.codeProduit || "";
                        $("<div>")
                            .append($("<strong>").text(options.value))
                            .append(code ? $("<span class='text-muted' style='font-size:11px; margin-left:6px;'>").text(`(${code})`) : "")
                            .appendTo(container);
                    }
                },
                {
                    dataField: "designation",
                    caption: "Désignation de la Variante",
                    minWidth: 180
                },
                {
                    dataField: "nomPlageHoraire",
                    caption: "Plage Horaire",
                    width: 160,
                    cellTemplate: (container, options) => {
                        const debut = options.data.heureDebut || "";
                        const fin   = options.data.heureFin   || "";
                        $("<div>")
                            .append($("<span class='badge badge-blue'>").text(options.value))
                            .append(debut ? $("<span class='text-muted' style='font-size:11px; margin-left:6px;'>").text(`${debut}–${fin}`) : "")
                            .appendTo(container);
                    }
                },
                {
                    dataField: "prixVariante",
                    caption: "Prix HT (TND)",
                    alignment: "right",
                    width: 140,
                    calculateCellValue: row => formatCurrency(row.prixVariante)
                },
                {
                    dataField: "tauxTVA",
                    caption: "TVA (%)",
                    alignment: "center",
                    width: 90,
                    cellTemplate: (container, options) => {
                        $("<span>").text(`${options.value || 0}%`).appendTo(container);
                    }
                },
                {
                    dataField: "dureeDefaut",
                    caption: "Durée Défaut (sec)",
                    alignment: "center",
                    width: 130,
                    cellTemplate: (container, options) => {
                        $("<span class='badge badge-gray'>").text(`${options.value || 0} s`).appendTo(container);
                    }
                },
                {
                    dataField: "actif",
                    caption: "Actif",
                    dataType: "boolean",
                    width: 90,
                    alignment: "center",
                    cellTemplate: (container, options) => {
                        $("<div>").dxSwitch({
                            value: options.value,
                            onValueChanged: async function (e) {
                                const id = options.data.id_ArticleVariante;
                                // Patch via full PUT with toggled actif
                                const current = options.data;
                                await fetch(`/api/articlesvariantes/${id}`, {
                                    method: "PUT",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                        designation:     current.designation,
                                        id_Produit:      current.id_Produit,
                                        id_PlageHoraire: current.id_PlageHoraire,
                                        prixVariante:    current.prixVariante,
                                        tauxTVA:         current.tauxTVA,
                                        dureeDefaut:     current.dureeDefaut,
                                        actif:           e.value
                                    })
                                });
                                showToast(e.value ? "Variante activée." : "Variante désactivée.");
                            }
                        }).appendTo(container);
                    }
                },
                {
                    type: "buttons",
                    caption: "Actions",
                    width: 110,
                    buttons: [
                        {
                            hint: "Modifier",
                            icon: "edit",
                            onClick: e => ouvrirPopupArticleVariante(e.row.data)
                        },
                        {
                            hint: "Supprimer",
                            icon: "trash",
                            onClick: e => supprimerArticleVariante(e.row.data.id_ArticleVariante, e.row.data.designation)
                        }
                    ]
                }
            ]
        });
    } catch (err) {
        console.error(err);
        showToast("Erreur de chargement des articles variantes.", true);
    }
}

// ---------------------------------------------------------------------------
// POPUP CRÉATION / ÉDITION D'UNE VARIANTE
// ---------------------------------------------------------------------------
function initPopupArticleVariante() {
    $("#popup-article-variante").dxPopup({
        title: "Nouvelle Variante de Spot",
        width: 560,
        height: "auto",
        visible: false,
        deferRendering: false,
        dragEnabled: true,
        showCloseButton: true,

        contentTemplate: (container) => {
            const formEl = $("<div id='dx-form-article-variante'>").appendTo(container);

            varianteFormInstance = formEl.dxForm({
                labelLocation: "top",
                colCount: 2,
                formData: {
                    id_ArticleVariante: null,
                    designation: "",
                    id_Produit: null,
                    id_PlageHoraire: null,
                    prixVariante: 0,
                    tauxTVA: 19,
                    dureeDefaut: 30,
                    actif: true
                },
                items: [
                    {
                        dataField: "designation",
                        colSpan: 2,
                        label: { text: "Désignation de la Variante" },
                        validationRules: [{ type: "required", message: "La désignation est requise." }]
                    },
                    {
                        dataField: "id_Produit",
                        colSpan: 2,
                        label: { text: "Spot Publicitaire référencé" },
                        editorType: "dxSelectBox",
                        editorOptions: {
                            dataSource: produitsData.filter(p => p.actif !== false),
                            valueExpr: "id_Produit",
                            displayExpr: item => item ? `${item.designation} (${item.code})` : "",
                            searchEnabled: true,
                            placeholder: "-- Choisir un spot publicitaire --",
                            onValueChanged(e) {
                                // Pré-remplir le prix depuis le spot sélectionné
                                const prod = produitsData.find(p => p.id_Produit === e.value);
                                if (prod && varianteFormInstance) {
                                    varianteFormInstance.updateData("prixVariante", prod.prixUniversitaire || 0);
                                    varianteFormInstance.updateData("tauxTVA", prod.tauxTVA || 19);
                                }
                            }
                        },
                        validationRules: [{ type: "required", message: "Veuillez choisir un spot." }]
                    },
                    {
                        dataField: "id_PlageHoraire",
                        colSpan: 2,
                        label: { text: "Plage Horaire" },
                        editorType: "dxSelectBox",
                        editorOptions: {
                            dataSource: window.plagesHorairesData || [],
                            valueExpr: "id_PlageHoraire",
                            displayExpr: item => item
                                ? (item.nom ? `${item.nom} (${item.heureDebut}–${item.heureFin})` : `${item.heureDebut}–${item.heureFin}`)
                                : "",
                            searchEnabled: true,
                            placeholder: "-- Choisir une plage horaire --"
                        },
                        validationRules: [{ type: "required", message: "Veuillez choisir une plage horaire." }]
                    },
                    {
                        dataField: "prixVariante",
                        label: { text: "Prix HT (TND) — remplace le prix du spot" },
                        editorType: "dxNumberBox",
                        editorOptions: { min: 0, format: "#,###0.000 TND" }
                    },
                    {
                        dataField: "tauxTVA",
                        label: { text: "Taux TVA (%)" },
                        editorType: "dxSelectBox",
                        editorOptions: {
                            dataSource: [
                                { value: 0,  text: "0 %" },
                                { value: 7,  text: "7 %" },
                                { value: 13, text: "13 %" },
                                { value: 19, text: "19 %" }
                            ],
                            valueExpr: "value",
                            displayExpr: "text"
                        }
                    },
                    {
                        dataField: "dureeDefaut",
                        label: { text: "Durée par défaut (secondes)" },
                        editorType: "dxNumberBox",
                        editorOptions: { min: 1, format: "#0 s" }
                    },
                    {
                        dataField: "actif",
                        label: { text: "Variante active" },
                        editorType: "dxCheckBox"
                    }
                ]
            }).dxForm("instance");
        },

        toolbarItems: [
            {
                location: "after",
                toolbar: "bottom",
                widget: "dxButton",
                options: {
                    text: "Enregistrer",
                    type: "default",
                    icon: "save",
                    onClick: () => soumettreArticleVariante()
                }
            },
            {
                location: "after",
                toolbar: "bottom",
                widget: "dxButton",
                options: {
                    text: "Annuler",
                    onClick: () => $("#popup-article-variante").dxPopup("instance").hide()
                }
            }
        ],

        onShowing: () => {
            // Refresh datasources in case data changed
            if (varianteFormInstance) {
                const prodEditor = varianteFormInstance.getEditor("id_Produit");
                if (prodEditor) prodEditor.option("dataSource", produitsData.filter(p => p.actif !== false));
                const plageEditor = varianteFormInstance.getEditor("id_PlageHoraire");
                if (plageEditor) plageEditor.option("dataSource", window.plagesHorairesData || []);
            }
        }
    });
}

function ouvrirPopupArticleVariante(variante = null) {
    const popup = $("#popup-article-variante").dxPopup("instance");
    popup.option("title", variante ? "Modifier la Variante" : "Nouvelle Variante de Spot");
    popup.show();

    if (varianteFormInstance) {
        varianteFormInstance.option("formData", variante ? {
            id_ArticleVariante: variante.id_ArticleVariante,
            designation:        variante.designation,
            id_Produit:         variante.id_Produit,
            id_PlageHoraire:    variante.id_PlageHoraire,
            prixVariante:       variante.prixVariante,
            tauxTVA:            variante.tauxTVA,
            dureeDefaut:        variante.dureeDefaut,
            actif:              variante.actif
        } : {
            id_ArticleVariante: null,
            designation: "",
            id_Produit: null,
            id_PlageHoraire: null,
            prixVariante: 0,
            tauxTVA: 19,
            dureeDefaut: 30,
            actif: true
        });
        varianteFormInstance.resetValidation();
    }
}

async function soumettreArticleVariante() {
    if (!varianteFormInstance) return;
    const result = varianteFormInstance.validate();
    if (!result.isValid) return;

    const data = varianteFormInstance.option("formData");
    const isEdit = data.id_ArticleVariante != null;
    const url    = isEdit ? `/api/articlesvariantes/${data.id_ArticleVariante}` : "/api/articlesvariantes";
    const method = isEdit ? "PUT" : "POST";

    const payload = {
        designation:     data.designation,
        id_Produit:      data.id_Produit,
        id_PlageHoraire: data.id_PlageHoraire,
        prixVariante:    data.prixVariante,
        tauxTVA:         data.tauxTVA,
        dureeDefaut:     data.dureeDefaut,
        actif:           data.actif
    };

    try {
        const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || "Erreur lors de l'enregistrement.");
        }
        showToast(isEdit ? "Variante mise à jour !" : "Variante créée avec succès !");
        $("#popup-article-variante").dxPopup("instance").hide();
        await chargerArticlesVariantes();
        // Refresh global data for devis popup
        await rechargerArticlesVariantesGlobal();
    } catch (err) {
        showToast(err.message, true);
    }
}

async function supprimerArticleVariante(id, designation) {
    if (!confirm(`Supprimer la variante "${designation}" ?`)) return;
    try {
        const res = await fetch(`/api/articlesvariantes/${id}`, { method: "DELETE" });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || "Erreur lors de la suppression.");
        }
        showToast("Variante supprimée.");
        await chargerArticlesVariantes();
        await rechargerArticlesVariantesGlobal();
    } catch (err) {
        showToast(err.message, true);
    }
}

// Recharge les données globales de variantes (utilisé par popup devis ligne)
async function rechargerArticlesVariantesGlobal() {
    try {
        const res = await fetch('/api/articlesvariantes');
        if (res.ok) {
            articlesVariantesData = await res.json();
            window.articlesVariantesData = articlesVariantesData;
        }
    } catch (_) {}
}
