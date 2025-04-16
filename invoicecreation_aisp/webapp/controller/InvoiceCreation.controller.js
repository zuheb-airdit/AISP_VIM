sap.ui.define([
    "sap/ui/core/mvc/Controller"
], (Controller) => {
    "use strict";

    return Controller.extend("com.invoicecreation.invoicecreationaisp.controller.InvoiceCreation", {
        onInit() {
            this.getOwnerComponent()
            .getRouter()
            .getRoute("RouteInvoiceCreation")
            .attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
            this.getOwnerComponent().getModel("appView").setProperty("/layout", "OneColumn");
            this.byId("smartFilterBar").setVisible(true)
            this.byId("smartTable").rebindTable();
            this.byId("smartTableSub").rebindTable();
        },

        onClickInvoice: function (oEvent) {
            this.byId("smartFilterBar").setVisible(false)
            let poNum = oEvent.getSource().getBindingContext().getObject().Ebeln;
            let voNum = oEvent.getSource().getBindingContext().getObject().vbeln;
            let status = oEvent.getSource().getBindingContext().getObject().Status;
            this.getOwnerComponent().getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");
            this.getOwnerComponent().getRouter().navTo("RouteInvoiceObj", {
                poId: poNum,
                vbId:voNum,
                status:status
            });
        },

        onIconTabBarSelect: function (oEvent) {
            const sSelectedKey = oEvent.getParameter("key");
        
            if (sSelectedKey === "open") {
                const oSmartTable = this.byId("smartTable");
                if (oSmartTable) {
                    oSmartTable.rebindTable();
                }
            } else if (sSelectedKey === "attachments") {
                const oSmartTableSub = this.byId("smartTableSub");
                if (oSmartTableSub) {
                    oSmartTableSub.rebindTable();
                }
            }
        },
        

        amountFormatter: function(amount) {
            debugger;
            if (!amount) return ""; 
                return `${amount} INR`;
        },

        statusSubStateFormater: function(state){
            if (state === "Approved") {
                return "Indication14";
            } else {
                return "Indication17";     // Default, no special state.
            }        },

        statusStateFormater: function(state) {
            debugger;            
            if (state === "Invoice Rejected") {
                return "Indication11";
            } else if (state === "Invoice Pending") {
                return "Indication13";
            } else {
                return "None";     // Default, no special state.
            }
        }
        

    });
});