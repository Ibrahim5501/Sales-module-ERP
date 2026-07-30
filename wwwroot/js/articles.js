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
                    caption: "Désignation / Nom du Spot"
                },
                {
                    dataField: "nomCategorie",
                    caption: "Catégorie",
                    width: 160
                },
                {
                    dataField: "unite",
                    caption: "Durée / Unité",
                    width: 140,
                    alignment: "center",
                    cellTemplate: (container, options) => {
                        $("<span class='badge badge-blue'>").text(options.value || "Secondes").appendTo(container);
                    }
                },
                {
                    dataField: "prixUniversitaire",
                    caption: "Prix Unit. HT (TND)",
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
            $("<div id='dx-form-article'>").appendTo(container);
        },
        toolbarItems: [
            {
                shortcut: "done",
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
                    Unite: "Secondes",
                    TauxTVA: 19,
                    QuantiteStock: 999999,
                    Actif: true
                },
                labelLocation: "top",
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
                        dataField: "Unite",
                        label: {
                            text: "Durée (en secondes)"
                        },
                        editorType: "dxTextBox",
                        editorOptions: {
                            value: "60",
                            placeholder: "ex: 60"
                        }
                    },
                    {
                        dataField: "prixUniversitaire",
                        label: {
                            text: "Prix Unitaire HT (TND / seconde)"
                        },
                        editorType: "dxNumberBox",
                        editorOptions: {
                            min: 0,
                            format: "#,###0.000 TND"
                        }
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
                            displayExpr: "text",
                            value: 19
                        },
                        validationRules: [{
                            type: "required",
                            message: "Le taux de TVA est requis."
                        }]
                    }
                ]
            });
        }
    });
}

function ouvrirPopupArticle() {
    const popup = $("#popup-article").dxPopup("instance");
    const form = $("#dx-form-article").dxForm("instance");

    if (form) {
        form.option("formData", {
            Code: "",
            Designation: "",
            id_Categorie: null,
            prixUniversitaire: 0,
            Unite: "Secondes",
            TauxTVA: 19,
            QuantiteStock: 999999,
            Actif: true
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

    const articleForm = $("#dx-form-article").dxForm("instance");
    const editor = articleForm.getEditor("id_Categorie");
    editor.option("dataSource", categoriesData);
    editor.option("value", nouvelleCategorie.id_Categorie);
}

async function soumettreArticle() {
    const form = $("#dx-form-article").dxForm("instance");
    const result = form.validate();
    
    if (!result.isValid)
        return;
    
    const payload = form.option("formData");
    if (!payload.Unite) payload.Unite = "Secondes";
    payload.QuantiteStock = 999999; // bypass stock system for spots

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
            throw new Error(err.message || "Erreur de création du spot publicitaire.");
        }
        showToast("Spot publicitaire créé avec succès !");
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
