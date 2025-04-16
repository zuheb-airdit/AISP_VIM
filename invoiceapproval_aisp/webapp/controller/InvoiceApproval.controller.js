sap.ui.define([
    "sap/ui/core/mvc/Controller"
], (Controller) => {
    "use strict";

    return Controller.extend("com.invoiceapproval.invoiceapprovalaisp.controller.InvoiceApproval", {
        onInit() {
            let oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.getRoute("RouteInvoiceApproval").attachPatternMatched(this.attachPatternApp, this);
        },

        attachPatternApp: function(){
            this.byId("smartTable").rebindTable();
            this.byId("smartTableSub").rebindTable();
        },

        onClickInvoice: function (oEvent) {
            debugger;
            // this.byId("smartFilterBar").setVisible(false)
            let reqNmbr = oEvent.getSource().getBindingContext().getObject().REQUEST_NO;
            // this.getOwnerComponent().getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");
            this.getOwnerComponent().getRouter().navTo("InvoiceDetails", {
                id: reqNmbr,
            });
        },

        onIconTabBarSelect: function (oEvent) {
            const sSelectedKey = oEvent.getParameter("key");
        
            if (sSelectedKey === "Pending") {
                const oSmartTable = this.byId("smartTable");
                if (oSmartTable) {
                    oSmartTable.rebindTable();
                }
            } else if (sSelectedKey === "rejected") {
                const oSmartTableSub = this.byId("smartTableSub");
                if (oSmartTableSub) {
                    oSmartTableSub.rebindTable();
                }
            }
        },
    });
});