// --- POPUP CONFIGURATION LIGNE DE DEVIS ---
if (typeof configLigneFormInstance === 'undefined') { var configLigneFormInstance = null; }
if (typeof currentEditingLineIndex === 'undefined') { var currentEditingLineIndex = null; }

// ── Live sous-total preview ──────────────────────────────────────────────────
function majApercuLigneDevis() {
    if (!configLigneFormInstance) return;
    const d = configLigneFormInstance.option("formData");
    const prix    = parseFloat(d.prixUniversitaire) || 0;
    const duree   = parseInt(d.dureeSecondes)       || 30;
    const qte     = parseInt(d.quantite)            || 1;
    const remise  = parseFloat(d.remise)            || 0;
    const typeRemise = d.typeRemise || "Pourcentage";

    let brut   = prix * duree * qte;
    let remVal = typeRemise === "MontantFixe" ? remise : brut * (remise / 100);
    let ht     = Math.max(0, brut - remVal);

    const label = `${prix.toFixed(3)} TND/s \u00d7 ${duree}s \u00d7 ${qte} diff. = ${ht.toFixed(3)} TND HT`;
    const el = document.getElementById("apercu-ligne-devis-val");
    if (el) el.textContent = label;
}

// ── Popup init ───────────────────────────────────────────────────────────────
function initPopupConfigDevisLigne() {
    $("#popup-config-devis-ligne").dxPopup({
        title: "Configurer la ligne de devis",
        width: 660,
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
                    dureeSecondes: 30,
                    quantite: 1,
                    remise: 0,
                    typeRemise: "Pourcentage",
                    TauxTVA: 19,
                    emission: ""
                },
                items: [
                    // ── 1. Spot ──────────────────────────────────────────────
                    {
                        dataField: "produitId",
                        colSpan: 2,
                        label: { text: "1. Sélectionner un Spot Publicitaire" },
                        editorType: "dxSelectBox",
                        editorOptions: {
                            dataSource: (produitsData || []).filter(p => p.actif !== false),
                            valueExpr: "id_Produit",
                            displayExpr: item => item ? `${item.designation} (${item.code})` : "",
                            searchEnabled: true,
                            placeholder: "-- Sélectionner le spot --",
                            onValueChanged(e) {
                                const prod = (produitsData || []).find(p => p.id_Produit === e.value);
                                if (!prod) return;

                                const variantesDuSpot = (window.articlesVariantesData || [])
                                    .filter(v => v.id_Produit === e.value && v.actif !== false);
                                const varEditor = configLigneFormInstance.getEditor("varianteId");
                                if (varEditor) {
                                    varEditor.option("dataSource", variantesDuSpot);
                                    varEditor.option("value", null);
                                }

                                configLigneFormInstance.updateData("nomSpot",          prod.designation);
                                configLigneFormInstance.updateData("nomVariante",      prod.designation);
                                configLigneFormInstance.updateData("prixUniversitaire", prod.prixUniversitaire || 0);
                                configLigneFormInstance.updateData("TauxTVA",          prod.tauxTVA || 19);
                                configLigneFormInstance.updateData("dureeSecondes",    prod.dureeSecondes || 30);
                                configLigneFormInstance.updateData("quantite",         1);
                                setTimeout(() => majApercuLigneDevis(), 50);
                            }
                        },
                        validationRules: [{ type: "required", message: "Veuillez choisir un spot." }]
                    },

                    // ── 2. Variante ───────────────────────────────────────────
                    {
                        dataField: "varianteId",
                        colSpan: 2,
                        label: { text: "2. Choisir une Variante (Spot + Plage Horaire prédéfinie)" },
                        editorType: "dxSelectBox",
                        editorOptions: {
                            dataSource: [],
                            valueExpr: "id_ArticleVariante",
                            displayExpr: item => item
                                ? `${item.designation} \u2014 ${item.nomPlageHoraire} (${item.heureDebut}-${item.heureFin}) - ${formatCurrency(item.prixVariante)}`
                                : "",
                            searchEnabled: true,
                            placeholder: "-- Sélectionner une variante (optionnel) --",
                            showClearButton: true,
                            onValueChanged(e) {
                                if (!e.value) return;
                                const variante = (window.articlesVariantesData || [])
                                    .find(v => v.id_ArticleVariante === e.value);
                                if (!variante) return;

                                configLigneFormInstance.updateData("nomVariante",      variante.designation);
                                configLigneFormInstance.updateData("prixUniversitaire", variante.prixVariante);
                                configLigneFormInstance.updateData("TauxTVA",          variante.tauxTVA);
                                configLigneFormInstance.updateData("dureeSecondes",    variante.dureeDefaut || 30);
                                const plageTxt = `${variante.nomPlageHoraire} (${variante.heureDebut}-${variante.heureFin})`;
                                configLigneFormInstance.updateData("nomPlage",  variante.nomPlageHoraire);
                                configLigneFormInstance.updateData("emission",  plageTxt);
                                setTimeout(() => majApercuLigneDevis(), 50);
                            }
                        }
                    },

                    // ── 3. Tarification (groupe 3 colonnes) ───────────────────
                    {
                        itemType: "group",
                        colSpan: 2,
                        caption: "3. Tarification",
                        colCount: 3,
                        items: [
                            {
                                dataField: "prixUniversitaire",
                                label: { text: "Prix HT (TND / sec)" },
                                editorType: "dxNumberBox",
                                editorOptions: {
                                    min: 0,
                                    format: "#,###0.000",
                                    onValueChanged: () => majApercuLigneDevis()
                                },
                                validationRules: [{ type: "required" }]
                            },
                            {
                                dataField: "dureeSecondes",
                                label: { text: "Durée (sec)" },
                                editorType: "dxNumberBox",
                                editorOptions: {
                                    min: 1,
                                    value: 30,
                                    format: "#0 s",
                                    onValueChanged: () => majApercuLigneDevis()
                                },
                                validationRules: [{ type: "required", message: "La durée est requise." }]
                            },
                            {
                                dataField: "quantite",
                                label: { text: "Quantité (diffusions)" },
                                editorType: "dxNumberBox",
                                editorOptions: {
                                    min: 1,
                                    value: 1,
                                    onValueChanged: () => majApercuLigneDevis()
                                },
                                validationRules: [{ type: "required", message: "La quantité est requise." }]
                            }
                        ]
                    },

                    // ── Live preview bar ──────────────────────────────────────
                    {
                        itemType: "simple",
                        colSpan: 2,
                        template: () => {
                            return $('<div id="apercu-ligne-devis" style="background:var(--bg-card,#1e2130);border-radius:8px;padding:10px 14px;margin-bottom:4px;display:flex;align-items:center;justify-content:space-between;">')
                                .append($('<span style="font-size:12px;color:var(--text-muted,#8892a4);">').text('Sous-total HT estimé :'))
                                .append($('<strong id="apercu-ligne-devis-val" style="font-size:15px;color:var(--accent,#60a5fa);">').text('0,000 TND'));
                        }
                    },

                    // ── 4. Remise ─────────────────────────────────────────────
                    {
                        dataField: "remise",
                        colSpan: 1,
                        label: { text: "Remise" },
                        editorType: "dxNumberBox",
                        editorOptions: {
                            min: 0,
                            value: 0,
                            onValueChanged: () => majApercuLigneDevis()
                        }
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
                            value: "Pourcentage",
                            onValueChanged: () => majApercuLigneDevis()
                        }
                    },

                    // ── 5. TVA & Émission ─────────────────────────────────────
                    {
                        dataField: "TauxTVA",
                        colSpan: 1,
                        label: { text: "Taux TVA (%)" },
                        editorType: "dxSelectBox",
                        editorOptions: {
                            dataSource: [
                                { value: 0,  text: "0 %"  },
                                { value: 7,  text: "7 %"  },
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
                        editorType: "dxSelectBox",
                        editorOptions: {
                            dataSource: (plagesHorairesData || []).map(p => ({
                                value: `${p.nom} (${p.heureDebut}-${p.heureFin})`,
                                text:  `${p.nom} (${p.heureDebut}-${p.heureFin})`
                            })),
                            valueExpr: "value",
                            displayExpr: "text",
                            placeholder: "-- Sélectionner une plage horaire --",
                            showClearButton: true
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
                    onClick: () => {
                        const p = $("#popup-config-devis-ligne").dxPopup("instance");
                        if (p) p.hide();
                    }
                }
            }
        ]
    });
}

