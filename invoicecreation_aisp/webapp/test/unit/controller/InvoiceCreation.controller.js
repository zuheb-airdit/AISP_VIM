/*global QUnit*/

sap.ui.define([
	"com/invoicecreation/invoicecreationaisp/controller/InvoiceCreation.controller"
], function (Controller) {
	"use strict";

	QUnit.module("InvoiceCreation Controller");

	QUnit.test("I should test the InvoiceCreation controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
