sap.ui.define(["sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/Sorter"
], (Controller, Filter, FilterOperator, Sorter) => {
    "use strict";

    return Controller.extend(
        "com.invoicecreation.invoicecreationaisp.controller.InvoiceCreation",
        {
            onInit() {
                this.getOwnerComponent()
                    .getRouter()
                    .getRoute("RouteInvoiceCreation")
                    .attachPatternMatched(this._onRouteMatched, this);
            },

            _onRouteMatched: function () {
                this.getOwnerComponent()
                    .getModel("appView")
                    .setProperty("/layout", "OneColumn");
                this.byId("smartFilterBar").setVisible(true);
                this.byId("smartTable").rebindTable();
                this.byId("smartTableSub").rebindTable();
            },

            // onClickInvoice: function (oEvent) {
            //     this.byId("smartFilterBar").setVisible(false);
            //     const bindingPath = oEvent.getSource().getBindingContextPath(); // '/VIMDATA(1000000995)'
            //     const entityName = bindingPath.split('(')[0].substring(1);

            //     if (entityName === VIMDATA) {
            //         let reqno = oEvent.getSource().getBindingContext().getObject().Ebeln;

            //         this.getOwnerComponent()
            //             .getModel("appView")
            //             .setProperty("/layout", "TwoColumnsMidExpanded");
            //         this.getOwnerComponent().getRouter().navTo("RouteInvoiceObj", {
            //             reqno: reqno
            //         });
            //     } else if (entityName === ZP_AISP_POVIM_HEAD) {
            //         let poNum = oEvent.getSource().getBindingContext().getObject().Ebeln;
            //         let voNum = oEvent.getSource().getBindingContext().getObject().vbeln;
            //         let status = oEvent.getSource().getBindingContext().getObject().Status;
            //         this.getOwnerComponent()
            //             .getModel("appView")
            //             .setProperty("/layout", "TwoColumnsMidExpanded");
            //         this.getOwnerComponent().getRouter().navTo("RouteInvoiceObj", {
            //             poId: poNum,
            //             vbId: voNum,
            //             status: status,
            //         });
            //     }
            // },

            onClickInvoice: function (oEvent) {
                this.byId("smartFilterBar").setVisible(false);
                const oBindingContext = oEvent.getSource().getBindingContext();

                if (!oBindingContext) {
                    console.error("No binding context found");
                    return;
                }

                const oData = oBindingContext.getObject();
                const bindingPath = oBindingContext.getPath(); // '/VIMDATA(1000000995)'
                const entityName = bindingPath.split('(')[0].substring(1);

                console.log("Navigation Data:", { entityName, data: oData });

                // Handle VIMDATA entity (SUBMITTED tab)
                if (entityName === "VIMDATA") {
                    const reqno = oData.REQUEST_NO;

                    if (!reqno) {
                        console.error("REQUEST_NO not found in VIMDATA");
                        return;
                    }

                    this.getOwnerComponent()
                        .getModel("appView")
                        .setProperty("/layout", "TwoColumnsMidExpanded");

                    this.getOwnerComponent().getRouter().navTo("RouteSubmittedInvoiceObj", {
                        reqno: reqno
                    });

                }
                // Handle ZP_AISP_POVIM_HEAD_Pending entity (OPEN tab)
                else if (entityName === "ZP_AISP_POVIM_HEAD_Pending") {
                    const poNum = oData.Ebeln;
                    const voNum = oData.vbeln;
                    const status = oData.Status;

                    if (!poNum || !voNum) {
                        console.error("Required fields missing in ZP_AISP_POVIM_HEAD_Pending");
                        return;
                    }

                    this.getOwnerComponent()
                        .getModel("appView")
                        .setProperty("/layout", "TwoColumnsMidExpanded");

                    this.getOwnerComponent().getRouter().navTo("RouteInvoiceObj", {
                        poId: poNum,
                        vbId: voNum,
                        status: status || "OPEN" // Default status
                    });

                } else {
                    console.error("Unsupported entity for navigation:", entityName);
                    sap.m.MessageToast.show("Navigation not supported for this item");
                }
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

            amountFormatter: function (amount) {
                debugger;
                if (!amount) return "";
                return `${amount} INR`;
            },

            statusSubStateFormater: function (state) {
                if (state === "Approved") {
                    return "Indication14";
                } else {
                    return "Indication17"; // Default, no special state.
                }
            },

            statusStateFormater: function (state) {
                debugger;
                if (state === "Invoice Rejected") {
                    return "Indication11";
                } else if (state === "Invoice Pending") {
                    return "Indication13";
                } else {
                    return "None"; // Default, no special state.
                }
            },

            statusSubStateFormaterSubmittedText: function (state) {
                debugger;
                if (state === 3) {
                    return "Rejected";
                } else if (state === 4) {
                    return "In-Approval";
                } else if (state === 5) {
                    return "Submitted";
                } else {
                    return "None"; // Default, no special state.
                }
            },

            statusSubStateFormaterSubmitted: function (state) {
                debugger;
                if (state === 3) {
                    return "Indication11";
                } else if (state === 4) {
                    return "Indication15";
                } else if (state === 5) {
                    return "Indication14";
                } else {
                    return "None"; // Default, no special state.
                }
            },

            formatDate: function (sDate) {
                if (!sDate) return "";

                // Convert string to Date object
                const oDate = new Date(sDate);

                // Get parts
                const year = oDate.getFullYear();
                const month = String(oDate.getMonth() + 1).padStart(2, "0"); // Month is 0-based
                const day = String(oDate.getDate()).padStart(2, "0");

                return `${year}-${month}-${day}`; // YYYY-MM-DD
            },

            onBeforeRebindTable: function (oEvent) {
                const oBindingParams = oEvent.getParameter("bindingParams");

                // Debug: Log to check if function is called
                console.log("onBeforeRebindTable called", oBindingParams);

                if (oBindingParams && oBindingParams.filters) {
                    let aFilters = [
                        new Filter("STATUS", FilterOperator.EQ, 3),
                        new Filter("STATUS", FilterOperator.EQ, 4),
                        new Filter("STATUS", FilterOperator.EQ, 5),
                    ];

                    // Create OR filter for STATUS values
                    const oRfqFilter = new Filter({
                        filters: aFilters,
                        and: false // This makes it an OR condition
                    });

                    oBindingParams.filters.push(oRfqFilter);

                    // Add sorter for InvoiceDate (assuming descending order for latest first)
                    if (!oBindingParams.sorter) {
                        oBindingParams.sorter = [];
                    }

                    const oInvoiceDateSorter = new Sorter("REQUEST_NO", true); // false for descending
                    oBindingParams.sorter.push(oInvoiceDateSorter);

                    console.log("Filter added:", oRfqFilter); // Debug
                    console.log("Sorter added:", oInvoiceDateSorter); // Debug
                } else {
                    console.error("BindingParams or filters not available:", oBindingParams); // Debug
                }
            },
        }
    );
});
