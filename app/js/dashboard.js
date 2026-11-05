/* =========================================
   EXPENSE TRACKER - DASHBOARD
   File: js/dashboard.js

   Total, spending by category and the 5 most recent
   expenses, all loaded from the API.
========================================= */

(function () {
    "use strict";

    var COLORS = {
        Food: "#f59e0b",
        Transport: "#2563eb",
        Bills: "#dc2626",
        Shopping: "#8b5cf6",
        Entertainment: "#ec4899",
        Other: "#64748b"
    };

    function byId(id) { return document.getElementById(id); }

    function renderCategories(expenses, total) {
        var list = byId("category-list");
        var empty = byId("category-empty-state");
        list.querySelectorAll(".category-item").forEach(function (el) { el.remove(); });

        var totals = {};
        expenses.forEach(function (expense) {
            totals[expense.category] = (totals[expense.category] || 0) + Number(expense.amount);
        });

        var names = Object.keys(totals).sort(function (a, b) { return totals[b] - totals[a]; });
        empty.classList.toggle("hidden", names.length > 0);

        names.forEach(function (name) {
            var percent = total > 0 ? Math.round((totals[name] / total) * 100) : 0;
            var color = COLORS[name] || COLORS.Other;

            var item = document.createElement("div");
            item.className = "category-item";

            var info = document.createElement("div");
            info.className = "category-info";

            var label = document.createElement("span");
            label.className = "category-name";
            var dot = document.createElement("span");
            dot.className = "category-color";
            dot.style.backgroundColor = color;
            label.appendChild(dot);
            label.appendChild(document.createTextNode(name));

            var amount = document.createElement("span");
            amount.className = "category-amount";
            amount.textContent = Layout.formatMoney(totals[name]) + " (" + percent + "%)";

            info.appendChild(label);
            info.appendChild(amount);

            var track = document.createElement("div");
            track.className = "category-progress";
            var bar = document.createElement("div");
            bar.className = "category-progress-bar";
            bar.style.width = percent + "%";
            bar.style.backgroundColor = color;
            track.appendChild(bar);

            item.appendChild(info);
            item.appendChild(track);
            list.appendChild(item);
        });
    }

    function renderRecent(expenses) {
        var body = byId("recent-expenses-body");
        var emptyState = byId("expense-empty-state");
        var tableWrap = document.querySelector(".table-responsive");
        body.innerHTML = "";

        var hasExpenses = expenses.length > 0;
        emptyState.style.display = hasExpenses ? "none" : "block";
        tableWrap.classList.toggle("hidden", !hasExpenses);

        // API already returns newest first
        expenses.slice(0, 5).forEach(function (expense) {
            var row = document.createElement("tr");

            var cells = [
                Layout.formatDate(expense.expenseDate),
                expense.description
            ];
            cells.forEach(function (text) {
                var td = document.createElement("td");
                td.textContent = text;
                row.appendChild(td);
            });

            var categoryCell = document.createElement("td");
            var badge = document.createElement("span");
            badge.className = "category-badge";
            badge.textContent = expense.category;
            categoryCell.appendChild(badge);
            row.appendChild(categoryCell);

            var amountCell = document.createElement("td");
            amountCell.className = "expense-amount";
            amountCell.textContent = Layout.formatMoney(expense.amount);
            row.appendChild(amountCell);

            body.appendChild(row);
        });
    }

    async function load() {
        Layout.clearError();
        try {
            var data = await Api.getExpenses();
            var expenses = data.expenses || [];
            var total = Number(data.total) || 0;

            byId("total-expenses").textContent = Layout.formatMoney(total);
            renderCategories(expenses, total);
            renderRecent(expenses);
        } catch (error) {
            Layout.showError(error.message);
            byId("expense-empty-state").style.display = "none";
        }
    }

    document.addEventListener("DOMContentLoaded", async function () {
        if (!(await Auth.requireAuth())) { return; }
        Layout.init({ openClass: "open", overlayClass: "show" });
        load();
    });
})();