// ── Open popup ───────────────────────────────────────────────────────────────
function ouvrirPopupConfigDevisLigne(rowIndex = null) {
    currentEditingLineIndex = rowIndex;
    const popup = $("#popup-config-devis-ligne").dxPopup("instance");
    if (!popup) return;

    popup.option("title", rowIndex !== null ? "Modifier la ligne de devis" : "Ajouter une ligne au devis");
    popup.show();

    if (!configLigneFormInstance) return;

    // Refresh spot list
    const prodEditor = configLigneFormInstance.getEditor("produitId");
    if (prodEditor) {
        prodEditor.option("dataSource", (produitsData || []).filter(p => p.actif !== false));
    }

    if (rowIndex !== null && internalDevisLines[rowIndex]) {
        const line = internalDevisLines[rowIndex];

        // Load variants for this spot
        const variantesDuSpot = (window.articlesVariantesData || [])
            .filter(v => v.id_Produit === line.produitId && v.actif !== false);
        const varEditor = configLigneFormInstance.getEditor("varianteId");
        if (varEditor) varEditor.option("dataSource", variantesDuSpot);

        configLigneFormInstance.option("formData", {
            produitId:         line.produitId,
            varianteId:        line.varianteId || null,
            nomSpot:           line.nomSpot    || "",
            nomVariante:       line.nomVariante || "",
            nomPlage:          line.nomPlage   || "",
            prixUniversitaire: line.prixUniversitaire,
            dureeSecondes:     line.dureeSecondes || 30,
            quantite:          line.quantite  || 1,
            remise:            line.remise    || 0,
            typeRemise:        line.typeRemise || "Pourcentage",
            TauxTVA:           line.TauxTVA !== undefined ? line.TauxTVA : (line.tauxTVA !== undefined ? line.tauxTVA : 19),
            emission:          line.emission  || ""
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
            dureeSecondes: 30,
            quantite: 1,
            remise: 0,
            typeRemise: "Pourcentage",
            TauxTVA: 19,
            emission: ""
        });
    }

    if (typeof configLigneFormInstance.resetValidation === "function") {
        configLigneFormInstance.resetValidation();
    }

    setTimeout(() => majApercuLigneDevis(), 80);
}

// ── Validate & save line ─────────────────────────────────────────────────────
function validerLigneDevisDepuisPopup() {
    if (!configLigneFormInstance) return;
    const res = configLigneFormInstance.validate();
    if (!res.isValid) return;

    const data = configLigneFormInstance.option("formData");
    const spot = (produitsData || []).find(p => p.id_Produit === data.produitId);

    const lineItem = {
        produitId:         data.produitId,
        varianteId:        data.varianteId  || null,
        nomSpot:           spot ? spot.designation : (data.nomSpot || ""),
        nomVariante:       data.nomVariante || (spot ? spot.designation : ""),
        nomPlage:          data.nomPlage    || "",
        prixUniversitaire: data.prixUniversitaire || 0,
        dureeSecondes:     data.dureeSecondes  || 30,
        quantite:          data.quantite       || 1,
        remise:            data.remise         || 0,
        typeRemise:        data.typeRemise      || "Pourcentage",
        TauxTVA:           data.TauxTVA !== undefined ? data.TauxTVA : 19,
        emission:          data.emission || ""
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

    const popup = $("#popup-config-devis-ligne").dxPopup("instance");
    if (popup) popup.hide();
}
