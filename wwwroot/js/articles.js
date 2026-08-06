// --- MODULE ARTICLES (SPOTS PUBLICITAIRES) & CATÉGORIES ---

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
                placeholder: "Rechercher un spot publicitaire..."
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
                    caption: "Code Spot / SKU",
                    width: 140,
                    cellTemplate: (container, options) => {
                        $("<strong style='font-family:monospace;'>").text(options.value).appendTo(container);
                    }
                },
                {
                    dataField: "designation",
                    caption: "Désignation / Nom du Spot",
                    widget: 300
                },
                {
                    dataField: "nomCategorie",
                    caption: "Catégorie",
                    width: 160
                },
                {
                    dataField: "unite",
                    caption: "Unité",
                    width: 140,
                    alignment: "center",
                    cellTemplate: (container, options) => {
                        $("<span class='badge badge-blue'>").text(options.value || "Secondes").appendTo(container);
                    }
                },
                {
                    dataField: "dureeSecondes",
                    caption: "Durée Défaut (s)",
                    alignment: "center",
                    width: 130,
                    cellTemplate: (container, options) => {
                        $('<span class="badge badge-blue">').text(`${options.value || 30} s`).appendTo(container);
                    }
                },
                {
                    dataField: "prixUniversitaire",
                    caption: "Prix Unit. HT (TND/s)",
                    alignment: "right",
                    width: 170,
                    calculateCellValue: (row) => formatCurrency(row.prixUniversitaire)
                },
                {
                    dataField: "tauxTVA",
                    caption: "TVA (%)",
                    alignment: "center",
                    width: 110,
                    cellTemplate: (container, options) => {
                        $("<span>").text(`${options.value || 0}%`).appendTo(container);
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
                    }
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
                                ouvrirPopupArticle(e.row.data);
                            }
                        },
                        {
                            hint: "Supprimer",
                            icon: "trash",
                            onClick: function (e) {
                                supprimerArticle(
                                    e.row.data.id_Produit,
                                    e.row.data.designation
                                );
                            }
                        }
                    ]
                }
            ]
        });
    } catch (err) {
        console.error(err);
        showToast("Erreur de chargement des spots publicitaires.", true);
    }
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
        title: "Nouvelle catégorie de spot",
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
                        label: { text: "Nom de la catégorie" },
                        validationRules: [{ type: "required" }]
                    },
                    {
                        dataField: "description",
                        label: { text: "Description" },
                        editorType: "dxTextArea"
                    }
                ]
            });
        }
    });
}

let articleFormInstance = null;

// CREER SPOT PUBLICITAIRE (POPUP DX)
function initPopupArticle() {
    $("#popup-article").dxPopup({
        title: "Ajouter un Spot Publicitaire au catalogue",
        width: 540,
        height: "auto",
        visible: false,
        dragEnabled: true,
        showCloseButton: true,

        contentTemplate: (container) => {

            const formContainer = $("<div id='dx-form-article'>")
                .appendTo(container);

            articleFormInstance = formContainer.dxForm({
                labelLocation: "top",
                formData: {
                    id_Produit: null,
                    Code: "",
                    Designation: "",
                    id_Categorie: null,
                    prixUniversitaire: 0,
                    dureeSecondes: 30,
                    Unite: "Secondes",
                    TauxTVA: 19,
                    QuantiteStock: 999999,
                    Actif: true
                },
                items: [
                    {
                        dataField: "Code",
                        label: {
                            text: "Code Spot (SKU)"
                        },
                        validationRules: [{
                            type: "required",
                            message: "Le code spot est requis."
                        }]
                    },
                    {
                        dataField: "Designation",
                        label: {
                            text: "Nom / Désignation du Spot Publicitaire"
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
                                    onClick: () =>
                                        $("#popup-categorie")
                                            .dxPopup("instance")
                                            .show()
                                }
                            }
                        ]
                    },
                    {
                        itemType: "group",
                        colCount: 2,
                        items: [
                            {
                                dataField: "dureeSecondes",
                                label: { text: "Durée Défaut (sec)" },
                                editorType: "dxNumberBox",
                                editorOptions: {
                                    min: 1,
                                    value: 30,
                                    format: "#0 s"
                                },
                                validationRules: [{ type: "required", message: "La durée est requise." }]
                            },
                            {
                                dataField: "prixUniversitaire",
                                label: { text: "Prix HT (TND / sec)" },
                                editorType: "dxNumberBox",
                                editorOptions: {
                                    min: 0,
                                    format: "#,###0.000 TND"
                                }
                            }
                        ]
                    },
                    {
                        dataField: "TauxTVA",
                        label: {
                            text: "Taux TVA (%)"
                        },
                        editorType: "dxSelectBox",
                        editorOptions: {
                            dataSource: [
                                { value: 0, text: "0 %" },
                                { value: 7, text: "7 %" },
                                { value: 13, text: "13 %" },
                                { value: 19, text: "19 %" }
                            ],
                            valueExpr: "value",
                            displayExpr: "text"
                        }
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
                    text: "Créer le Spot Publicitaire",
                    type: "default",
                    onClick: () => soumettreArticle()
                }
            },
            {
                location: "after",
                toolbar: "bottom",
                widget: "dxButton",
                options: {
                    text: "Annuler",
                    onClick: () =>
                        $("#popup-article")
                            .dxPopup("instance")
                            .hide()
                }
            }
        ],

        onShowing: async () => {
            await chargerCategories();

            if (articleFormInstance) {
                articleFormInstance.option("items[2].items[0].editorOptions.dataSource", categoriesData);
            }
        }
    });
}

