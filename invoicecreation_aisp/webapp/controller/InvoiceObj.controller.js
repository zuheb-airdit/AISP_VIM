sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox"
], (Controller, JSONModel, Filter, FilterOperator, MessageBox) => {
    "use strict";

    return Controller.extend("com.invoicecreation.invoicecreationaisp.controller.InvoiceObj", {
        // onInit() {
        //     // let oRouter = sap.ui.core.UIComponent.getRouterFor(this);
        //     let oRouter = this.getOwnerComponent().getRouter();

        //     var oAttachmentsModel = new sap.ui.model.json.JSONModel({
        //         attachments: []
        //     });
        //     this.getView().setModel(oAttachmentsModel, "attachmentsModel");
        //     oRouter.getRoute("RouteInvoiceObj").attachPatternMatched(this._onObjectMatched, this);
        //     oRouter.getRoute("RouteSubmittedInvoiceObj").attachPatternMatched(this._onObjectMatchedSubmitted, this);
        // },

        onInit() {
            let oRouter = this.getOwnerComponent().getRouter();

            // Log when routes are attached
            console.log("Attaching route handlers");

            var oAttachmentsModel = new sap.ui.model.json.JSONModel({
                attachments: []
            });

            this.getView().setModel(oAttachmentsModel, "attachmentsModel");

            oRouter.getRoute("RouteInvoiceObj").attachPatternMatched(function (oEvent) {
                console.log("RouteInvoiceObj pattern matched", oEvent.getParameters());
                this._onObjectMatched(oEvent);
            }.bind(this), this);

            oRouter.getRoute("RouteSubmittedInvoiceObj").attachPatternMatched(function (oEvent) {
                console.log("RouteSubmittedInvoiceObj pattern matched", oEvent.getParameters());
                this._onObjectMatchedSubmitted(oEvent);
            }.bind(this), this);

        },

        _onObjectMatched: function (oEvent) {
            debugger;
            // Set the view busy indicator and hide the details section initially
            this.getView().setBusy(true);
            let poNum = oEvent.getParameter("arguments").poId; // Purchase Order Number (Ebeln)
            let vbNum = oEvent.getParameter("arguments").vbId; // Sales/Delivery Order Number (Vbeln)
            let status = oEvent.getParameter("arguments").status;
            // Retrieve the OData model from the view
            let oModel = this.getView().getModel();

            let oFilters = [
                new Filter("Ebeln", FilterOperator.EQ, poNum),
                new Filter("Vbeln", FilterOperator.EQ, vbNum)
            ];
            let oFilters1 = [
                new Filter("Ebeln", FilterOperator.EQ, poNum),
                new Filter("vbeln", FilterOperator.EQ, vbNum)
            ];

            oModel.read("/ZP_AISP_POVIM_ITEM", {
                filters: oFilters,
                success: function (res) {
                    debugger;
                    let jsonItemModel = new JSONModel({ results: res.results });
                    this.getView().setModel(jsonItemModel, "tableModel");
                    this.calculateTolat(res.results)
                }.bind(this),
                error: function (err) {
                    console.error("Error fetching item data:", err);
                }
            });
            if (status === "Invoice Pending") {
                this.byId("idSubBtn").setVisible(false)
                this.byId("idCreateBtn").setEnabled(true)
                let reserAtt = [];
                const oAttachmentsModel = this.getView().getModel("attachmentsModel");

                if (oAttachmentsModel) {
                    oAttachmentsModel.setProperty("/attachments", reserAtt);
                }

                oModel.read("/ZP_AISP_POVIM_HEAD", {
                    filters: oFilters1,
                    success: function (res) {
                        debugger;

                        let headData = res.results[0];
                        this.Lifnr = headData.Lifnr;
                        let status = headData.Status;

                        let jsonHeadModel = new JSONModel(headData);
                        jsonHeadModel.setProperty("/editable", true);
                        this.getView().setModel(jsonHeadModel, "headData");
                        this.getView().setBusy(false);
                    }.bind(this),
                    error: function (err) {
                        console.error("Error fetching header data:", err);
                        this.getView().setBusy(false);
                    }.bind(this)
                });
            } else {
                // const oFilters = [
                //     new sap.ui.model.Filter("Ebeln", sap.ui.model.FilterOperator.EQ, poNum),
                //     new sap.ui.model.Filter("Vbeln", sap.ui.model.FilterOperator.EQ, vbNum)
                // ];
                this.byId("idSubBtn").setVisible(false)
                oModel.read("/VIMDATA", {
                    filters: oFilters,
                    success: function (res) {
                        const result = res.results[0] || {};

                        // Set headData model
                        const oHeadModel = new JSONModel(result);
                        oHeadModel.setProperty("/editable", false);
                        this.getView().setModel(oHeadModel, "headData");

                        // Set attachments model
                        const aAttachments = result.TO_VIM_ATTACHMENTS.results || [];
                        const oAttachmentsModel = this.getView().getModel("attachmentsModel");

                        if (oAttachmentsModel) {
                            oAttachmentsModel.setProperty("/attachments", aAttachments);
                        }

                        this.getView().setBusy(false);
                    }.bind(this),
                    error: function (err) {
                        console.error("Error fetching VIM data:", err);
                        this.getView().setBusy(false);
                    }.bind(this)
                });
            }
        },

        _onObjectMatchedSubmitted: function (oEvent) {
            debugger;
            this.getView().setBusy(true);
            let reqno = oEvent.getParameter("arguments").reqno; // Purchase Order Number (Ebeln)

            // Retrieve the OData model from the view
            let oModel = this.getView().getModel();

            let oFilters = [
                new Filter("REQUEST_NO", FilterOperator.EQ, reqno)
            ];

            oModel.read("/VIMDATA", {
                urlParameters: {
                    "$expand": "TO_VIM_ITEMS,TO_VIM_ATTACHMENTS"
                },
                filters: oFilters,
                success: function (res) {
                    debugger;
                    this.getView().setBusy(false);

                    let headData = res.results[0] || {};
                    let currentTab = headData.Status;
                    let oHeadModel = new sap.ui.model.json.JSONModel(headData);
                    this.getView().setModel(oHeadModel, "headData");

                    // Items Data
                    let items = (headData.TO_VIM_ITEMS && headData.TO_VIM_ITEMS.results) || [];
                    let oItemsModel = new sap.ui.model.json.JSONModel({ results: items });
                    this.getView().setModel(oItemsModel, "tableModel");

                    // this.calculateTolat(items)

                    // Attachments Data
                    let attachments = (headData.TO_VIM_ATTACHMENTS && headData.TO_VIM_ATTACHMENTS.results) || [];
                    let filteredAttachments;
                    if (currentTab !== 'REJECTED') {
                        filteredAttachments = attachments.filter(a => a.STATUS === "Pending");
                    } else {
                        filteredAttachments = attachments;
                    }


                    let oAttachmentModel = new sap.ui.model.json.JSONModel({ attachments: filteredAttachments });
                    this.getView().setModel(oAttachmentModel, "attachmentsModel");
                }.bind(this),
                error: function (err) {
                    debugger;
                    this.getView().setBusy(false);

                    sap.m.MessageToast.show("Failed to load PO data.");
                }
            });

        },

        calculateTolat: function (results) {
            let total = 0;
            results.map((item) => {
                total = total + parseFloat(item.Total);
            })
            this.totalval = total;
            let attachmentModel = this.getView().getModel("attachmentsModel");
            attachmentModel.setProperty("/total", total)
        },

        onPressEdit: function () {
            const oHeadModel = this.getView().getModel("headData");
            debugger;
            if (oHeadModel) {
                const bEditable = oHeadModel.getProperty("/editable");
                console.log(bEditable)
                oHeadModel.setProperty("/editable", !bEditable);
                this.byId("idCreateBtn").setEnabled(bEditable)
                this.byId("idSubBtn").setVisible(!bEditable)

            } else {
                console.warn("headData model not found.");
            }
        },

        onPreviewAttachment: function (oEvent) {
            const oCtx = oEvent.getSource().getBindingContext("attachmentsModel");
            const oData = oCtx.getObject();

            if (!oData.IMAGEURL) {
                MessageBox.error("No file found.");
                return;
            }

            this.previewAttachment(oData); // 👈 simple call
        },

        previewAttachment: function (res) {
            const fileName = res.IMAGE_FILE_NAME || "Preview";
            const fileType = fileName.split(".").pop().toLowerCase();

            try {
                const byteCharacters = atob(res.IMAGEURL); // base64 decode
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);

                let mimeType;
                switch (fileType) {
                    case "pdf":
                        mimeType = "application/pdf";
                        break;
                    case "png":
                    case "jpg":
                    case "jpeg":
                        mimeType = `image/${fileType === "jpg" ? "jpeg" : fileType}`;
                        break;
                    case "xlsx":
                        mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                        break;
                    case "msg":
                        mimeType = "application/vnd.ms-outlook";
                        break;
                    default:
                        MessageBox.error("Unsupported file type.");
                        return;
                }

                const blob = new Blob([byteArray], { type: mimeType });
                const objectURL = URL.createObjectURL(blob);

                // Show in new tab for previewable types
                if (["pdf", "png", "jpg", "jpeg"].includes(fileType)) {
                    window.open(objectURL);
                } else {
                    // For other types like xlsx, msg, force download
                    const link = document.createElement("a");
                    link.href = objectURL;
                    link.download = fileName;
                    link.click();
                }

            } catch (err) {
                MessageBox.error("Failed to preview file.");
                console.error("Preview Error:", err);
            }
        },

        onFileSelected: function (oEvent) {
            var aFiles = oEvent.getParameter("files");
            if (!aFiles || aFiles.length === 0) {
                sap.m.MessageToast.show("No file selected!");
                return;
            }

            // Using only the first file, since we allow only one attachment.
            var oFile = aFiles[0];

            // Create a FileReader to convert the file to a Base64 string.
            var oReader = new FileReader();
            oReader.onload = function (e) {
                // Get the complete Base64 Data URL
                var sBase64DataUrl = e.target.result.split(",")[1];

                // Create the object for the attachment, including additional UI fields.
                var oNewAttachment = {
                    VendorCode: this.Lifnr,
                    DESCRIPTION: oFile.name,
                    IMAGEURL: sBase64DataUrl,         // Base64 encoded string
                    IMAGE_FILE_NAME: oFile.name,
                    FILE_SIZE: oFile.size,            // File size in bytes (for display)
                    UPLOADED_BY: "Current User",      // You might want to set this dynamically
                    // You can add other fields if required, such as uploadedOn date etc.
                    uploadedOn: new Date().toLocaleDateString(),
                    version: "1"
                };

                // Get the attachments model from the view.
                var oAttachmentsModel = this.getView().getModel("attachmentsModel");
                // Retrieve the current attachments array (or create an empty array if undefined).
                var aAttachments = oAttachmentsModel.getProperty("/attachments") || [];

                // Add the new attachment to the array.
                aAttachments.push(oNewAttachment);
                // Update the model's "/attachments" property.
                oAttachmentsModel.setProperty("/attachments", aAttachments);

                // Optionally, update any UI text such as attachments count.
                this.byId("attachmentsCountTitle").setText("Attachments (" + aAttachments.length + ")");

                // If using a FileUploader, you might clear its value here to reset it.
                this.byId("fileUploader").clear();
            }.bind(this);

            // Start reading the file
            oReader.readAsDataURL(oFile);
        },

        onDeleteAttachmentPress: function (oEvent) {
            // Get the binding context of the pressed delete button from the attachmentsModel
            var oBindingContext = oEvent.getSource().getBindingContext("attachmentsModel");
            if (!oBindingContext) {
                return;
            }

            // Extract the path, for example, "/attachments/0", and determine the index
            var sPath = oBindingContext.getPath();  // e.g., "/attachments/0"
            var aPathParts = sPath.split("/");
            var iIndex = parseInt(aPathParts[aPathParts.length - 1], 10);

            // Get the attachments model and current attachments array
            var oAttachmentsModel = this.getView().getModel("attachmentsModel");
            var aAttachments = oAttachmentsModel.getProperty("/attachments") || [];

            // Remove the selected attachment from the array
            if (iIndex > -1 && iIndex < aAttachments.length) {
                aAttachments.splice(iIndex, 1);
                oAttachmentsModel.setProperty("/attachments", aAttachments);
            }

            // Update the attachments count title
            this.byId("attachmentsCountTitle").setText("Attachments (" + aAttachments.length + ")");

            // If there are no attachments left, re-enable the FileUploader so a new file can be uploaded
            if (aAttachments.length === 0) {
                this.byId("fileUploader").setEnabled(true);
            }
        },

        onInvoiceCreation: function () {
            var that = this;
            function formatDateToYYYYMMDD(oDate) {
                if (!oDate) return "";
                const year = oDate.getFullYear();
                const month = String(oDate.getMonth() + 1).padStart(2, "0");
                const day = String(oDate.getDate()).padStart(2, "0");
                return `${year}-${month}-${day}`;
            }


            // function formatDate(sDate) {
            //     if (!sDate) return "";
            //     if (sDate.indexOf("-") > -1) return sDate;
            //     var parts = sDate.split("/");
            //     if (parts.length !== 3) return sDate;
            //     var day = parts[0].padStart(2, "0");
            //     var month = parts[1].padStart(2, "0");
            //     var year = parts[2].length === 2 ? "20" + parts[2] : parts[2];
            //     return year + "-" + month + "-" + day;
            // }

            function formatDate(sDate) {
                if (!sDate) return "";

                // Convert string to Date object
                const oDate = new Date(sDate);

                // Get parts
                const year = oDate.getFullYear();
                const month = String(oDate.getMonth() + 1).padStart(2, "0"); // Month is 0-based
                const day = String(oDate.getDate()).padStart(2, "0");

                return `${year}-${month}-${day}`; // YYYY-MM-DD
            }

            sap.m.MessageBox.confirm("Are you sure you want to Submit?", {
                title: "Confirm Submission",
                actions: [sap.m.MessageBox.Action.OK, sap.m.MessageBox.Action.CANCEL],
                onClose: function (oAction) {
                    if (oAction === sap.m.MessageBox.Action.OK) {
                        that.getView().setBusy(true); // Initially set busy
                        var oModel = that.getView().getModel();
                        var oHeadModel = that.getView().getModel("headData");
                        var oItemModel = that.getView().getModel("tableModel");
                        var invoiveNum = that.byId("idInvoiceNum").getValue();
                        var invoiceDateObj = this.byId("idInvoiceDate").getDateValue();
                        const formattedInvoiceDate = formatDateToYYYYMMDD(invoiceDateObj);

                        var oHeadData = oHeadModel.getData();
                        var oItemData = oItemModel.getData();
                        var oAttachmentsModel = that.getView().getModel("attachmentsModel");
                        var aAttachments = (oAttachmentsModel && oAttachmentsModel.getData().attachments) || [];

                        var fTotalAmount = 0;
                        if (oItemData?.results?.length > 0) {
                            oItemData.results.forEach(item => {
                                fTotalAmount += parseFloat(item.ASNitamount) || 0;
                            });
                        }

                        var oPayload = {
                            action: "CREATE",
                            Vimhead: [{
                                COMPANY_CODE: oHeadData.Bukrs,
                                TotalAmount: that.totalval,
                                Ebeln: oHeadData.Ebeln,
                                Vbeln: oHeadData.vbeln,
                                Xblnr: oHeadData.xblnr,
                                Mblnr: oHeadData.mblnr,
                                Bukrs: oHeadData.Bukrs,
                                Bedat: formatDate(oHeadData.Bedat),
                                Aedat: formatDate(oHeadData.Aedat),
                                Ernam: oHeadData.Ernam,
                                Lifnr: oHeadData.Lifnr,
                                ASNamount: oHeadData.ASNamount,
                                AsnDate: formatDate(oHeadData.asndate || oHeadData.Bedat),
                                Name1: oHeadData.name1,
                                VendorAddress: oHeadData.Vendoraddress,
                                BankKey: oHeadData.Bankkey,
                                BankAccount: oHeadData.Bankacc,
                                BankName: oHeadData.Bankname,
                                Ekorg: oHeadData.Ekorg,
                                Invoicerefno: invoiveNum,
                                Invoicedate: formattedInvoiceDate,
                                Weakt: (oHeadData.Weakt || oHeadData.Weakt === true) ? "Y" : "N",
                                SOURCE_TYPE: '02-Portal'
                            }],
                            Vimitem: [],
                            Attachment: []
                        };

                        if (oItemData?.results?.length > 0) {
                            oPayload.Vimitem = oItemData.results.map(item => ({
                                Ebeln: oHeadData.Ebeln,
                                Vbeln: oHeadData.vbeln,
                                Ebelp: item.Ebelp,
                                Txz01: item.txz01,
                                Ebtyp: item.Ebtyp,
                                Eindt: formatDate(item.Eindt),
                                Lpein: item.Lpein,
                                Uzeit: item.Uzeit,
                                Erdat: formatDate(item.Erdat),
                                Ezeit: item.Ezeit,
                                Menge: item.menge,
                                AsnQty: item.Asnqty,
                                ASNitAmount: item.ASNitamount,
                                GRNitAmount: item.GRNitamount,
                                Taxper: item.Taxper,
                                Taxval: item.Taxval,
                                Total: item.Total,
                                Meins: item.meins,
                                Waers: item.waers,
                                Estkz: item.Estkz,
                                Loekz: item.Loekz,
                                Xblnr: item.Xblnr,
                                Vbelp: item.Vbelp,
                                Mprof: item.Mprof,
                                Ematn: item.Ematn,
                                Mahnz: item.Mahnz,
                                Charg: item.Charg,
                                Uecha: item.Uecha
                            }));
                        }

                        if (aAttachments?.length > 0) {
                            oPayload.Attachment = aAttachments.map(att => ({
                                VendorCode: att.VendorCode || oHeadData.Lifnr,
                                DESCRIPTION: att.DESCRIPTION || "Vendor Registration Document",
                                IMAGEURL: att.IMAGEURL,
                                IMAGE_FILE_NAME: att.IMAGE_FILE_NAME
                            }));
                        }

                        console.log("Invoice Creation Payload:", oPayload);

                        // 🔽 setBusy(true) already done before, now make the POST call
                        oModel.create("/PostVimData", oPayload, {
                            success: function (oData, response) {
                                that.getView().setBusy(false); // ✅ Stop busy here
                                MessageBox.success("Invoice creation successful!", {
                                    onClose: function (sAction) {
                                        if (sAction === sap.m.MessageBox.Action.OK) {
                                            that.getOwnerComponent().getRouter().navTo("RouteInvoiceCreation");
                                        }
                                    }
                                });
                            },
                            error: function (oError) {
                                that.getView().setBusy(false); // ❌ Also stop busy on error
                                MessageBox.error("Invoice creation failed.");
                                console.error("Error in onInvoiceCreation:", oError);
                            }
                        });

                    } else {
                        that.getView().setBusy(false); // ❗ If user cancels
                    }
                }.bind(this)
            });
        },

        onInvoiceSubmit: function () {
            const that = this;
            const formatDate = (sDate) => {
                if (!sDate) return "";
                if (sDate.includes("-")) return sDate;
                const parts = sDate.split("/");
                if (parts.length !== 3) return sDate;
                const [day, month, year] = parts;
                return `${year.length === 2 ? "20" + year : year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
            };

            MessageBox.confirm("Are you sure you want to resubmit the invoice after editing?", {
                title: "Confirm Resubmission",
                actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                onClose: function (oAction) {
                    if (oAction === MessageBox.Action.OK) {
                        that.getView().setBusy(true);
                        const oHeadData = that.getView().getModel("headData").getData();
                        const oAttachments = oHeadData.TO_VIM_ATTACHMENTS?.results || [];
                        const oItems = oHeadData.TO_VIM_ITEMS?.results || [];

                        const payload = {
                            action: "EDIT_RESUBMIT",
                            REQUEST_NO: oHeadData.REQUEST_NO,
                            Vimhead: [{
                                COMPANY_CODE: oHeadData.COMPANY_CODE,
                                TotalAmount: oHeadData.TotalAmount,
                                Ebeln: oHeadData.Ebeln,
                                Vbeln: oHeadData.Vbeln,
                                Bedat: formatDate(oHeadData.Bedat),
                                Lifnr: oHeadData.Lifnr,
                                ASNamount: parseFloat(oHeadData.ASNamount),
                                AsnDate: formatDate(oHeadData.AsnDate),
                                Name1: oHeadData.Name1,
                                VendorAddress: oHeadData.VendorAddress,
                                BankKey: oHeadData.BankKey,
                                BankAccount: oHeadData.BankAccount,
                                BankName: oHeadData.BankName,
                                Ekorg: oHeadData.Ekorg,
                                Invoicerefno: oHeadData.Invoicerefno,
                                Invoicedate: formatDate(oHeadData.Invoicedate),
                                Weakt: oHeadData.Weakt === "Y" ? "Y" : "N"
                            }],
                            Vimitem: oItems.map(item => ({
                                Ebeln: item.Ebeln,
                                Vbeln: item.Vbeln,
                                Ebelp: item.Ebelp,
                                Txz01: item.Txz01,
                                Menge: parseFloat(item.Menge),
                                AsnQty: parseFloat(item.AsnQty),
                                ASNitAmount: parseFloat(item.ASNitAmount),
                                GRNitAmount: parseFloat(item.GRNitAmount),
                                Taxper: parseFloat(item.Taxper),
                                Taxval: item.Taxval,
                                Total: parseFloat(item.Total),
                                Meins: item.Meins
                            })),

                            Attachment: oAttachments
                                .filter(att => att.STATUS !== "Rejected") // 👈 filters out rejected ones
                                .map(att => ({
                                    VendorCode: oHeadData.Lifnr,
                                    DESCRIPTION: att.DESCRIPTION,
                                    IMAGEURL: att.IMAGEURL,
                                    IMAGE_FILE_NAME: att.IMAGE_FILE_NAME,
                                    ATTACHMENT_ID: att.ATTACHMENT_ID
                                }))

                        };

                        const oModel = that.getView().getModel();
                        oModel.create("/PostVimData", payload, {
                            success: function () {
                                that.getView().setBusy(false);
                                MessageBox.success("Invoice resubmitted successfully!", {
                                    onClose: function () {
                                        that.getOwnerComponent().getRouter().navTo("RouteInvoiceCreation");
                                    }
                                });
                            },
                            error: function (oError) {
                                that.getView().setBusy(false);
                                MessageBox.error("Resubmission failed. Please try again.");
                                console.error("Error during EDIT_RESUBMIT:", oError);
                            }
                        });
                    } else {
                        that.getView().setBusy(false);
                    }
                }.bind(this)
            });
        },

        handleClose: function () {
            this.getOwnerComponent().getRouter().navTo("RouteInvoiceCreation")
        }
    });
});