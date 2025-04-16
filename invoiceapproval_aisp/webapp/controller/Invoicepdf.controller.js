sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("com.invoiceapproval.invoiceapprovalaisp.controller.Invoicepdf", {
        onInit: function () {
            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("Invoicepdf").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function (oEvent) {
            const imageUrl = decodeURIComponent(oEvent.getParameter("arguments").imageUrl);
            if (imageUrl) {
                document.getElementById("pdfFrame").src = imageUrl;
            } else {
                sap.m.MessageToast.show("PDF URL not provided.");
            }
        },

        onClosePreview:function(){
            history.go(-1);
        }
    });
});
