// --- POPUP CONFIGURATION LIGNE DE DEVIS ---
let configLigneFormInstance = null;
let currentEditingLineIndex = null;

function initPopupConfigDevisLigne() {
    $("#popup-config-devis-ligne").dxPopup({
        title: "Configurer la ligne de devis",
        width: 550,
        height: "auto",
        visible: false,
        dragEnabled: true,
        showCloseButton: true,

        contentTemplate: (container) => {
            const formEl = $("<div id='dx-form-config-devis-ligne'>").appendTo(container);

            configLigneFormInstance = formEl.dxForm({
                labelLocation: "top",
                colCount: 2,
                formData: {
                    produitId: null,
                    varianteId: null,
                    nomSpot: "",
                    nomVariante: "",
                    nomPlage: "",
                    prixUniversitaire: 0,
                    quantite: 10,
                    remise: 0,
                    typeRemise: "Pourcentage",
                    TauxTVA: 19,
                    emission: ""
                },
                items: [
                    {
                        dataField: "produitId",
                        colSpan: 2,
                        label: { text: "1. Sélectionner un Spot Publicitaire" },
                        editorType: "dxSelectBox",
                        editorOptions: {
                            dataSource: produitsData.filter(p => p.actif !== false),
                            valueExpr: "id_Produit",
                            displayExpr: item => item ? `${item.designation} (${item.code})` : "",
                            searchEnabled: true,
                            placeholder: "-- Sélectionner le spot --",
                            onValueChanged(e) {
                                const prod = produitsData.find(p => p.id_Produit === e.value);
                                if (!prod) return;

                                // Filter variants for this spot
                                const variantesDuSpot = (window.articlesVariantesData || []).filter(v => v.id_Produit === e.value && v.actif !== false);
                                const varEditor = configLigneFormInstance.getEditor("varianteId");
                                if (varEditor) {
                                    varEditor.option("dataSource", variantesDuSpot);
                                    varEditor.option("value", null);
                                }

                                // Default values from spot if no variant selected yet
                                configLigneFormInstance.updateData("nomSpot", prod.designation);
                                configLigneFormInstance.updateData("nomVariante", prod.designation);
                                configLigneFormInstance.updateData("prixUniversitaire", prod.prixUniversitaire || 0);
                                configLigneFormInstance.updateData("TauxTVA", prod.tauxTVA || 19);
                                configLigneFormInstance.updateData("quantite", 10);
                            }
                        },
                        validationRules: [{ type: "required", message: "Veuillez choisir un spot." }]
                    },
                    {
                        dataField: "varianteId",
                        colSpan: 2,
                        label: { text: "2. Choisir une Variante (Spot + Plage Horaire prédéfinie)" },
                        editorType: "dxSelectBox",
                        editorOptions: {
                            dataSource: [],
                            valueExpr: "id_ArticleVariante",
                            displayExpr: item => item ? `${item.designation} — ${item.nomPlageHoraire} (${item.heureDebut}-${item.heureFin}) - ${formatCurrency(item.prixVariante)}` : "",
                            searchEnabled: true,
                            placeholder: "-- Sélectionner une variante (optionnel) --",
                            showClearButton: true,
                            onValueChanged(e) {
                                if (!e.value) return;
                                const variante = (window.articlesVariantesData || []).find(v => v.id_ArticleVariante === e.value);
                                if (!variante) return;

                                // Prefill from variant (variant price replaces spot base price; duration is prefilled but editable)
                                configLigneFormInstance.updateData("nomVariante", variante.designation);
                                configLigneFormInstance.updateData("prixUniversitaire", variante.prixVariante);
                                configLigneFormInstance.updateData("TauxTVA", variante.tauxTVA);
                                configLigneFormInstance.updateData("quantite", variante.dureeDefaut || 10);
                                const plageTxt = `${variante.nomPlageHoraire} (${variante.heureDebut}-${variante.heureFin})`;
                                configLigneFormInstance.updateData("nomPlage", variante.nomPlageHoraire);
                                configLigneFormInstance.updateData("emission", plageTxt);
                            }
                        }
                    },
                    {
                        dataField: "prixUniversitaire",
                        colSpan: 1,
                        label: { text: "Prix Unitaire HT (TND / sec)" },
                        editorType: "dxNumberBox",
                        editorOptions: {
                            min: 0,
                            format: "#,###0.000 TND"
                        },
                        validationRules: [{ type: "required" }]
                    },
                    {
                        dataField: "quantite",
                        colSpan: 1,
                        label: { text: "Durée (secondes)" },
                        editorType: "dxNumberBox",
                        editorOptions: {
                            min: 1,
                            format: "#0 s"
                        },
                        validationRules: [{ type: "required", message: "La durée est requise." }]
                    },
                    {
                        dataField: "remise",
                        colSpan: 1,
                        label: { text: "Remise" },
                        editorType: "dxNumberBox",
                        editorOptions: { min: 0, value: 0 }
                    },
                    {
                        dataField: "typeRemise",
                        colSpan: 1,
                        label: { text: "Type Remise" },
                        editorType: "dxSelectBox",
                        editorOptions: {
                            dataSource: [
                                { value: "Pourcentage", text: "Pourcentage (%)" },
                                { value: "MontantFixe", text: "Montant Fixe (TND)" }
                            ],
                            valueExpr: "value",
                            displayExpr: "text",
                            value: "Pourcentage"
                        }
                    },
                    {
                        dataField: "TauxTVA",
                        colSpan: 1,
                        label: { text: "Taux TVA (%)" },
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
                    },
                    {
                        dataField: "emission",
                        colSpan: 1,
                        label: { text: "Plage horaire / Émission" },
                        editorType: "dxTextBox",
                        editorOptions: { placeholder: "ex: Prime Time (20:00-22:30)" }
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
                    text: "Valider la ligne",
                    type: "default",
                    icon: "check",
                    onClick: () => validerLigneDevisDepuisPopup()
                }
            },
            {
                location: "after",
                toolbar: "bottom",
                widget: "dxButton",
                options: {
                    text: "Annuler",
                    onClick: () => $("#popup-config-devis-ligne").dxPopup("instance").hide()
                }
            }
        ]
    });
}

function ouvrirPopupConfigDevisLigne(rowIndex = null) {
    currentEditingLineIndex = rowIndex;
    const popup = $("#popup-config-devis-ligne").dxPopup("instance");

    popup.option("title", rowIndex !== null ? "Modifier la ligne de devis" : "Ajouter une ligne au devis");
    popup.show();

    if (configLigneFormInstance) {
        if (rowIndex !== null && internalDevisLines[rowIndex]) {
            const line = internalDevisLines[rowIndex];
            const spotId = line.produitId;

            // Load variants of this spot
            const variantesDuSpot = (window.articlesVariantesData || []).filter(v => v.id_Produit === spotId && v.actif !== false);
            const varEditor = configLigneFormInstance.getEditor("varianteId");
            if (varEditor) varEditor.option("dataSource", variantesDuSpot);

            configLigneFormInstance.option("formData", {
                produitId: line.produitId,
                varianteId: line.varianteId || null,
                nomSpot: line.nomSpot || "",
                nomVariante: line.nomVariante || "",
                nomPlage: line.nomPlage || "",
                prixUniversitaire: line.prixUniversitaire,
                quantite: line.quantite,
                remise: line.remise || 0,
                typeRemise: line.typeRemise || "Pourcentage",
                TauxTVA: line.TauxTVA !== undefined ? line.TauxTVA : 19,
                emission: line.emission || ""
            });
        } else {
            const varEditor = configLigneFormInstance.getEditor("varianteId");
            if (varEditor) varEditor.option("dataSource", []);

            configLigneFormInstance.option("formData", {
                produitId: null,
                varianteId: null,
                nomSpot: "",
                nomVariante: "",
                nomPlage: "",
                prixUniversitaire: 0,
                quantite: 10,
                remise: 0,
                typeRemise: "Pourcentage",
                TauxTVA: 19,
                emission: ""
            });
        }
        configLigneFormInstance.resetValidation();
    }
}

function validerLigneDevisDepuisPopup() {
    if (!configLigneFormInstance) return;
    const res = configLigneFormInstance.validate();
    if (!res.isValid) return;

    const data = configLigneFormInstance.option("formData");
    const spot = produitsData.find(p => p.id_Produit === data.produitId);
    const lineItem = {
        produitId: data.produitId,
        varianteId: data.varianteId || null,
        nomSpot: spot ? spot.designation : (data.nomSpot || ""),
        nomVariante: data.nomVariante || (spot ? spot.designation : ""),
        nomPlage: data.nomPlage || "",
        prixUniversitaire: data.prixUniversitaire || 0,
        quantite: data.quantite || 10,
        remise: data.remise || 0,
        typeRemise: data.typeRemise || "Pourcentage",
        TauxTVA: data.TauxTVA !== undefined ? data.TauxTVA : 19,
        emission: data.emission || ""
    };

    if (currentEditingLineIndex !== null && currentEditingLineIndex >= 0) {
        internalDevisLines[currentEditingLineIndex] = lineItem;
    } else {
        internalDevisLines.push(lineItem);
    }

    const grid = $("#dx-grid-devis-lines").dxDataGrid("instance");
    if (grid) {
        grid.option("dataSource", internalDevisLines);
        grid.refresh();
    }
    recalculerTotauxDevisPopup();
    $("#popup-config-devis-ligne").dxPopup("instance").hide();
}
