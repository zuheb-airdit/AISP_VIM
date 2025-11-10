sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox"
], (Controller, JSONModel, Filter, FilterOperator, MessageBox) => {
    "use strict";

    return Controller.extend("com.invoicecreation.invoicecreationaisp.controller.InvoiceObj", {

        onInit() {
            let oRouter = this.getOwnerComponent().getRouter();

            var oAttachmentsModel = new JSONModel({
                attachments: [],
                total: 0
            });

            this.getView().setModel(oAttachmentsModel, "attachmentsModel");

            oRouter.getRoute("RouteInvoiceObj").attachPatternMatched(function (oEvent) {
                console.log("RouteInvoiceObj pattern matched", oEvent.getParameters());
                this._onObjectMatched(oEvent);
            }.bind(this), this);
        },

        _onObjectMatched: function (oEvent) {
            this.getView().setBusy(true);
            let poNum = oEvent.getParameter("arguments").poId;
            let vbNum = oEvent.getParameter("arguments").vbId;
            let status = oEvent.getParameter("arguments").status;
            let oModel = this.getView().getModel();

            let oItemFilters = [
                new Filter("Ebeln", FilterOperator.EQ, poNum),
                new Filter("Vbeln", FilterOperator.EQ, vbNum)
            ];

            let oHeadFilters = [
                new Filter("Ebeln", FilterOperator.EQ, poNum),
                new Filter("vbeln", FilterOperator.EQ, vbNum)
            ];

            // Fetch item data
            oModel.read("/ZP_AISP_POVIM_ITEM", {
                filters: oItemFilters,
                success: function (res) {
                    let jsonItemModel = new JSONModel({ results: res.results });
                    this.getView().setModel(jsonItemModel, "tableModel");
                    this.calculateTotal(res.results);

                    // Fetch header data
                    oModel.read("/ZP_AISP_POVIM_HEAD", {
                        filters: oHeadFilters,
                        success: function (res) {
                            let headData = res.results[0];
                            this.Lifnr = headData.Lifnr;

                            let jsonHeadModel = new JSONModel(headData);

                            this.getView().setModel(jsonHeadModel, "headData");
                            this.getView().setBusy(false);

                        }.bind(this),
                        error: function (err) {
                            console.error("Error fetching header data:", err);
                            this.getView().setBusy(false);
                        }.bind(this)
                    });

                }.bind(this),
                error: function (err) {
                    console.error("Error fetching item data:", err);
                    this.getView().setBusy(false);
                }
            });
        },

        // Live change handler for Invoice Number
        onInvoiceNumberLiveChange: function (oEvent) {
            const sValue = oEvent.getSource().getValue();

            // Clear error state when user starts typing
            if (sValue && sValue.trim() !== "") {
                this.byId("idInvoiceNum").setValueState("None");
                this.byId("idInvoiceNum").setValueStateText("");
            }
        },

        // Change handler for Invoice Date
        onInvoiceDateChange: function (oEvent) {
            const oDate = oEvent.getSource().getDateValue();

            // Clear error state when user selects a date
            if (oDate) {
                this.byId("idInvoiceDate").setValueState("None");
                this.byId("idInvoiceDate").setValueStateText("");
            }
        },

        // Validation function for user inputs only
        validateForm: function () {
            let aErrors = [];
            let bIsValid = true;

            // Reset all value states
            this.byId("idInvoiceNum").setValueState("None");
            this.byId("idInvoiceNum").setValueStateText("");
            this.byId("idInvoiceDate").setValueState("None");
            this.byId("idInvoiceDate").setValueStateText("");

            // Get values
            const sInvoiceNum = this.byId("idInvoiceNum").getValue();
            const oInvoiceDate = this.byId("idInvoiceDate").getDateValue();
            const oAttachmentsModel = this.getView().getModel("attachmentsModel");
            const aAttachments = (oAttachmentsModel && oAttachmentsModel.getData().attachments) || [];

            // Validate Invoice Number
            if (!sInvoiceNum || sInvoiceNum.trim() === "") {
                aErrors.push("• Invoice Number is required");
                this.byId("idInvoiceNum").setValueState("Error");
                this.byId("idInvoiceNum").setValueStateText("Invoice Number is required");
                bIsValid = false;
            } else if (sInvoiceNum.length > 50) {
                aErrors.push("• Invoice Number cannot exceed 50 characters");
                this.byId("idInvoiceNum").setValueState("Error");
                this.byId("idInvoiceNum").setValueStateText("Cannot exceed 50 characters");
                bIsValid = false;
            }

            // Validate Invoice Date
            if (!oInvoiceDate) {
                aErrors.push("• Invoice Date is required");
                this.byId("idInvoiceDate").setValueState("Error");
                this.byId("idInvoiceDate").setValueStateText("Invoice Date is required");
                bIsValid = false;
            }

            // Validate Attachments
            if (aAttachments.length === 0) {
                aErrors.push("• At least one attachment is required");
                bIsValid = false;
            }

            // Validate attachment file types and sizes
            aAttachments.forEach((attachment, index) => {
                const sFileName = attachment.IMAGE_FILE_NAME;
                const iFileSize = attachment.FILE_SIZE;

                // Check file type
                const aAllowedExtensions = ['.pdf', '.xlsx', '.csv', '.txt'];
                const sFileExtension = sFileName.substring(sFileName.lastIndexOf('.')).toLowerCase();

                if (!aAllowedExtensions.includes(sFileExtension)) {
                    aErrors.push(`• Attachment "${sFileName}" has invalid file type. Allowed types: PDF, XLSX, CSV, TXT`);
                    bIsValid = false;
                }

                // Check file size (5MB limit)
                const iMaxSize = 5 * 1024 * 1024; // 5MB in bytes
                if (iFileSize > iMaxSize) {
                    aErrors.push(`• Attachment "${sFileName}" exceeds 5MB size limit`);
                    bIsValid = false;
                }
            });

            return {
                isValid: bIsValid,
                errors: aErrors
            };
        },

        calculateTotal: function (results) {
            let total = 0;
            results.forEach((item) => {
                total += parseFloat(item.Total) || 0;
            });

            let attachmentModel = this.getView().getModel("attachmentsModel");
            attachmentModel.setProperty("/total", total);
        },

        onPreviewAttachment: function (oEvent) {
            const oCtx = oEvent.getSource().getBindingContext("attachmentsModel");
            const oData = oCtx.getObject();

            if (!oData.IMAGEURL) {
                MessageBox.error("No file found.");
                return;
            }

            this.previewAttachment(oData);
        },

        previewAttachment: function (res) {
            const fileName = res.IMAGE_FILE_NAME || "Preview";
            const fileType = fileName.split(".").pop().toLowerCase();

            try {
                const byteCharacters = atob(res.IMAGEURL);
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

                if (["pdf", "png", "jpg", "jpeg"].includes(fileType)) {
                    window.open(objectURL);
                } else {
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

            var oFile = aFiles[0];
            var oReader = new FileReader();

            oReader.onload = function (e) {
                var sBase64DataUrl = e.target.result.split(",")[1];

                var oNewAttachment = {
                    VendorCode: this.Lifnr,
                    DESCRIPTION: oFile.name,
                    IMAGEURL: sBase64DataUrl,
                    IMAGE_FILE_NAME: oFile.name,
                    FILE_SIZE: oFile.size,
                    UPLOADED_BY: "Current User",
                    uploadedOn: new Date().toLocaleDateString(),
                    version: "1",
                    STATUS: "Pending"
                };

                var oAttachmentsModel = this.getView().getModel("attachmentsModel");
                var aAttachments = oAttachmentsModel.getProperty("/attachments") || [];
                aAttachments.push(oNewAttachment);
                oAttachmentsModel.setProperty("/attachments", aAttachments);

                this.byId("attachmentsCountTitle").setText("Attachments (" + aAttachments.length + ")");
                this.byId("fileUploader").clear();
            }.bind(this);

            oReader.readAsDataURL(oFile);
        },

        onDeleteAttachmentPress: function (oEvent) {
            var oBindingContext = oEvent.getSource().getBindingContext("attachmentsModel");
            if (!oBindingContext) return;

            var sPath = oBindingContext.getPath();
            var aPathParts = sPath.split("/");
            var iIndex = parseInt(aPathParts[aPathParts.length - 1], 10);

            var oAttachmentsModel = this.getView().getModel("attachmentsModel");
            var aAttachments = oAttachmentsModel.getProperty("/attachments") || [];

            if (iIndex > -1 && iIndex < aAttachments.length) {
                aAttachments.splice(iIndex, 1);
                oAttachmentsModel.setProperty("/attachments", aAttachments);
            }

            this.byId("attachmentsCountTitle").setText("Attachments (" + aAttachments.length + ")");
        },

        formatDate: function (sDate) {
            if (!sDate) return "";
            const oDate = new Date(sDate);
            const year = oDate.getFullYear();
            const month = String(oDate.getMonth() + 1).padStart(2, "0");
            const day = String(oDate.getDate()).padStart(2, "0");
            return `${year}-${month}-${day}`;
        },

        onInvoiceCreation: function () {
            var that = this;

            const oValidation = this.validateForm();

            if (!oValidation.isValid) {
                // Show all validation errors in a message box
                const sErrorMessages = oValidation.errors.join("\n");
                MessageBox.error("Please fix the following errors:\n\n" + sErrorMessages, {
                    title: "Validation Errors",
                    width: "600px"
                });
                return;
            }

            MessageBox.confirm("Are you sure you want to Submit?", {
                title: "Confirm Submission",
                actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                onClose: function (oAction) {
                    if (oAction === MessageBox.Action.OK) {
                        that.getView().setBusy(true);

                        // Prepare payload using separate function
                        const oPayload = that.prepareInvoicePayload.call(that);

                        console.log("Invoice Creation Payload:", oPayload);

                        var oModel = that.getView().getModel();
                        oModel.create("/PostVimData", oPayload, {
                            success: function (oData, response) {
                                that.getView().setBusy(false);
                                let successMsg = oData?.PostVimData || "Invoice creation successful!"
                                MessageBox.success(successMsg, {
                                    onClose: function (sAction) {
                                        if (sAction === MessageBox.Action.OK) {
                                            that.getOwnerComponent().getRouter().navTo("RouteInvoiceCreation");
                                        }
                                    }
                                });
                            },
                            error: function (oError) {
                                that.getView().setBusy(false);

                                // Extract the real error message f
            // try {
            //   const oItemModel = oView.getModel("tableModel").getData();
            //   const aItems = oItemModel?.results || [];

            //   // Convert Mahnz to string in each item
            //   const aUpdatedItems = aItems.map(item => ({
            //     ...item,
            //     Mahnz: item.Mahnz?.$numberDecimal ?? item.Mahnz ?? ""
            //   }));

            //   const oAttachmentsModel = oView
            //     .getModel("attachmentsModel")
            //     .getData();

            //   const aAttachments = oAttachmentsModel?.attachments || [];

            //   const oHeadData = oView.getModel("headData").getData();

            //   const payload = {
            //     action: "APPROVE",
            //     REQUEST_NO: oHeadData.REQUEST_NO,
            //     Vimhead: [
            //       {
            //         ...oHeadData,
            //         APPROVED_COMMENT: sComment,
            //         SOURCE_TYPE: '02-Portal'
            //       },
            //     ],
            //     Vimitem: aUpdatedItems,
            //     Attachment: aAttachments,
            //   };

            //   const oModel = oView.getModel(); // OData model

            //   oModel.create("/PostVimData", payload, {
            //     success: function (oData) {
            //       oView.setBusy(false);
            //       let successMsg =
            //         oData.PostVimData || "Invoice approved successfully!";
            //       sap.m.MessageBox.success(successMsg, {
            //         title: "Success",
            //         onClose: function () {
            //           // Optional: navigate or refresh
            //           this.getOwnerComponent()
            //             .getRouter()
            //             .navTo("RouteInvoiceApproval");
            //         }.bind(this),
            //       });
            //     }.bind(this),
            //     error: function (oError) {
            //       oView.setBusy(false);

            //       let sErrorMessage = "Approval failed. Please try again.";

            //       try {
            //         // Check if responseText exists and is valid JSON
            //         if (oError.responseText) {
            //           const oResponse = JSON.parse(oError.responseText);
            //           const oErrorDetails = oResponse.error;

            //           if (oErrorDetails?.message?.value) {
            //             sErrorMessage = oErrorDetails.message.value;
            //           } else if (oErrorDetails?.innererror?.errordetails?.[0]?.message?.value) {
            //             sErrorMessage = oErrorDetails.innererror.errordetails[0].message.value;
            //           }
            //         } else if (oError.message) {
            //           sErrorMessage = oError.message;
            //         }
            //       } catch (e) {
            //         console.warn("Failed to parse error response:", e);
            //       }

            //       // Show clean error message
            //       sap.m.MessageBox.error(sErrorMessage, {
            //         title: "Error"
            //       });

            //       console.error("Full Approval Error:", oError);
            //     }
            //   });
            // } catch (e) {
            //   oView.setBusy(false);
            //   sap.m.MessageBox.error("Unexpected error occurred.");
            //   console.error("Unexpected Error:", e);
            // }


onInvoiceCreation: function () {
            var that = this;

            const oValidation = this.validateForm();

            if (!oValidation.isValid) {
                // Show all validation errors in a message box
                const sErrorMessages = oValidation.errors.join("\n");
                MessageBox.error("Please fix the following errors:\n\n" + sErrorMessages, {
                    title: "Validation Errors",
                    width: "600px"
                });
                return;
            }

            MessageBox.confirm("Are you sure you want to Submit?", {
                title: "Confirm Submission",
                actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                onClose: function (oAction) {
                    if (oAction === MessageBox.Action.OK) {
                        that.getView().setBusy(true);
                        var oModel = that.getView().getModel();
                        var oHeadModel = that.getView().getModel("headData");
                        var oItemModel = that.getView().getModel("tableModel");
                        var invoiveNum = that.byId("idInvoiceNum").getValue();
                        var invoiceDateObj = that.byId("idInvoiceDate").getDateValue();
                        const formattedInvoiceDate = this.formatDate(invoiceDateObj);

                        var oHeadData = oHeadModel.getData();
                        var oItemData = oItemModel.getData();
                        const oAttachmentsModel = that.getView().getModel("attachmentsModel");
                        var aAttachments = (oAttachmentsModel && oAttachmentsModel.getData().attachments) || [];

                        var oPayload = {
                            action: "CREATE",
                            Vimhead: [{
                                COMPANY_CODE: oHeadData.Bukrs,
                                TotalAmount: parseFloat(oAttachmentsModel.getProperty('/total')),
                                Ebeln: oHeadData.Ebeln,
                                Vbeln: oHeadData.vbeln,
                                Xblnr: oHeadData.xblnr,
                                Mblnr: oHeadData.mblnr,
                                Bukrs: oHeadData.Bukrs,
                                Bedat: this.formatDate(oHeadData.Bedat),
                                Aedat: this.formatDate(oHeadData.Aedat),
                                Ernam: oHeadData.Ernam,
                                Lifnr: oHeadData.Lifnr,
                                ASNamount: parseFloat(oHeadData.ASNamount),
                                AsnDate: this.formatDate(oHeadData.asndate || oHeadData.Bedat),
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
                                Eindt: this.formatDate(item.Eindt),
                                Lpein: item.Lpein,
                                Uzeit: item.Uzeit,
                                Erdat: this.formatDate(item.Erdat),
                                Ezeit: item.Ezeit,
                                Menge: item.menge,
                                AsnQty: parseFloat(item.Asnqty),
                                ASNitAmount: parseFloat(item.ASNitamount),
                                GRNitAmount: parseFloat(item.GRNitamount),
                                Taxper: parseFloat(item.Taxper),
                                Taxval: parseFloat(item.Taxval),
                                Total: parseFloat(item.Total),
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

                        oModel.create("/PostVimData", oPayload, {
                            success: function (oData, response) {
                                that.getView().setBusy(false);
                                let successMsg = oData?.PostVimData || "Invoice creation successful!"
                                MessageBox.success(successMsg, {
                                    onClose: function (sAction) {
                                        if (sAction === MessageBox.Action.OK) {
                                            that.getOwnerComponent().getRouter().navTo("RouteInvoiceCreation");
                                        }
                                    }
                                });
                            },
                            error: function (oError) {
                                that.getView().setBusy(false);

                                // Extract the real error message from OData response
                                let sErrorMessage = "Invoice creation failed.";

                                try {
                                    if (oError.responseText) {
                                        const oResponse = JSON.parse(oError.responseText);
                                        sErrorMessage = oResponse.error?.message?.value
                                            || oResponse.error?.innererror?.errordetails?.[0]?.message?.value
                                            || sErrorMessage;
                                    }
                                } catch (e) {
                                }
                                MessageBox.error(sErrorMessage, {
                                    title: "Submission Failed"
                                });

                                console.error("Full Error:", oError);
                            }
                        });

                    } else {
                        that.getView().setBusy(false);
                    }
                }.bind(that)
            });
        },rom OData response
                                let sErrorMessage = "Invoice creation failed.";

                                try {
                                    if (oError.responseText) {
                                        const oResponse = JSON.parse(oError.responseText);
                                        sErrorMessage = oResponse.error?.message?.value
                                            || oResponse.error?.innererror?.errordetails?.[0]?.message?.value
                                            || sErrorMessage;
                                    }
                                } catch (e) {
                                    // Keep default error message
                                    MessageBox.error(sErrorMessage, {
                                        title: "Submission Failed"
                                    });

                                    console.error("Full Error:", oError);
                                }
                            }
                        });

                    } else {
                        that.getView().setBusy(false);
                    }
                }.bind(that)
            });
        },

        // Separate function for payload preparation
        prepareInvoicePayload: function () {
            var that = this;
            var oHeadModel = this.getView().getModel("headData");
            var oItemModel = this.getView().getModel("tableModel");
            var invoiveNum = this.byId("idInvoiceNum").getValue();
            var invoiceDateObj = this.byId("idInvoiceDate").getDateValue();
            const formattedInvoiceDate = this.formatDate(invoiceDateObj);

            var oHeadData = oHeadModel.getData();
            var oItemData = oItemModel.getData();
            const oAttachmentsModel = this.getView().getModel("attachmentsModel");
            var aAttachments = (oAttachmentsModel && oAttachmentsModel.getData().attachments) || [];

            var oPayload = {
                action: "CREATE",
                Vimhead: [{
                    COMPANY_CODE: oHeadData.Bukrs,
                    TotalAmount: parseFloat(oAttachmentsModel.getProperty('/total')),
                    Ebeln: oHeadData.Ebeln,
                    Vbeln: oHeadData.vbeln,
                    Xblnr: oHeadData.xblnr,
                    Mblnr: oHeadData.mblnr,
                    Bukrs: oHeadData.Bukrs,
                    Bedat: this.formatDate(oHeadData.Bedat),
                    Aedat: this.formatDate(oHeadData.Aedat),
                    Ernam: oHeadData.Ernam,
                    Lifnr: oHeadData.Lifnr,
                    ASNamount: parseFloat(oHeadData.ASNamount),
                    AsnDate: this.formatDate(oHeadData.asndate || oHeadData.Bedat),
                    Name1: oHeadData.name1,
                    VendorAddress: oHeadData.Vendoraddress,
                    BankKey: oHeadData.Bankkey,
                    BankAccount: oHeadData.Bankacc,
                    BankName: oHeadData.Bankname,
                    Ekorg: oHeadData.Ekorg,
                    Invoicerefno: invoiveNum,
                    Invoicedate: formattedInvoiceDate,
                    Weakt: (oHeadData.Weakt || oHeadData.Weakt === true) ? "Y" : "N",
                    // SOURCE_TYPE: '02-Portal'
                }],
                Vimitem: [],
                Attachment: []
            };

            // Prepare Vimitem data
            if (oItemData?.results?.length > 0) {
                oPayload.Vimitem = oItemData.results.map(item => ({
                    Ebeln: oHeadData.Ebeln,
                    Vbeln: oHeadData.vbeln,
                    Ebelp: item.Ebelp,
                    Txz01: item.txz01,
                    Ebtyp: item.Ebtyp,
                    Eindt: this.formatDate(item.Eindt),
                    Lpein: item.Lpein,
                    // Uzeit: item.Uzeit,
                    Erdat: this.formatDate(item.Erdat),
                    // Ezeit: item.Ezeit,
                    Menge: item.menge,
                    AsnQty: parseFloat(item.Asnqty),
                    ASNitAmount: parseFloat(item.ASNitamount),
                    GRNitAmount: parseFloat(item.GRNitamount),
                    Taxper: parseFloat(item.Taxper),
                    Taxval: parseFloat(item.Taxval),
                    Total: parseFloat(item.Total),
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

            // Prepare Attachment data
            if (aAttachments?.length > 0) {
                oPayload.Attachment = aAttachments.map(att => ({
                    VendorCode: att.VendorCode || oHeadData.Lifnr,
                    DESCRIPTION: att.DESCRIPTION || "Vendor Registration Document",
                    IMAGEURL: att.IMAGEURL,
                    IMAGE_FILE_NAME: att.IMAGE_FILE_NAME
                }));
            }

            return oPayload;
        },

        handleClose: function () {
            this.getOwnerComponent().getRouter().navTo("RouteInvoiceCreation");
        },
    });
});