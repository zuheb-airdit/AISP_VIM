sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox",
  ],
  (Controller, JSONModel, Filter, FilterOperator, MessageBox) => {
    "use strict";

    return Controller.extend(
      "com.invoicecreation.invoicecreationaisp.controller.SubmittedInvoiceObj",
      {
        onInit() {
          let oRouter = this.getOwnerComponent().getRouter();

          var oAttachmentsModel = new JSONModel({
            attachments: [],
          });
          this.getView().setModel(oAttachmentsModel, "attachmentsModel");

          oRouter.getRoute("RouteSubmittedInvoiceObj").attachPatternMatched(
            function (oEvent) {
              console.log(
                "RouteSubmittedInvoiceObj pattern matched",
                oEvent.getParameters()
              );
              this._onObjectMatched(oEvent);
            }.bind(this),
            this
          );
        },

        _onObjectMatched: function (oEvent) {
          this.getView().setBusy(true);
          let reqno = oEvent.getParameter("arguments").reqno;
          let oModel = this.getView().getModel();

          let oFilters = [new Filter("REQUEST_NO", FilterOperator.EQ, reqno)];

          oModel.read("/VIMDATA", {
            urlParameters: {
              $expand: "TO_VIM_ITEMS,TO_VIM_ATTACHMENTS",
            },
            filters: oFilters,
            success: function (res) {
              this.getView().setBusy(false);

              let headData = res.results[0] || {};
              let currentStatus = headData.STATUS;

              // Set head data
              let oHeadModel = new JSONModel(headData);
              oHeadModel.setProperty("/editable", false);

              this.getView().setModel(oHeadModel, "headData");

              // Set items data
              let items =
                (headData.TO_VIM_ITEMS && headData.TO_VIM_ITEMS.results) || [];
              let oItemsModel = new JSONModel({ results: items });
              this.getView().setModel(oItemsModel, "tableModel");

              // Set attachments data with filtering
              let attachments =
                (headData.TO_VIM_ATTACHMENTS &&
                  headData.TO_VIM_ATTACHMENTS.results) ||
                [];
              let filteredAttachments;

              if (currentStatus !== 3) {
                // Not REJECTED
                filteredAttachments = attachments.filter(
                  (a) => a.STATUS === "Pending"
                );
              } else {
                filteredAttachments = attachments;
              }

              let oAttachmentModel =
                this.getView().getModel("attachmentsModel");
              oAttachmentModel.setProperty("/attachments", filteredAttachments);
            }.bind(this),
            error: function (err) {
              this.getView().setBusy(false);
              MessageBox.error("Failed to load invoice data.");
              console.error("Error loading VIMDATA:", err);
            },
          });
        },

        onPressEdit: function () {
          const oHeadModel = this.getView().getModel("headData");
          debugger;
          if (oHeadModel) {
            const bEditable = oHeadModel.getProperty("/editable");
            console.log(bEditable);
            oHeadModel.setProperty("/editable", !bEditable);
            this.byId("idSubBtn").setVisible(!bEditable);
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
          } else if (oData.IMAGEURL.startsWith("blob:")) {
            // It's already a blob URL - use it directly
            this.handleBlobUrl(oData.IMAGEURL, fileType, fileName);
          } else if (
            oData.IMAGEURL.startsWith("http://") ||
            oData.IMAGEURL.startsWith("https://")
          ) {
            // It's a direct URL - open it directly
            window.open(oData.IMAGEURL, "_blank");
          } else {
            // Assume it's base64 encoded
            // this.handleBase64Data(oData.IMAGEURL, fileType, fileName);
            this.previewAttachment(oData);
          }
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
                mimeType =
                  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
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

        handleClose: function () {
          this.getOwnerComponent().getRouter().navTo("RouteInvoiceCreation");
        },

        formatDate: function (sDate) {
          if (!sDate) return "";
          const oDate = new Date(sDate);
          const year = oDate.getFullYear();
          const month = String(oDate.getMonth() + 1).padStart(2, "0");
          const day = String(oDate.getDate()).padStart(2, "0");
          return `${year}-${month}-${day}`;
        },

        formatStatusText: function (status) {
          if (status === 3) {
            return "Rejected";
          } else if (status === 4) {
            return "In-Approval";
          } else if (status === 5) {
            return "Submitted";
          } else {
            return "Unknown";
          }
        },

        formatStatusState: function (status) {
          if (status === 3) {
            return "Error";
          } else if (status === 4) {
            return "Warning";
          } else if (status === 5) {
            return "Success";
          } else {
            return "None";
          }
        },

        onInvoiceSubmit: function () {
          const that = this;

          const formatDate = (sDate) => {
            if (!sDate) return "";
            if (sDate.includes("-")) return sDate;
            const parts = sDate.split("/");
            if (parts.length !== 3) return sDate;
            const [day, month, year] = parts;
            return `${year.length === 2 ? "20" + year : year}-${month.padStart(
              2,
              "0"
            )}-${day.padStart(2, "0")}`;
          };

          MessageBox.confirm(
            "Are you sure you want to resubmit the invoice after editing?",
            {
              title: "Confirm Resubmission",
              actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
              onClose: function (oAction) {
                if (oAction === MessageBox.Action.OK) {
                  that.getView().setBusy(true);
                  const oHeadData = that
                    .getView()
                    .getModel("headData")
                    .getData();
                  const oAttachments =
                    oHeadData.TO_VIM_ATTACHMENTS?.results || [];
                  const oItems = oHeadData.TO_VIM_ITEMS?.results || [];

                  const payload = {
                    action: "EDIT_RESUBMIT",
                    REQUEST_NO: oHeadData.REQUEST_NO,
                    Vimhead: [
                      {
                        COMPANY_CODE: oHeadData.COMPANY_CODE,
                        TotalAmount: parseFloat(oHeadData.TotalAmount),
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
                        Weakt: oHeadData.Weakt === "Y" ? "Y" : "N",
                        SOURCE_TYPE: "02-Portal",
                      },
                    ],
                    Vimitem: oItems.map((item) => ({
                      Ebeln: item.Ebeln,
                      Vbeln: item.Vbeln,
                      Ebelp: item.Ebelp,
                      Txz01: item.Txz01,
                      Menge: parseFloat(item.Menge),
                      AsnQty: parseFloat(item.AsnQty),
                      ASNitAmount: parseFloat(item.ASNitAmount),
                      GRNitAmount: parseFloat(item.GRNitAmount),
                      Taxper: parseFloat(item.Taxper),
                      Taxval: parseFloat(item.Taxval),
                      Total: parseFloat(item.Total),
                      Meins: item.Meins,
                    })),

                    Attachment: oAttachments
                      .filter((att) => att.STATUS !== "Rejected") // 👈 filters out rejected ones
                      .map((att) => ({
                        VendorCode: oHeadData.Lifnr,
                        DESCRIPTION: att.DESCRIPTION,
                        IMAGEURL: att.IMAGEURL,
                        IMAGE_FILE_NAME: att.IMAGE_FILE_NAME,
                        ATTACHMENT_ID: att.ATTACHMENT_ID,
                      })),
                  };

                  const oModel = that.getView().getModel();
                  oModel.create("/PostVimData", payload, {
                    success: function () {
                      that.getView().setBusy(false);
                      MessageBox.success("Invoice resubmitted successfully!", {
                        onClose: function () {
                          that
                            .getOwnerComponent()
                            .getRouter()
                            .navTo("RouteInvoiceCreation");
                        },
                      });
                    },
                    error: function (oError) {
                      that.getView().setBusy(false);
                      MessageBox.error(
                        "Resubmission failed. Please try again."
                      );
                      console.error("Error during EDIT_RESUBMIT:", oError);
                    },
                  });
                } else {
                  that.getView().setBusy(false);
                }
              }.bind(this),
            }
          );
        },
      }
    );
  }
);
