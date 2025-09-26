sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/Sorter"
], (Controller, Filter, FilterOperator, Sorter) => {
    "use strict";

    return Controller.extend("com.invoiceapproval.invoiceapprovalaisp.controller.InvoiceApproval", {
        onInit() {
            let oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.getRoute("RouteInvoiceApproval").attachPatternMatched(this.attachPatternApp, this);
        },

        attachPatternApp: function () {
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

        onBeforeRebindTable: function (oEvent) {
            const oSource = oEvent.getSource();
            const tableID = oSource.getId();
            const oBindingParams = oEvent.getParameter("bindingParams");
            let aFilters = [];

            // Get the actual created IDs
            const smartTableId = this.createId('smartTable');
            const smartTableSubId = this.createId('smartTableSub');
            const smartTableSubApprovedId = this.createId('smartTableSubApproved');

            console.log("Table ID:", tableID, "Created IDs:", {
                smartTableId,
                smartTableSubId,
                smartTableSubApprovedId
            });

            switch (tableID) {
                case smartTableId: // Pending
                    aFilters = [
                        new Filter("STATUS", FilterOperator.EQ, 4),
                    ];
                    break;

                case smartTableSubId: // Rejected tab 
                    aFilters = [
                        new Filter("STATUS", FilterOperator.EQ, 3)
                    ];
                    break;

                case smartTableSubApprovedId: // Approved tab
                    aFilters = [
                        new Filter("STATUS", FilterOperator.EQ, 5)
                    ];
                    break;

                default:
                    console.log("Unknown table ID:", tableID);
                    break;
            }

            if (oBindingParams && oBindingParams.filters && aFilters.length > 0) {

                // For single filter, don't use OR condition wrapper
                let oRfqFilter;
                if (aFilters.length === 1) {
                    oRfqFilter = aFilters[0]; // Use the filter directly
                } else {
                    // For multiple filters, create OR condition
                    oRfqFilter = new Filter({
                        filters: aFilters,
                        and: false // OR condition
                    });
                }

                // Push the filter to existing filters array
                oBindingParams.filters.push(oRfqFilter);

                // Add sorter for REQUEST_NO (descending - latest first)
                if (!oBindingParams.sorter) {
                    oBindingParams.sorter = [];
                }

                const oRequestNoSorter = new Sorter("REQUEST_NO", true);
                oBindingParams.sorter.push(oRequestNoSorter);

                console.log("Filter added for table:", tableID, oRfqFilter);
                console.log("Sorter added for REQUEST_NO (descending)");

            } else {
                console.error("BindingParams not available or no filters defined:", oBindingParams);
            }
        },

        statusFormatterPendingText: function (state, approverRole) {
            if (state === 3) {
                return "Rejected";
            } else if (state === 4) {
                return `In-Approval ${approverRole}`;
            } else if (state === 5) {
                return "Approved";
            } else {
                return "None"; // Default, no special state.
            }
        },

        statusFormatterText: function (state) {
            if (state === 3) {
                return "Rejected";
            } else if (state === 4) {
                return "Pending";
            } else if (state === 5) {
                return "Approved";
            } else {
                return "None"; // Default, no special state.
            }
        },

        statusFormatterState: function (state) {
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
    });
});