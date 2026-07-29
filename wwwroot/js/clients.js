// --- MODULE CLIENTS ---

async function chargerClients() {
    try {
        const res = await fetch('/api/partenaires');
        clientsData = await res.json();

        $("#grid-clients").dxDataGrid({
            dataSource: clientsData,
            allowColumnResizing: true,
            columnResizingMode: "widget",
            columnAutoWidth: true,
            showBorders: false,
            searchPanel: {
                visible: true,
                width: 260,
                placeholder: "Rechercher un client..."
            },
            filterRow: {
                visible: true
            },
            groupPanel: {
                visible: true,
                placeholder: "Faites glisser une colonne pour grouper"
            },
            paging: {
                pageSize: 10
            },
            columns: [
                {
                    dataField: "entreprise",
                    caption: "Entreprise / Raison Sociale",
                    cellTemplate: (container, options) => {
                        $("<strong>").text(options.value).appendTo(container);
                }},
                {
                    dataField: "nom",
                    caption: "Nom Contact"
                },
                {
                    dataField: "email",
                    caption: "Email"
                },
                {
                    dataField: "telephone",
                    caption: "Téléphone",
                    width: 140
                },
                {
                    dataField: "adresse",
                    caption: "Adresse Postale"
                },
            ]
        });
    } catch (err) {
        console.error(err);
        showToast("Erreur de chargement des clients.", true);
    }
}

// CREER CLIENT (POPUP + FORMULAIRE DX)
function initPopupClient() {
    $("#popup-client").dxPopup({
        title: "Créer une fiche Client",
        width: 500,
        height: "auto",
        visible: false,
        dragEnabled: true,
        showCloseButton: true,
        contentTemplate: (container) => {
            $("<div id='dx-form-client'>").appendTo(container);
        },
        toolbarItems: [
            {
                shortcut: "done",
                location: "after",
                toolbar: "bottom",
                widget: "dxButton",
                options: {
                    text: "Enregistrer",
                    type: "default",
                    onClick: () => soumettreClient()
                }
            },
            {
                shortcut: "cancel",
                location: "after",
                toolbar: "bottom",
                widget: "dxButton",
                options: {
                    text: "Annuler",
                    onClick: () => $("#popup-client").dxPopup("instance").hide()
                }
            }
        ],
        onShowing: () => {
            // Initialiser ou réinitialiser le formulaire
            $("#dx-form-client").dxForm({
                formData: {
                    nom: "",
                    entreprise: "",
                    email: "",
                    telephone: "",
                    adresse: "",
                },
                labelLocation: "top",
                items: [
                    {
                        dataField: "nom",
                        label: {
                            text: "Nom du Contact Principal"
                        },
                        validationRules: [{
                            type: "required",
                            message: "Le nom est requis."
                        }]
                    },
                    {
                        dataField: "entreprise",
                        editorType: "dxAutocomplete",
                        editorOptions: {
                            dataSource: [...new Set(clientsData.map(c => c.entreprise))],
                            searchMode: "contains",
                            minSearchLength: 1,

                            onValueChanged(e) {
                                const client = clientsData.find(c => c.entreprise === e.value);
                                if (!client) return;

                                const form = $("#dx-form-client").dxForm("instance");
                                form.updateData("nom", client.nom);
                                form.updateData("email", client.email);
                                form.updateData("telephone", client.telephone);
                                form.updateData("adresse", client.adresse);
                            }
                        }
                    },
                    {
                        dataField: "email",
                        label: {
                            text: "Adresse E-mail"
                        },
                        validationRules: [
                            {
                                type: "required",
                                message: "L'email est requis."
                            },
                            {
                                type: "email",
                                message: "Format d'email invalide."
                            }]
                    },
                    {
                        dataField: "telephone",
                        label: {
                            text: "Téléphone"
                        }
                    },
                    {
                        dataField: "adresse",
                        label: {
                            text: "Adresse Postale"
                        }
                    },
                ]
            });
        }
    });
}

async function soumettreClient() {
    const form = $("#dx-form-client").dxForm("instance");
    const result = form.validate();
    
    if (!result.isValid) return;
    
    const payload = form.option("formData");

    try {
        const res = await fetch('/api/partenaires', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error("Erreur serveur lors de la création.");
        
        showToast("Nouveau client créé avec succès !");
        $("#popup-client").dxPopup("instance").hide();
        
        chargerToutesLesDonnees();
        if (activeTab === 'clients') chargerClients();
    } catch (err) {
        showToast(err.message, true);
    }
}
