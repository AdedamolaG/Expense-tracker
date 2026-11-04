```javascript
/*
|--------------------------------------------------------------------------
| EXPENSE TRACKER - DASHBOARD
| File: js/dashboard.js
|
| Responsibilities:
| 1. Display the logged-in user's name.
| 2. Retrieve expenses from the backend API.
| 3. Calculate and display total expenses.
| 4. Display spending by category.
| 5. Display the user's recent expenses.
| 6. Handle logout.
|
| Expense data is retrieved from the backend.
| We do not use localStorage for expense data.
|--------------------------------------------------------------------------
*/

document.addEventListener("DOMContentLoaded", function () {

    // --------------------------------------------------
    // 1. GET HTML ELEMENTS
    // --------------------------------------------------

    const usernameElement = document.getElementById("username");
    const totalExpensesElement = document.getElementById("total-expenses");
    const categoryBreakdownElement = document.getElementById("category-breakdown");
    const recentExpensesElement = document.getElementById("recent-expenses");
    const dashboardErrorElement = document.getElementById("dashboard-error");
    const logoutButton = document.getElementById("logout-button");


    // --------------------------------------------------
    // 2. CONFIGURATION
    // --------------------------------------------------

    const CATEGORIES = [
        "Food",
        "Transport",
        "Bills",
        "Shopping",
        "Entertainment",
        "Other"
    ];

    const currencyFormatter = new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });


    // --------------------------------------------------
    // 3. HELPER FUNCTIONS
    // --------------------------------------------------

    // Format an amount as Nigerian Naira.
    function formatCurrency(amount) {
        return currencyFormatter.format(Number(amount) || 0);
    }


    // Display an error message.
    function showError(message) {
        if (!dashboardErrorElement) return;

        dashboardErrorElement.textContent = message;
        dashboardErrorElement.hidden = false;
    }


    // Hide the error message.
    function hideError() {
        if (!dashboardErrorElement) return;

        dashboardErrorElement.textContent = "";
        dashboardErrorElement.hidden = true;
    }


    // Safely create an HTML element with text.
    function createTextElement(tag, className, text) {
        const element = document.createElement(tag);

        element.className = className;
        element.textContent = text;

        return element;
    }


    // Convert a date into a readable format.
    function formatDate(dateValue) {
        if (!dateValue) {
            return "Date unavailable";
        }

        // Handle date-only values without changing their calendar day.
        const date = /^\d{4}-\d{2}-\d{2}$/.test(dateValue)
            ? new Date(dateValue + "T00:00:00")
            : new Date(dateValue);

        if (Number.isNaN(date.getTime())) {
            return "Date unavailable";
        }

        return date.toLocaleDateString("en-NG", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
    }


    // Get a reliable timestamp for sorting expenses.
    function getExpenseTimestamp(expense) {
        const dateValue = expense.expenseDate || expense.createdAt;

        if (!dateValue) {
            return 0;
        }

        const date = /^\d{4}-\d{2}-\d{2}$/.test(dateValue)
            ? new Date(dateValue + "T00:00:00")
            : new Date(dateValue);

        const timestamp = date.getTime();

        return Number.isNaN(timestamp) ? 0 : timestamp;
    }


    // Calculate the total amount of an expense list.
    function calculateTotal(expenses) {
        return expenses.reduce(function (sum, expense) {
            const amount = Number(expense.amount);

            return sum + (
                Number.isFinite(amount) ? amount : 0
            );
        }, 0);
    }


    // --------------------------------------------------
    // 4. DISPLAY USERNAME
    // --------------------------------------------------

    function displayUsername() {
        if (!usernameElement) return;

        if (typeof window.getCurrentUserName === "function") {
            usernameElement.textContent = window.getCurrentUserName();
        } else {
            usernameElement.textContent = "User";
        }
    }


    // --------------------------------------------------
    // 5. DISPLAY TOTAL EXPENSES
    // --------------------------------------------------

    function displayTotalExpenses(expenses) {
        if (!totalExpensesElement) return;

        const total = calculateTotal(expenses);

        totalExpensesElement.textContent = formatCurrency(total);
    }


    // --------------------------------------------------
    // 6. DISPLAY CATEGORY BREAKDOWN
    // --------------------------------------------------

    function displayCategoryBreakdown(expenses) {
        if (!categoryBreakdownElement) return;

        categoryBreakdownElement.innerHTML = "";

        if (expenses.length === 0) {
            categoryBreakdownElement.appendChild(
                createTextElement(
                    "p",
                    "empty-state",
                    "Your category breakdown will appear here when you add expenses."
                )
            );

            return;
        }

        // Calculate spending for each category.
        const categoryTotals = {};

        CATEGORIES.forEach(function (category) {
            categoryTotals[category] = 0;
        });

        expenses.forEach(function (expense) {
            const category = expense.category;
            const amount = Number(expense.amount);

            if (
                Object.prototype.hasOwnProperty.call(categoryTotals, category) &&
                Number.isFinite(amount)
            ) {
                categoryTotals[category] += amount;
            }
        });

        // Calculate total spending.
        const grandTotal = calculateTotal(expenses);

        // Sort categories from highest spending to lowest.
        const sortedCategories = CATEGORIES
            .map(function (category) {
                return {
                    name: category,
                    amount: categoryTotals[category]
                };
            })
            .filter(function (category) {
                return category.amount > 0;
            })
            .sort(function (a, b) {
                return b.amount - a.amount;
            });

        sortedCategories.forEach(function (category) {
            const percentage = grandTotal > 0
                ? (category.amount / grandTotal) * 100
                : 0;

            const categoryItem = document.createElement("div");
            categoryItem.className = "category-item";

            const categoryInfo = document.createElement("div");
            categoryInfo.className = "category-info";

            const categoryName = createTextElement(
                "span",
                "category-name",
                category.name
            );

            const categoryAmount = createTextElement(
                "span",
                "category-amount",
                formatCurrency(category.amount)
            );

            categoryInfo.appendChild(categoryName);
            categoryInfo.appendChild(categoryAmount);

            const progressTrack = document.createElement("div");
            progressTrack.className = "progress-track";

            const progressBar = document.createElement("div");
            progressBar.className = "progress-bar";

            progressBar.style.width = percentage + "%";

            progressTrack.appendChild(progressBar);

            const percentageText = createTextElement(
                "span",
                "category-percentage",
                percentage.toFixed(1) + "%"
            );

            categoryItem.appendChild(categoryInfo);
            categoryItem.appendChild(progressTrack);
            categoryItem.appendChild(percentageText);

            categoryBreakdownElement.appendChild(categoryItem);
        });
    }


    // --------------------------------------------------
    // 7. DISPLAY RECENT EXPENSES
    // --------------------------------------------------

    function displayRecentExpenses(expenses) {
        if (!recentExpensesElement) return;

        recentExpensesElement.innerHTML = "";

        if (expenses.length === 0) {
            recentExpensesElement.appendChild(
                createTextElement(
                    "p",
                    "empty-state",
                    "You haven't added any expenses yet."
                )
            );

            return;
        }

        // Sort expenses by expense date, newest first.
        const sortedExpenses = [...expenses].sort(function (a, b) {
            return getExpenseTimestamp(b) - getExpenseTimestamp(a);
        });

        // Display only the latest five expenses.
        const recentExpenses = sortedExpenses.slice(0, 5);

        recentExpenses.forEach(function (expense) {
            const expenseItem = document.createElement("div");
            expenseItem.className = "recent-expense-item";

            const expenseDetails = document.createElement("div");
            expenseDetails.className = "recent-expense-details";

            const description = createTextElement(
                "h3",
                "expense-description",
                expense.description || "Untitled expense"
            );

            const categoryAndDate = createTextElement(
                "p",
                "expense-category-date",
                (expense.category || "Other") +
                " · " +
                formatDate(expense.expenseDate)
            );

            expenseDetails.appendChild(description);
            expenseDetails.appendChild(categoryAndDate);

            const amount = createTextElement(
                "span",
                "recent-expense-amount",
                formatCurrency(expense.amount)
            );

            expenseItem.appendChild(expenseDetails);
            expenseItem.appendChild(amount);

            recentExpensesElement.appendChild(expenseItem);
        });
    }


    // --------------------------------------------------
    // 8. LOAD EXPENSES FROM BACKEND
    // --------------------------------------------------

    async function loadDashboard() {
        hideError();

        try {
            // Show loading messages.
            if (totalExpensesElement) {
                totalExpensesElement.textContent = "Loading...";
            }

            if (categoryBreakdownElement) {
                categoryBreakdownElement.textContent = "Loading...";
            }

            if (recentExpensesElement) {
                recentExpensesElement.textContent = "Loading...";
            }

            // Check that the API service is available.
            if (
                !window.ExpenseAPI ||
                typeof window.ExpenseAPI.getExpenses !== "function"
            ) {
                throw new Error(
                    "Expense API is unavailable. Check that api.js is loaded correctly."
                );
            }

            // Retrieve expenses using our API wrapper.
            const response = await window.ExpenseAPI.getExpenses();

            if (!response || !Array.isArray(response.expenses)) {
                throw new Error(
                    "The server returned an invalid expenses response."
                );
            }

            const expenses = response.expenses;

            // Display the retrieved information.
            displayTotalExpenses(expenses);
            displayCategoryBreakdown(expenses);
            displayRecentExpenses(expenses);

        } catch (error) {
            console.error("Dashboard loading error:", error);

            if (totalExpensesElement) {
                totalExpensesElement.textContent = formatCurrency(0);
            }

            if (categoryBreakdownElement) {
                categoryBreakdownElement.textContent =
                    "Unable to load category breakdown.";
            }

            if (recentExpensesElement) {
                recentExpensesElement.textContent =
                    "Unable to load recent expenses.";
            }

            showError(
                error.message ||
                "Something went wrong while loading your dashboard. Please try again."
            );
        }
    }


    // --------------------------------------------------
    // 9. LOGOUT
    // --------------------------------------------------

    function handleLogout() {
        if (typeof window.logoutUser === "function") {
            window.logoutUser();
        } else {
            showError(
                "Logout is currently unavailable. Please refresh the page."
            );
        }
    }


    // --------------------------------------------------
    // 10. START DASHBOARD
    // --------------------------------------------------

    displayUsername();

    loadDashboard();

    // Attach logout event.
    if (logoutButton) {
        logoutButton.addEventListener("click", handleLogout);
    }

});
```