function ouvrirPopupArticle(article = null) {

    const popup = $("#popup-article").dxPopup("instance");

    popup.option(
        "title",
        article ? "Modifier le Spot Publicitaire" : "Ajouter un Spot Publicitaire au catalogue"
    );

    popup.show();

    // articleFormInstance is set by initPopupArticle's contentTemplate;
    // update its formData after the popup is visible.
    if (articleFormInstance) {
        articleFormInstance.option("formData", article ? {
            id_Produit: article.id_Produit,
            Code: article.code,
            Designation: article.designation,
            id_Categorie: article.id_Categorie,
            Unite: article.unite,
            prixUniversitaire: article.prixUniversitaire,
            dureeSecondes: article.dureeSecondes || 30,
            TauxTVA: article.tauxTVA,
            QuantiteStock: article.quantiteStock,
            Actif: article.actif
        } : {
            id_Produit: null,
            Code: "",
            Designation: "",
            id_Categorie: null,
            prixUniversitaire: 0,
            dureeSecondes: 30,
            Unite: "Secondes",
            TauxTVA: 19,
            QuantiteStock: 999999,
            Actif: true
        });

        articleFormInstance.resetValidation();
    }

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

    const articleForm = $("#dx-form-article").dxForm("instance");
    const editor = articleForm.getEditor("id_Categorie");
    editor.option("dataSource", categoriesData);
    editor.option("value", nouvelleCategorie.id_Categorie);
}

async function soumettreArticle() {

    if (!articleFormInstance)
        return;

    const result = articleFormInstance.validate();

    if (!result.isValid)
        return;


    const payload = articleFormInstance.option("formData");

    if (!payload.Unite)
        payload.Unite = "Secondes";


    payload.QuantiteStock = 999999;


    const isEdit = payload.id_Produit != null;


    const url = isEdit
        ? `/api/produits/${payload.id_Produit}`
        : "/api/produits";


    const method = isEdit ? "PUT" : "POST";


    try {

        const res = await fetch(url, {
            method,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });


        if (!res.ok) {
            const err = await res.json();
            throw new Error(
                err.message ||
                "Erreur lors de l'enregistrement."
            );
        }


        showToast(
            isEdit
                ? "Spot publicitaire modifié avec succès !"
                : "Spot publicitaire créé avec succès !"
        );


        $("#popup-article")
            .dxPopup("instance")
            .hide();


        chargerToutesLesDonnees();

        if (activeTab === "articles")
            chargerProduits();


        const grid = $("#dx-grid-devis-lines")
            .dxDataGrid("instance");

        if (grid)
            grid.refresh();


    } catch (err) {

        showToast(err.message, true);

    }
}

async function supprimerArticle(id, designation) {

    if (!confirm(`Supprimer le spot "${designation}" ?`))
        return;

    try {

        const res = await fetch(`/api/produits/${id}`, {
            method: "DELETE"
        });

        if (!res.ok) {

            const err = await res.json();
            throw new Error(err.message || "Erreur lors de la suppression.");
        }

        showToast("Spot publicitaire supprimé avec succès !");

        chargerToutesLesDonnees();

        if (activeTab === "articles")
            chargerProduits();

    }
    catch (err) {

        showToast(err.message, true);
    }
}