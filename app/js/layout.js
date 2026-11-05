/* =========================================
   EXPENSE TRACKER - SHARED APP LAYOUT
   File: js/layout.js

   Used by dashboard, add-expense and expenses pages:
   sidebar toggle, user name/avatar, today's date, year, logout.

   Layout.init({ openClass, overlayClass })
   Layout.formatMoney(n), Layout.formatDate("YYYY-MM-DD")
   Layout.showError(msg), Layout.clearError()
========================================= */

(function () {
    "use strict";

    function byId(id) { return document.getElementById(id); }

    function formatMoney(value) {
        var number = Number(value) || 0;
        return "₦" + number.toLocaleString("en-NG", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    // expenseDate is YYYY-MM-DD; build the date locally so it never shifts a day
    function formatDate(isoDate) {
        var parts = String(isoDate || "").split("-");
        if (parts.length !== 3) { return isoDate || ""; }
        var date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    }

    function showError(message) {
        var box = byId("page-alert");
        if (!box) { return; }
        box.textContent = message;
        box.classList.remove("hidden");
    }

    function clearError() {
        var box = byId("page-alert");
        if (!box) { return; }
        box.textContent = "";
        box.classList.add("hidden");
    }

    function init(options) {
        var openClass = (options && options.openClass) || "active";
        var overlayClass = (options && options.overlayClass) || "active";

        var user = Auth.getCurrentUser() || {};
        var name = user.name || (user.email ? user.email.split("@")[0] : "User");
        var initial = name.charAt(0).toUpperCase() || "U";

        [["sidebar-user-name", name], ["sidebar-user-avatar", initial],
         ["topbar-avatar", initial], ["welcome-name", name.split(" ")[0]]
        ].forEach(function (pair) {
            var el = byId(pair[0]);
            if (el) { el.textContent = pair[1]; }
        });

        var dateEl = byId("current-date");
        if (dateEl) {
            dateEl.textContent = new Date().toLocaleDateString("en-GB", {
                weekday: "short", day: "numeric", month: "short", year: "numeric"
            });
        }

        var yearEl = byId("current-year");
        if (yearEl) { yearEl.textContent = new Date().getFullYear(); }

        var sidebar = byId("sidebar");
        var overlay = byId("sidebar-overlay");
        function openSidebar() {
            sidebar.classList.add(openClass);
            if (overlay) { overlay.classList.add(overlayClass); }
        }
        function closeSidebar() {
            sidebar.classList.remove(openClass);
            if (overlay) { overlay.classList.remove(overlayClass); }
        }
        if (sidebar) {
            var toggle = byId("menu-toggle");
            var close = byId("sidebar-close");
            if (toggle) { toggle.addEventListener("click", openSidebar); }
            if (close) { close.addEventListener("click", closeSidebar); }
            if (overlay) { overlay.addEventListener("click", closeSidebar); }
        }

        var logout = byId("logout-btn");
        if (logout) {
            logout.addEventListener("click", function () { Auth.signOut(); });
        }
    }

    window.Layout = {
        init: init,
        formatMoney: formatMoney,
        formatDate: formatDate,
        showError: showError,
        clearError: clearError
    };
})();
