/* =========================================
   EXPENSE TRACKER - API CLIENT
   File: js/api.js

   Talks to the API Gateway HTTP API.
   Sends the Cognito ACCESS token; the backend gets the
   user's id from the token, so the frontend never sends it.

     Api.getExpenses()          -> { expenses: [...], total: number }
     Api.addExpense(expense)    -> created expense
     Api.deleteExpense(id)      -> { message }

   Expense fields: expenseId, amount, category, description,
   expenseDate (YYYY-MM-DD), createdAt
========================================= */

(function () {
    "use strict";

    var baseUrl = String((window.APP_CONFIG || {}).API_BASE_URL || "").replace(/\/+$/, "");

    function isConfigured() {
        return baseUrl !== "" && baseUrl.indexOf("YOUR_") === -1;
    }

    async function request(method, path, body) {
        if (!isConfigured()) {
            throw new Error("The app is not connected to the API yet. Set API_BASE_URL in js/config.js.");
        }

        var token = await Auth.getAccessToken();
        if (!token) {
            await Auth.signOut();
            throw new Error("Your session has expired. Please log in again.");
        }

        var options = {
            method: method,
            headers: { "Authorization": "Bearer " + token }
        };
        if (body !== undefined) {
            options.headers["Content-Type"] = "application/json";
            options.body = JSON.stringify(body);
        }

        var response;
        try {
            response = await fetch(baseUrl + path, options);
        } catch (networkError) {
            throw new Error("Could not reach the server. Check your internet connection and try again.");
        }

        var data = {};
        try { data = await response.json(); } catch (parseError) { data = {}; }

        if (response.status === 401) {
            await Auth.signOut();
            throw new Error("Your session has expired. Please log in again.");
        }

        if (!response.ok) {
            throw new Error(data.message || "Something went wrong. Please try again.");
        }

        return data;
    }

    window.Api = {
        getExpenses: function () {
            return request("GET", "/expenses");
        },
        addExpense: function (expense) {
            return request("POST", "/expenses", {
                amount: expense.amount,
                category: expense.category,
                description: expense.description,
                expenseDate: expense.expenseDate
            });
        },
        deleteExpense: function (expenseId) {
            return request("DELETE", "/expenses/" + encodeURIComponent(expenseId));
        }
    };
})();
