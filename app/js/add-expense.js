/* =========================================
   EXPENSE TRACKER - ADD EXPENSE
   File: js/add-expense.js

   Validation mirrors the Lambda (amount > 0, category from
   the list, description <= 100 chars, date YYYY-MM-DD).
========================================= */

(function () {
    "use strict";

    var CATEGORIES = ["Food", "Transport", "Bills", "Shopping", "Entertainment", "Other"];
    var MAX_DESCRIPTION = 100;

    function byId(id) { return document.getElementById(id); }

    var form = byId("expense-form");
    var message = byId("form-message");
    var saveBtn = byId("save-expense-btn");
    var descriptionInput = byId("description");
    var amountInput = byId("amount");
    var categoryInput = byId("category");
    var dateInput = byId("expense-date");

    function showMessage(type, text) {
        message.className = "form-message " + type;
        message.textContent = text;
        message.hidden = false;
    }

    function todayIso() {
        var now = new Date();
        var month = String(now.getMonth() + 1).padStart(2, "0");
        var day = String(now.getDate()).padStart(2, "0");
        return now.getFullYear() + "-" + month + "-" + day;
    }

    function validate() {
        var description = descriptionInput.value.trim();
        var amount = Number(amountInput.value);

        if (!description) { return "Description is required."; }
        if (description.length > MAX_DESCRIPTION) {
            return "Description must be " + MAX_DESCRIPTION + " characters or fewer.";
        }
        if (!amountInput.value || !isFinite(amount) || amount <= 0) {
            return "Amount must be greater than zero.";
        }
        if (CATEGORIES.indexOf(categoryInput.value) === -1) { return "Please choose a category."; }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateInput.value)) { return "Please choose the expense date."; }
        return "";
    }

    async function onSubmit(event) {
        event.preventDefault();
        message.hidden = true;

        var problem = validate();
        if (problem) { showMessage("error", problem); return; }

        saveBtn.disabled = true;
        saveBtn.textContent = "Saving...";

        try {
            await Api.addExpense({
                amount: Number(amountInput.value),
                category: categoryInput.value,
                description: descriptionInput.value.trim(),
                expenseDate: dateInput.value
            });
            showMessage("success", "Expense saved. Taking you to your expense history...");
            setTimeout(function () { window.location.href = "expenses.html"; }, 900);
        } catch (error) {
            showMessage("error", error.message);
            saveBtn.disabled = false;
            saveBtn.textContent = "Save Expense";
        }
    }

    document.addEventListener("DOMContentLoaded", async function () {
        if (!(await Auth.requireAuth())) { return; }
        Layout.init({ openClass: "active", overlayClass: "active" });
        dateInput.value = todayIso();
        form.addEventListener("submit", onSubmit);
    });
})();
