// ```javascript
/*
|--------------------------------------------------------------------------
| EXPENSE TRACKER - ADD EXPENSE
| File: js/add-expense.js
|
| Responsibilities:
| 1. Get expense details from the form.
| 2. Validate the submitted information.
| 3. Send the new expense to the backend API.
| 4. Display success and error messages.
| 5. Redirect the user to Expense History after saving.
| 6. Handle logout.
|
| Expense data is saved through the backend API.
| We do not use localStorage.
|--------------------------------------------------------------------------
*/

document.addEventListener("DOMContentLoaded", function () {

    // --------------------------------------------------
    // 1. GET HTML ELEMENTS
    // --------------------------------------------------

    const expenseForm = document.getElementById("expense-form");

    const descriptionInput = document.getElementById("description");
    const amountInput = document.getElementById("amount");
    const categoryInput = document.getElementById("category");
    const expenseDateInput = document.getElementById("expense-date");

    const errorMessage = document.getElementById("form-error");
    const successMessage = document.getElementById("form-success");

    const submitButton = document.getElementById("submit-button");
    const logoutButton = document.getElementById("logout-button");


    // --------------------------------------------------
    // 2. CONFIGURATION
    // --------------------------------------------------

    // The categories accepted by the application.
    const allowedCategories = [
        "Food",
        "Transport",
        "Bills",
        "Shopping",
        "Entertainment",
        "Other"
    ];


    // --------------------------------------------------
    // 3. DATE FUNCTIONS
    // --------------------------------------------------

    // Get today's date in YYYY-MM-DD format using local time.
    function getTodayDate() {
        const today = new Date();

        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const day = String(today.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }


    // Set the date field to today's local date.
    function setTodayAsDefaultDate() {
        if (expenseDateInput) {
            expenseDateInput.value = getTodayDate();
        }
    }


    // Check that the entered date is a real calendar date.
    function isValidDate(dateString) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            return false;
        }

        const [year, month, day] = dateString.split("-").map(Number);

        const date = new Date(year, month - 1, day);

        return (
            date.getFullYear() === year &&
            date.getMonth() === month - 1 &&
            date.getDate() === day
        );
    }


    // --------------------------------------------------
    // 4. MESSAGE FUNCTIONS
    // --------------------------------------------------

    // Display an error message.
    function showError(message) {
        if (errorMessage) {
            errorMessage.textContent = message;
            errorMessage.hidden = false;
        }

        if (successMessage) {
            successMessage.textContent = "";
            successMessage.hidden = true;
        }
    }


    // Display a success message.
    function showSuccess(message) {
        if (successMessage) {
            successMessage.textContent = message;
            successMessage.hidden = false;
        }

        if (errorMessage) {
            errorMessage.textContent = "";
            errorMessage.hidden = true;
        }
    }


    // Hide both messages.
    function clearMessages() {
        if (errorMessage) {
            errorMessage.textContent = "";
            errorMessage.hidden = true;
        }

        if (successMessage) {
            successMessage.textContent = "";
            successMessage.hidden = true;
        }
    }


    // --------------------------------------------------
    // 5. VALIDATE EXPENSE DETAILS
    // --------------------------------------------------

    function validateExpense(description, amount, category, expenseDate) {
        if (!description) {
            return "Please enter an expense description.";
        }

        if (description.length > 200) {
            return "Description cannot be longer than 200 characters.";
        }

        if (!Number.isFinite(amount) || amount <= 0) {
            return "Please enter an amount greater than zero.";
        }

        if (!allowedCategories.includes(category)) {
            return "Please select a valid expense category.";
        }

        if (!isValidDate(expenseDate)) {
            return "Please enter a valid expense date.";
        }

        return null;
    }


    // --------------------------------------------------
    // 6. HANDLE FORM SUBMISSION
    // --------------------------------------------------

    async function handleExpenseSubmission(event) {
        event.preventDefault();

        clearMessages();

        // Read and clean the form values.
        const description = descriptionInput.value.trim();
        const amount = Number(amountInput.value);
        const category = categoryInput.value;
        const expenseDate = expenseDateInput.value;

        // Validate the values.
        const validationError = validateExpense(
            description,
            amount,
            category,
            expenseDate
        );

        if (validationError) {
            showError(validationError);
            return;
        }

        // Check that the API service is available.
        if (
            !window.ExpenseAPI ||
            typeof window.ExpenseAPI.createExpense !== "function"
        ) {
            showError(
                "Expense API is unavailable. Check that api.js is loaded correctly."
            );

            return;
        }

        // Prevent multiple submissions while the request is running.
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = "Saving...";
        }

        try {
            // Send the expense to the backend.
            await window.ExpenseAPI.createExpense({
                amount: amount,
                category: category,
                description: description,
                expenseDate: expenseDate
            });

            showSuccess("Your expense has been saved successfully.");

            // Clear the form after a successful response.
            expenseForm.reset();

            setTodayAsDefaultDate();

            // Redirect to Expense History after a short delay.
            window.setTimeout(function () {
                window.location.href = "expenses.html";
            }, 1200);

        } catch (error) {
            console.error("Error saving expense:", error);

            showError(
                error.message ||
                "Unable to save your expense. Please try again."
            );

            // Allow the user to try again.
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = "Save Expense";
            }
        }
    }


    // --------------------------------------------------
    // 7. LOGOUT
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
    // 8. INITIALISE PAGE
    // --------------------------------------------------

    // Check that the form exists before attaching the event.
    if (!expenseForm) {
        console.error(
            "Expense form not found. Check the form ID in add-expense.html."
        );

        return;
    }

    // Attach the form submission event.
    expenseForm.addEventListener(
        "submit",
        handleExpenseSubmission
    );

    // Attach the logout event.
    if (logoutButton) {
        logoutButton.addEventListener("click", handleLogout);
    }

    // Set today's date when the page loads.
    setTodayAsDefaultDate();

});
// ```