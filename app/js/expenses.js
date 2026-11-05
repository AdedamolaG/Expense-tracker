/* =========================================
   EXPENSE TRACKER - EXPENSE HISTORY
   File: js/expenses.js

   Lists all expenses from the API (newest first)
   and lets the user delete one.
========================================= */

(function () {
    "use strict";

    function byId(id) { return document.getElementById(id); }

    var body = byId("expenses-table-body");
    var table = document.querySelector(".expenses-table");
    var emptyState = byId("empty-state");

    function render(expenses) {
        body.innerHTML = "";
        var hasExpenses = expenses.length > 0;
        emptyState.hidden = hasExpenses;
        table.classList.toggle("hidden", !hasExpenses);

        expenses.forEach(function (expense) {
            var row = document.createElement("tr");

            var description = document.createElement("td");
            description.className = "expense-description";
            description.textContent = expense.description;

            var categoryCell = document.createElement("td");
            var badge = document.createElement("span");
            badge.className = "category-badge";
            badge.textContent = expense.category;
            categoryCell.appendChild(badge);

            var date = document.createElement("td");
            date.className = "expense-date";
            date.textContent = Layout.formatDate(expense.expenseDate);

            var amount = document.createElement("td");
            amount.className = "expense-amount";
            amount.textContent = Layout.formatMoney(expense.amount);

            var action = document.createElement("td");
            var button = document.createElement("button");
            button.type = "button";
            button.className = "delete-expense-btn";
            button.textContent = "Delete";
            button.addEventListener("click", function () { remove(expense, button); });
            action.appendChild(button);

            [description, categoryCell, date, amount, action].forEach(function (td) {
                row.appendChild(td);
            });
            body.appendChild(row);
        });
    }

    async function load() {
        Layout.clearError();
        try {
            var data = await Api.getExpenses();
            byId("total-expenses").textContent = Layout.formatMoney(data.total);
            render(data.expenses || []);
        } catch (error) {
            Layout.showError(error.message);
        }
    }

    async function remove(expense, button) {
        var ok = window.confirm('Delete "' + expense.description + '"? This cannot be undone.');
        if (!ok) { return; }

        Layout.clearError();
        button.disabled = true;
        try {
            await Api.deleteExpense(expense.expenseId);
            await load();
        } catch (error) {
            Layout.showError(error.message);
            button.disabled = false;
        }
    }

    document.addEventListener("DOMContentLoaded", async function () {
        if (!(await Auth.requireAuth())) { return; }
        Layout.init({ openClass: "active", overlayClass: "active" });
        load();
    });
})();
