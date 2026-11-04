// ```javascript
/*
|--------------------------------------------------------------------------
| EXPENSE TRACKER - API SERVICE
| File: js/api.js
|
| Purpose:
| Communicate with the AWS API Gateway backend.
|
| Available operations:
| 1. Get all expenses
| 2. Create a new expense
| 3. Delete an existing expense
|--------------------------------------------------------------------------
*/

(function () {
    "use strict";

    // Get the application configuration.
    const config = window.APP_CONFIG;

    // Categories accepted by the application.
    const ALLOWED_CATEGORIES = [
        "Food",
        "Transport",
        "Bills",
        "Shopping",
        "Entertainment",
        "Other"
    ];

    // Custom error class for API errors.
    class ApiError extends Error {
        constructor(message, status, details = null) {
            super(message);

            this.name = "ApiError";
            this.status = status;
            this.details = details;
        }
    }

    // Make sure the API URL has been configured.
    function validateApiConfig() {
        if (!config) {
            throw new Error(
                "Application configuration was not found. Check config.js."
            );
        }

        if (
            !config.API_BASE_URL ||
            config.API_BASE_URL.includes("REPLACE")
        ) {
            throw new Error(
                "API_BASE_URL has not been configured yet."
            );
        }
    }

    // Get the backend API base URL.
    function getApiBaseUrl() {
        validateApiConfig();

        return config.API_BASE_URL.replace(/\/+$/, "");
    }

    // Handle an expired or invalid authentication session.
    function handleUnauthorized() {
        // Clear the stored application tokens.
        const tokenKeys = [
            "expenseTrackerAccessToken",
            "expenseTrackerIdToken",
            "expenseTrackerRefreshToken",
            "expenseTrackerTokenExpiry"
        ];

        tokenKeys.forEach(function (key) {
            sessionStorage.removeItem(key);
        });

        // Send the user through Cognito authentication again.
        if (typeof window.loginWithHostedUI === "function") {
            window.loginWithHostedUI();
        } else {
            window.location.replace("index.html");
        }
    }

    // Get the current user's Cognito access token.
    function getAuthenticationToken() {
        if (typeof window.getAccessToken !== "function") {
            throw new Error(
                "Authentication service is unavailable. Check auth.js."
            );
        }

        const token = window.getAccessToken();

        if (!token) {
            handleUnauthorized();

            throw new ApiError(
                "Your session has expired. Please log in again.",
                401
            );
        }

        return token;
    }

    // Read an API response safely.
    async function readResponse(response) {
        const responseText = await response.text();

        if (!responseText) {
            return null;
        }

        try {
            return JSON.parse(responseText);
        } catch (error) {
            return {
                message: responseText
            };
        }
    }

    // Extract a useful error message from the backend response.
    function getErrorMessage(data, status) {
        if (data && typeof data === "object") {
            if (data.message) {
                return data.message;
            }

            if (data.error) {
                return data.error;
            }
        }

        return `The request failed with status ${status}. Please try again.`;
    }

    // Common function used to communicate with the backend.
    async function apiRequest(endpoint, options = {}) {
        const token = getAuthenticationToken();

        const url = `${getApiBaseUrl()}${endpoint}`;

        const headers = {
            "Authorization": `Bearer ${token}`,
            ...options.headers
        };

        // Add JSON content type when sending a request body.
        if (options.body && !headers["Content-Type"]) {
            headers["Content-Type"] = "application/json";
        }

        let response;

        try {
            response = await fetch(url, {
                ...options,
                headers: headers
            });
        } catch (error) {
            console.error("Network error:", error);

            throw new ApiError(
                "Unable to connect to the server. Check your internet connection or try again later.",
                0
            );
        }

        const responseData = await readResponse(response);

        // Handle expired or invalid authentication.
        if (response.status === 401) {
            handleUnauthorized();

            throw new ApiError(
                "Your session is no longer valid. Please log in again.",
                401,
                responseData
            );
        }

        // Handle other unsuccessful responses.
        if (!response.ok) {
            throw new ApiError(
                getErrorMessage(responseData, response.status),
                response.status,
                responseData
            );
        }

        return responseData;
    }

    /*
    |--------------------------------------------------------------------------
    | 1. GET ALL EXPENSES
    | Endpoint: GET /expenses
    |
    | Expected response:
    | {
    |     "expenses": [
    |         {
    |             "expenseId": "expense-001",
    |             "amount": 12500,
    |             "category": "Food",
    |             "description": "Groceries",
    |             "expenseDate": "2026-11-02",
    |             "createdAt": "2026-11-02T10:30:00Z"
    |         }
    |     ],
    |     "total": 12500
    | }
    |--------------------------------------------------------------------------
    */

    async function getExpenses() {
        const data = await apiRequest("/expenses", {
            method: "GET"
        });

        if (
            !data ||
            !Array.isArray(data.expenses) ||
            typeof data.total !== "number"
        ) {
            throw new ApiError(
                "The server returned an unexpected expenses response.",
                200,
                data
            );
        }

        return {
            expenses: data.expenses,
            total: data.total
        };
    }

    /*
    |--------------------------------------------------------------------------
    | 2. CREATE A NEW EXPENSE
    | Endpoint: POST /expenses
    |
    | Expected request body:
    | {
    |     "amount": 5000,
    |     "category": "Food",
    |     "description": "Lunch",
    |     "expenseDate": "2026-11-04"
    | }
    |
    | The backend generates:
    | - expenseId
    | - createdAt
    | - userId (from the verified Cognito token)
    |--------------------------------------------------------------------------
    */

    async function createExpense(expense) {
        // Check that an expense object was provided.
        if (!expense || typeof expense !== "object") {
            throw new Error("Please provide valid expense details.");
        }

        const amount = Number(expense.amount);

        const description =
            typeof expense.description === "string"
                ? expense.description.trim()
                : "";

        const category = expense.category;
        const expenseDate = expense.expenseDate;

        // Validate the amount.
        if (!Number.isFinite(amount) || amount <= 0) {
            throw new Error(
                "Enter a valid expense amount greater than zero."
            );
        }

        // Validate the description.
        if (!description) {
            throw new Error("Expense description is required.");
        }

        // Validate the category.
        if (!ALLOWED_CATEGORIES.includes(category)) {
            throw new Error("Please select a valid expense category.");
        }

        // Validate the date format.
        if (
            typeof expenseDate !== "string" ||
            !/^\d{4}-\d{2}-\d{2}$/.test(expenseDate)
        ) {
            throw new Error("Please provide a valid expense date.");
        }

        // Validate that the date actually exists.
        const parsedDate = new Date(`${expenseDate}T00:00:00Z`);

        if (
            Number.isNaN(parsedDate.getTime()) ||
            parsedDate.toISOString().slice(0, 10) !== expenseDate
        ) {
            throw new Error("Please provide a valid calendar date.");
        }

        // Only send the four fields required by the backend.
        // Never send userId, expenseId or createdAt from the frontend.
        const requestBody = {
            amount: amount,
            category: category,
            description: description,
            expenseDate: expenseDate
        };

        return await apiRequest("/expenses", {
            method: "POST",
            body: JSON.stringify(requestBody)
        });
    }

    /*
    |--------------------------------------------------------------------------
    | 3. DELETE AN EXPENSE
    | Endpoint: DELETE /expenses/{expenseId}
    |--------------------------------------------------------------------------
    */

    async function deleteExpense(expenseId) {
        if (
            typeof expenseId !== "string" ||
            !expenseId.trim()
        ) {
            throw new Error("A valid expense ID is required.");
        }

        const encodedExpenseId = encodeURIComponent(expenseId);

        return await apiRequest(
            `/expenses/${encodedExpenseId}`,
            {
                method: "DELETE"
            }
        );
    }

    // Make the API functions available to other JavaScript files.
    window.ExpenseAPI = {
        getExpenses: getExpenses,
        createExpense: createExpense,
        deleteExpense: deleteExpense
    };

})();
