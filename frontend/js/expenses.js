```javascript
/*
|--------------------------------------------------------------------------
| EXPENSE TRACKER - EXPENSE HISTORY
| File: js/expenses.js
|
| Responsibilities:
| 1. Retrieve expenses from the backend.
| 2. Display all expenses in a table.
| 3. Calculate total expenses.
| 4. Delete an expense through the API.
| 5. Display loading, success and error messages.
|
| Expense data is not stored in localStorage.
|--------------------------------------------------------------------------
*/

document.addEventListener("DOMContentLoaded", function () {

    // --------------------------------------------------
    // 1. GET HTML ELEMENTS
    // --------------------------------------------------

    const totalExpensesElement = document.getElementById("total-expenses");
    const expensesTableBody = document.getElementById("expenses-table-body");
    const expensesTableContainer = document.getElementById("expenses-table-container");
    const expensesLoading = document.getElementById("expenses-loading");
    const expensesEmpty = document.getElementById("expenses-empty");
    const expensesError = document.getElementById("expenses-error");
    const expensesSuccess = document.getElementById("expenses-success");
    const logoutButton = document.getElementById("logout-button");


    // --------------------------------------------------
    // 2. CURRENCY FORMATTER
    // --------------------------------------------------

    const currencyFormatter = new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });


    function formatCurrency(amount) {
        return currencyFormatter.format(Number(amount) || 0);
    }


    // --------------------------------------------------
    // 3. MESSAGE FUNCTIONS
    // --------------------------------------------------

    function showError(message) {
        if (!expensesError) return;

        expensesError.textContent = message;
        expensesError.hidden = false;
    }


    function hideError() {
        if (!expensesError) return;

        expensesError.textContent = "";
        expensesError.hidden = true;
    }


    function showSuccess(message) {
        if (!expensesSuccess) return;

        expensesSuccess.textContent = message;
        expensesSuccess.hidden = false;
    }


    function hideSuccess() {
        if (!expensesSuccess) return;

        expensesSuccess.textContent = "";
        expensesSuccess.hidden = true;
    }


    // --------------------------------------------------
    // 4. DATE FUNCTIONS
    // --------------------------------------------------

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


    // --------------------------------------------------
    // 5. CREATE TABLE CELL
    // --------------------------------------------------

    function createCell(className, text) {
        const cell = document.createElement("td");

        cell.className = className;
        cell.textContent = text;

        return cell;
    }


    // --------------------------------------------------
    // 6. CALCULATE AND DISPLAY TOTAL EXPENSES
    // --------------------------------------------------

    function displayTotalExpenses(expenses) {
        if (!totalExpensesElement) return;

        const total = expenses.reduce(function (sum, expense) {
            const amount = Number(expense.amount);

            return sum + (
                Number.isFinite(amount) ? amount : 0
            );
        }, 0);

        totalExpensesElement.textContent = formatCurrency(total);
    }


    // --------------------------------------------------
    // 7. DISPLAY EXPENSES TABLE
    // --------------------------------------------------

    function displayExpenses(expenses) {
        if (!expensesTableBody) return;

        expensesTableBody.innerHTML = "";

        // Display the empty state when there are no expenses.
        if (expenses.length === 0) {
            if (expensesTableContainer) {
                expensesTableContainer.hidden = true;
            }

            if (expensesEmpty) {
                expensesEmpty.hidden = false;
            }

            return;
        }

        if (expensesEmpty) {
            expensesEmpty.hidden = true;
        }

        if (expensesTableContainer) {
            expensesTableContainer.hidden = false;
        }

        // Sort newest expenses first.
        const sortedExpenses = [...expenses].sort(function (a, b) {
            return getExpenseTimestamp(b) - getExpenseTimestamp(a);
        });

        sortedExpenses.forEach(function (expense) {
            const row = document.createElement("tr");

            // DESCRIPTION
            const descriptionCell = createCell(
                "expense-description",
                expense.description || "Untitled expense"
            );

            // CATEGORY
            const categoryCell = document.createElement("td");

            const categoryBadge = document.createElement("span");

            categoryBadge.className = "category-badge";
            categoryBadge.textContent = expense.category || "Other";

            categoryCell.appendChild(categoryBadge);

            // AMOUNT
            const amountCell = createCell(
                "expense-amount",
                formatCurrency(expense.amount)
            );

            // DATE
            const dateCell = createCell(
                "expense-date",
                formatDate(expense.expenseDate)
            );

            // ACTION
            const actionCell = document.createElement("td");

            const deleteButton = document.createElement("button");

            deleteButton.type = "button";
            deleteButton.className = "delete-button";
            deleteButton.textContent = "Delete";

            // Delete this specific expense.
            deleteButton.addEventListener("click", function () {
                handleDeleteExpense(expense.expenseId, deleteButton);
            });

            actionCell.appendChild(deleteButton);

            // ADD CELLS TO THE ROW.
            row.appendChild(descriptionCell);
            row.appendChild(categoryCell);
            row.appendChild(amountCell);
            row.appendChild(dateCell);
            row.appendChild(actionCell);

            // ADD ROW TO TABLE.
            expensesTableBody.appendChild(row);
        });
    }


    // --------------------------------------------------
    // 8. LOAD EXPENSES FROM BACKEND
    // --------------------------------------------------

    async function loadExpenses() {
        hideError();
        hideSuccess();

        if (expensesLoading) {
            expensesLoading.hidden = false;
            expensesLoading.textContent = "Loading your expenses...";
        }

        if (expensesTableContainer) {
            expensesTableContainer.hidden = true;
        }

        if (expensesEmpty) {
            expensesEmpty.hidden = true;
        }

        try {
            // Check that the API service is available.
            if (
                !window.ExpenseAPI ||
                typeof window.ExpenseAPI.getExpenses !== "function"
            ) {
                throw new Error(
                    "Expense API is unavailable. Check that api.js is loaded correctly."
                );
            }

            // Request expenses from the backend.
            const response = await window.ExpenseAPI.getExpenses();

            if (!response || !Array.isArray(response.expenses)) {
                throw new Error(
                    "The server returned an invalid expenses response."
                );
            }

            const expenses = response.expenses;

            // Display the total and table.
            displayTotalExpenses(expenses);
            displayExpenses(expenses);

            return true;

        } catch (error) {
            console.error("Loading expenses error:", error);

            if (totalExpensesElement) {
                totalExpensesElement.textContent = formatCurrency(0);
            }

            if (expensesLoading) {
                expensesLoading.textContent = "Unable to load your expenses.";
            }

            showError(
                error.message ||
                "Something went wrong while retrieving your expenses."
            );

            return false;

        } finally {
            if (expensesLoading) {
                expensesLoading.hidden = true;
            }
        }
    }


    // --------------------------------------------------
    // 9. DELETE EXPENSE
    // --------------------------------------------------

    async function handleDeleteExpense(expenseId, button) {
        if (!expenseId) {
            showError("This expense does not have a valid expense ID.");
            return;
        }

        // Ask the user to confirm deletion.
        const confirmed = window.confirm(
            "Are you sure you want to delete this expense? This action cannot be undone."
        );

        if (!confirmed) {
            return;
        }

        hideError();
        hideSuccess();

        try {
            button.disabled = true;
            button.textContent = "Deleting...";

            // Check that the API service is available.
            if (
                !window.ExpenseAPI ||
                typeof window.ExpenseAPI.deleteExpense !== "function"
            ) {
                throw new Error(
                    "Expense API is unavailable. Check that api.js is loaded correctly."
                );
            }

            // Send the DELETE request to the backend.
            await window.ExpenseAPI.deleteExpense(expenseId);

            // Reload the list after successful deletion.
            const reloaded = await loadExpenses();

            if (reloaded) {
                showSuccess("Expense deleted successfully.");
            } else {
                showError(
                    "The expense was deleted, but the updated list could not be loaded. Please refresh the page."
                );
            }

        } catch (error) {
            console.error("Delete expense error:", error);

            showError(
                error.message ||
                "Unable to delete this expense. Please try again."
            );

            button.disabled = false;
            button.textContent = "Delete";
        }
    }


    // --------------------------------------------------
    // 10. LOGOUT
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
    // 11. INITIALISE PAGE
    // --------------------------------------------------

    loadExpenses();

    if (logoutButton) {
        logoutButton.addEventListener("click", handleLogout);
    }

});
```