// --- MODULE ARTICLES & CATÉGORIES ---

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
                    caption: "Désignation"
                },
                {
                    dataField: "nomCategorie",
                    caption: "Catégorie",
                    width: 150
                },
                {
                    dataField: "unite",
                    caption: "Unité",
                    width: 100,
                    alignment: "center"
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
                            min: 0.001,
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
                            min: 0,
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
