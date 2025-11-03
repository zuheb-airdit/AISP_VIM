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
      "com.invoiceapproval.invoiceapprovalaisp.controller.InvoiceDetails",
      {
        onInit() {
          let oRouter = sap.ui.core.UIComponent.getRouterFor(this);
          oRouter
            .getRoute("InvoiceDetails")
            .attachPatternMatched(this._onObjectMatched, this);
          let oModel = this.getOwnerComponent().getModel();
          this.getView().setModel(oModel);
        },

        _onObjectMatched: function (oEvent) {
          debugger;
          let poNum = oEvent.getParameter("arguments").id; // Purchase Order Number (Ebeln)
          this.getOwnerComponent()
            .getModel("appView")
            .setProperty("/layout", "OneColumn");
          let oFilters = [
            new sap.ui.model.Filter(
              "REQUEST_NO",
              sap.ui.model.FilterOperator.EQ,
              poNum
            ),
          ];

          let oModel = this.getView().getModel();

          oModel.read("/VIMDATA", {
            urlParameters: {
              $expand: "TO_VIM_ITEMS,TO_VIM_ATTACHMENTS",
            },
            filters: oFilters,
            success: function (res) {
              debugger;
              let headData = res.results[0] || {};
              let currentTab = headData.Status;
              let oHeadModel = new sap.ui.model.json.JSONModel(headData);
              this.getView().setModel(oHeadModel, "headData");

              // Items Data
              let items =
                (headData.TO_VIM_ITEMS && headData.TO_VIM_ITEMS.results) || [];
              let oItemsModel = new sap.ui.model.json.JSONModel({
                results: items,
              });
              this.getView().setModel(oItemsModel, "tableModel");

              // Attachments Data
              let attachments =
                (headData.TO_VIM_ATTACHMENTS &&
                  headData.TO_VIM_ATTACHMENTS.results) ||
                [];
              let filteredAttachments;
              if (currentTab !== "REJECTED") {
                filteredAttachments = attachments.filter(
                  (a) => a.STATUS === "Pending"
                );
              } else {
                filteredAttachments = attachments;
              }

              let oAttachmentModel = new sap.ui.model.json.JSONModel({
                attachments: filteredAttachments,
              });
              this.getView().setModel(oAttachmentModel, "attachmentsModel");

              this.getView().getModel("objectPagedata").getProperty("/data").push(headData);
              this.getView().getModel("objectPagedata").getProperty("/data").push(items);
            }.bind(this), // <== Important: bind `this` so `this.getView()` works

            error: function (err) {
              debugger;
              sap.m.MessageToast.show("Failed to load PO data.");
            },
          });

          //__________CHATBOT MODEL_______________//
          let chatModel = new JSONModel({
            messages: [
              {
                text: "Hello! I’m your Assistant. How can i help you today?",
                isUserMessage: false,
              }, // Bot
            ],
          });
          let objectPageData = new JSONModel({
            data: [],
          });
          this.getView().setModel(chatModel, "chat");
          this.getView().setModel(objectPageData, "objectPagedata");
        },

        onPreviewPdf: function (oEvent) {
          const imageUrl = oEvent.getSource().data("imageUrl");
          if (!imageUrl) {
            sap.m.MessageToast.show("No file URL available.");
            return;
          }

          const encodedUrl = encodeURIComponent(imageUrl);
          this.getOwnerComponent()
            .getModel("appView")
            .setProperty("/layout", "TwoColumnsMidExpanded");
          this.getOwnerComponent().getRouter().navTo("Invoicepdf", {
            imageUrl: encodedUrl,
          });
        },

        onInvoiceApprove: function () {
          const oView = this.getView();
          const oHeadData = oView.getModel("headData").getData();

          if (!this._oApproveDialog) {
            this._oApproveDialog = sap.ui.xmlfragment(
              "com.invoiceapproval.invoiceapprovalaisp.fragments.ApproveDialog",
              this
            );
            this.getView().addDependent(this._oApproveDialog);
          }
          this._oApproveDialog.open();
        },

        onApproveCommentLiveChange: function (oEvent) {
          const sValue = oEvent.getParameter("value") || "";
          sap.ui
            .getCore()
            .byId("approveCharCounter")
            .setText(`${sValue.length} / 500`);
        },

        onApproveCommentCancel: function () {
          sap.ui.getCore().byId("approveCharCounter").close();
        },

        onApproveCommentSubmit: function () {
          // var sComment = this.byId("approveCommentTextArea").getValue().trim();
          var sComment = sap.ui
            .getCore()
            .byId("approveCommentTextArea")
            .getValue()
            .trim();
          var oView = this.getView();

          if (!sComment) {
            MessageBox.warning("Approval comment is required.");
            return;
          } else {
            // Show confirmation popup
            // sap.m.MessageBox.confirm("Are you sure you want to approve this invoice?", {
            //     title: "Confirm Approval",
            //     actions: [sap.m.MessageBox.Action.OK, sap.m.MessageBox.Action.CANCEL],
            //     onClose: function (oAction) {
            //         if (oAction === sap.m.MessageBox.Action.OK) {
            //             oView.setBusy(true); // 🔄 Start busy indicator

            //             try {
            //                 const oItemModel = oView.getModel("tableModel").getData();
            //                 const aItems = oItemModel?.results || [];

            //                 const oAttachmentsModel = oView.getModel("attachmentsModel").getData();
            //                 const aAttachments = oAttachmentsModel?.attachments || [];

            //                 const payload = {
            //                     action: "APPROVE",
            //                     REQUEST_NO: oHeadData.REQUEST_NO,
            //                     Vimhead: [oHeadData],
            //                     Vimitem: aItems,
            //                     Attachment: aAttachments
            //                 };

            //                 const oModel = oView.getModel(); // OData model

            //                 oModel.create("/PostVimData", payload, {
            //                     success: function (oData) {
            //                         oView.setBusy(false);
            //                         sap.m.MessageBox.success("Invoice approved successfully!", {
            //                             title: "Success",
            //                             onClose: function () {
            //                                 // Optional: navigate or refresh
            //                                 this.getOwnerComponent().getRouter().navTo("RouteInvoiceApproval");
            //                             }.bind(this)
            //                         });
            //                     }.bind(this),
            //                     error: function (oError) {
            //                         oView.setBusy(false);
            //                         sap.m.MessageBox.error("Approval failed. Please try again.", {
            //                             title: "Error"
            //                         });
            //                         console.error("Approval Error:", oError);
            //                     }
            //                 });

            //             } catch (e) {
            //                 oView.setBusy(false);
            //                 sap.m.MessageBox.error("Unexpected error occurred.");
            //                 console.error("Unexpected Error:", e);
            //             }
            //         } else {
            //             // If user clicks Cancel, do nothing
            //             return;
            //         }
            //     }.bind(this)
            // });
            sap.ui.getCore().byId("approveCommentDialog").close();

            oView.setBusy(true); // 🔄 Start busy indicator

            try {
              const oItemModel = oView.getModel("tableModel").getData();
              const aItems = oItemModel?.results || [];

              const oAttachmentsModel = oView
                .getModel("attachmentsModel")
                .getData();
              const aAttachments = oAttachmentsModel?.attachments || [];

              const oHeadData = oView.getModel("headData").getData();

              const payload = {
                action: "APPROVE",
                REQUEST_NO: oHeadData.REQUEST_NO,
                Vimhead: [
                  {
                    ...oHeadData,
                    APPROVED_COMMENT: sComment,
                    SOURCE_TYPE: '02-Portal'
                  },
                ],
                Vimitem: aItems,
                Attachment: aAttachments,
              };

              const oModel = oView.getModel(); // OData model

              oModel.create("/PostVimData", payload, {
                success: function (oData) {
                  oView.setBusy(false);
                  let successMsg =
                    oData.PostVimData || "Invoice approved successfully!";
                  sap.m.MessageBox.success(successMsg, {
                    title: "Success",
                    onClose: function () {
                      // Optional: navigate or refresh
                      this.getOwnerComponent()
                        .getRouter()
                        .navTo("RouteInvoiceApproval");
                    }.bind(this),
                  });
                }.bind(this),
                error: function (oError) {
                  oView.setBusy(false);
                  let errorMsg =
                    oData.PostVimData.error ||
                    "Approval failed. Please try again.";
                  sap.m.MessageBox.error(errorMsg, {
                    title: "Error",
                  });
                  console.error("Approval Error:", oError);
                },
              });
            } catch (e) {
              oView.setBusy(false);
              sap.m.MessageBox.error("Unexpected error occurred.");
              console.error("Unexpected Error:", e);
            }
          }
        },

        onInvoiceReject: function () {
          if (!this._oRejectDialog) {
            this._oRejectDialog = sap.ui.xmlfragment(
              "com.invoiceapproval.invoiceapprovalaisp.fragments.RejectionDialog",
              this
            );
            this.getView().addDependent(this._oRejectDialog);
          }
          this._oRejectDialog.open();
        },

        onConfirmReject: function () {
          const oView = this.getView();
          const oHeadData = oView.getModel("headData").getData();
          const aItems = oView.getModel("tableModel").getData();
          const aAttachments =
            oView.getModel("attachmentsModel").getData() || [];
          const sComment = sap.ui
            .getCore()
            .byId("rejectionComment")
            .getValue()
            .trim();

          if (!sComment) {
            sap.m.MessageBox.warning("Please enter a rejection comment.");
            return;
          }

          oView.setBusy(true); // ✅ Start busy indicator

          const payload = {
            action: "REJECT",
            REQUEST_NO: oHeadData.REQUEST_NO,
            Vimhead: [
              {
                ...oHeadData,
                REJECTED_COMMENT: sComment,
                // SOURCE_TYPE: '02-Portal'
              },
            ],
            Vimitem: aItems?.results || [],
            Attachment: aAttachments.attachments,
          };

          const oModel = oView.getModel();
          oModel.create("/PostVimData", payload, {
            success: function () {
              oView.setBusy(false); // ✅ Stop busy indicator
              if (this._oRejectDialog) {
                this._oRejectDialog.close();
              }
              MessageBox.success("Invoice rejected successfully!", {
                title: "Success",
                onClose: function () {
                  this.getOwnerComponent()
                    .getRouter()
                    .navTo("RouteInvoiceApproval");
                }.bind(this),
              });
            }.bind(this),
            error: function (oError) {
              oView.setBusy(false); // ❌ Stop busy on error too
              if (this._oRejectDialog) {
                this._oRejectDialog.close();
              }
              MessageBox.error("Rejection failed. Please try again.");
              console.error("Rejection Error:", oError);
            }.bind(this),
          });
        },

        onRejectDialogClose: function () {
          this._oRejectDialog.close();
          sap.ui.getCore().byId("rejectionComment").setValue(""); // clear input
        },

        handleClose: function () {
          this.getOwnerComponent().getRouter().navTo("RouteInvoiceApproval");
        },

        isPending: function (sStatus) {
          return sStatus !== "APPROVED" && sStatus !== "REJECTED";
        },

        //CHAT BOT
        openChatbot: function (oEvent) {
          this.loadFragment({
            name: "com.invoiceapproval.invoiceapprovalaisp.fragments.Chatbot",
          }).then((oDialog) => {
            this._oPopOverChatbot = oDialog;
            this._oPopOverChatbot.openBy(oEvent.getSource());
          });
        },
        handleClosePopOver: function (oEvent) {
          this._oPopOverChatbot.close();
        },
        handleOnAfterPopOverClose: function (oEvent) {
          this._oPopOverChatbot.destroy();
          this._oPopOverChatbot = null;
        },
        onSendMessage: async function () {
          var oView = this.getView();
          let oBusyBox = oView.byId("BusyBox");
          var oInput = oView.byId("messageInput");
          var userText = oInput.getValue();

          if (!userText) return;

          // Update chat model with user message
          var oChatModel = oView.getModel("chat");
          var aMessages = oChatModel.getProperty("/messages");
          aMessages.push({ text: userText, isUserMessage: true });
          oChatModel.setProperty("/messages", aMessages);
          oInput.setValue(""); // Clear input

          let aPayload = oView.getModel("objectPagedata").getProperty("/data");
          debugger
          // Call chatbot API
          oBusyBox.setBusy(true);
          var that = this;
          try {
            const response = await fetch(
              "https://summarizer-aisp-agent.cfapps.ap10.hana.ondemand.com/generate_summary/",
              {
                method: "POST",
                headers: {
                  accept: "application/json",
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ Data: [{ d: { results: [aPayload[0]] } }] }),
              }
            );

            if (!response.ok) {
              throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const result = await response.json();
            oBusyBox.setBusy(false);
            let sText;
            if (result) {
              sText = result.summary;
            } else if (response.Error) {
              sText = response.Error;
            }
            that._addBotResponse(sText);
            //console.log("✅ API Response:", result);
            // return result;
          } catch (error) {
            console.error("❌ API Call Failed:", error);
            throw error;
          }
        },

        _addBotResponse: function (botText) {
          var oChatModel = this.getView().getModel("chat");
          var aMessages = oChatModel.getProperty("/messages");

          let formattedText = botText
            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
            .replace(/\n/g, "<br/>");

          aMessages.push({ text: formattedText, isUserMessage: false });
          oChatModel.setProperty("/messages", aMessages);
        },

        formatStatusText: function (sStatus, sApproverRole) {
          if (!sStatus) return "";
          switch (sStatus) {
            case 4: return "InApproval" + (sApproverRole ? " - " + sApproverRole : "");
            case 3: return "Rejected";
            case 5: return "Approved";
            default: return sStatus;
          }
        },

        formatStatusState: function (sStatus) {
          switch (sStatus) {
            case 4: return "Warning";
            case 3: return "Error";
            case 5: return "Success";
            default: return "None";
          }
        }
      }
    );
  }
);
