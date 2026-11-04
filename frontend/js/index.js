
/* =========================================
   EXPENSE TRACKER - LANDING PAGE
   File: js/index.js
========================================= */

document.addEventListener("DOMContentLoaded", function () {

    // Get the elements we need from index.html
    const loginButton = document.getElementById("login-button");
    const landingMessage = document.getElementById("landing-message");
    const currentYear = document.getElementById("current-year");


    // Display the current year automatically
    if (currentYear) {
        currentYear.textContent = new Date().getFullYear();
    }


    // Show an error message on the landing page
    function showMessage(message) {
        if (!landingMessage) return;

        landingMessage.textContent = message;
        landingMessage.hidden = false;
    }


    // Handle Log in / Sign up button
    if (loginButton) {

        loginButton.addEventListener("click", function () {

            // Make sure the authentication function exists
            if (
                typeof window.loginWithHostedUI !== "function"
            ) {
                showMessage(
                    "Authentication is not configured yet. Please try again later."
                );

                console.error(
                    "loginWithHostedUI() was not found. Check that auth.js is loaded correctly."
                );

                return;
            }

            // Prevent repeated clicks while redirecting
            loginButton.disabled = true;
            loginButton.textContent = "Redirecting...";

            try {

                // Redirect the user to Amazon Cognito Hosted UI
                window.loginWithHostedUI();

            } catch (error) {

                console.error("Authentication redirect error:", error);

                loginButton.disabled = false;
                loginButton.innerHTML = 'Log in / Sign up <span aria-hidden="true">→</span>';

                showMessage(
                    "We could not connect to the login service. Please try again."
                );
            }

        });

    }

});
