/*global QUnit*/

sap.ui.define([
	"com/invoiceapproval/invoiceapprovalaisp/controller/InvoiceApproval.controller"
], function (Controller) {
	"use strict";

	QUnit.module("InvoiceApproval Controller");

	QUnit.test("I should test the InvoiceApproval controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
