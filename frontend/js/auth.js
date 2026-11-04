
/*
|--------------------------------------------------------------------------
| EXPENSE TRACKER - AUTHENTICATION SERVICE
| File: js/auth.js
|
| Purpose:
| Handles Amazon Cognito Hosted UI authentication.
|
| Authentication method:
| OAuth 2.0 Authorization Code Flow with PKCE.
|
| This file is used by:
| - index.html
| - dashboard.html
| - expenses.html
| - add-expense.html
|--------------------------------------------------------------------------
*/

(function () {
    "use strict";

    // Read the configuration created in config.js.
    const config = window.APP_CONFIG;

    // Names used to store authentication information in this browser tab.
    const STORAGE_KEYS = {
        accessToken: "expenseTrackerAccessToken",
        idToken: "expenseTrackerIdToken",
        refreshToken: "expenseTrackerRefreshToken",
        expiresAt: "expenseTrackerTokenExpiry",
        codeVerifier: "expenseTrackerCodeVerifier",
        state: "expenseTrackerOAuthState"
    };

    // Pages that require users to be logged in.
    const PROTECTED_PAGES = [
        "dashboard.html",
        "expenses.html",
        "add-expense.html"
    ];

    // Make sure config.js has been loaded correctly.
    function validateConfig() {
        const requiredValues = [
            "AWS_REGION",
            "USER_POOL_ID",
            "CLIENT_ID",
            "COGNITO_DOMAIN",
            "REDIRECT_URI",
            "LOGOUT_URI",
            "SCOPES"
        ];

        if (!config) {
            throw new Error(
                "APP_CONFIG was not found. Check that config.js loads before auth.js."
            );
        }

        for (const key of requiredValues) {
            const value = config[key];

            if (
                value === undefined ||
                value === null ||
                value === "" ||
                (
                    typeof value === "string" &&
                    value.includes("REPLACE")
                )
            ) {
                throw new Error(
                    `The ${key} setting is missing or has not been configured.`
                );
            }
        }

        if (config.AWS_REGION !== "eu-west-2") {
            throw new Error("AWS_REGION must be eu-west-2.");
        }

        if (
            typeof config.USER_POOL_ID !== "string" ||
            !config.USER_POOL_ID.startsWith("eu-west-2_")
        ) {
            throw new Error(
                "The Cognito User Pool ID must belong to eu-west-2."
            );
        }

        if (
            typeof config.SCOPES !== "string" &&
            !Array.isArray(config.SCOPES)
        ) {
            throw new Error(
                "SCOPES must be an array or a space-separated string."
            );
        }

        if (
            Array.isArray(config.SCOPES) &&
            config.SCOPES.length === 0
        ) {
            throw new Error("At least one Cognito scope is required.");
        }

        // Validate the Cognito domain.
        const cognitoDomain = new URL(config.COGNITO_DOMAIN);

        if (
            cognitoDomain.protocol !== "https:" ||
            !cognitoDomain.hostname
        ) {
            throw new Error(
                "COGNITO_DOMAIN must be a valid HTTPS URL."
            );
        }

        // Validate callback and logout URLs.
        const redirectUrl = new URL(config.REDIRECT_URI);
        const logoutUrl = new URL(config.LOGOUT_URI);

        if (
            redirectUrl.protocol !== "https:" &&
            redirectUrl.hostname !== "localhost"
        ) {
            throw new Error(
                "REDIRECT_URI must use HTTPS or localhost."
            );
        }

        if (
            logoutUrl.protocol !== "https:" &&
            logoutUrl.hostname !== "localhost"
        ) {
            throw new Error(
                "LOGOUT_URI must use HTTPS or localhost."
            );
        }
    }

    // Get the Cognito Hosted UI base URL.
    function getCognitoDomain() {
        return config.COGNITO_DOMAIN.replace(/\/+$/, "");
    }

    // Convert random bytes into a URL-safe string.
    function base64UrlEncode(bytes) {
        let binary = "";

        bytes.forEach(function (byte) {
            binary += String.fromCharCode(byte);
        });

        return btoa(binary)
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");
    }

    // Generate a random value for OAuth state and the PKCE verifier.
    function generateRandomString(byteLength = 32) {
        const randomBytes = new Uint8Array(byteLength);

        window.crypto.getRandomValues(randomBytes);

        return base64UrlEncode(randomBytes);
    }

    // Create the SHA-256 challenge from the PKCE verifier.
    async function createCodeChallenge(verifier) {
        const encoder = new TextEncoder();
        const data = encoder.encode(verifier);

        const digest = await window.crypto.subtle.digest(
            "SHA-256",
            data
        );

        return base64UrlEncode(new Uint8Array(digest));
    }

    // Start login or sign-up through Cognito Hosted UI.
    async function loginWithHostedUI() {
        try {
            validateConfig();

            if (!window.crypto || !window.crypto.subtle) {
                throw new Error(
                    "Secure browser cryptography is unavailable. Use HTTPS or localhost."
                );
            }

            // Generate the PKCE verifier and OAuth state.
            const codeVerifier = generateRandomString(64);
            const state = generateRandomString(32);

            // Save them temporarily before leaving this website.
            sessionStorage.setItem(
                STORAGE_KEYS.codeVerifier,
                codeVerifier
            );

            sessionStorage.setItem(
                STORAGE_KEYS.state,
                state
            );

            // Generate the PKCE challenge.
            const codeChallenge = await createCodeChallenge(codeVerifier);

            // Build the Cognito authorization URL.
            const authorizeUrl = new URL(
                `${getCognitoDomain()}/oauth2/authorize`
            );

            const scopes = Array.isArray(config.SCOPES)
                ? config.SCOPES.join(" ")
                : config.SCOPES;

            authorizeUrl.search = new URLSearchParams({
                response_type: "code",
                client_id: config.CLIENT_ID,
                redirect_uri: config.REDIRECT_URI,
                scope: scopes,
                state: state,
                code_challenge: codeChallenge,
                code_challenge_method: "S256"
            }).toString();

            // Send the user to Cognito.
            window.location.assign(authorizeUrl.toString());

        } catch (error) {
            console.error("Login error:", error);

            // Re-enable the login button if authentication fails.
            const loginButton = document.getElementById("login-button");

            if (loginButton) {
                loginButton.disabled = false;

                loginButton.innerHTML =
                    'Log in / Sign up <span aria-hidden="true">→</span>';
            }

            // Display the error message.
            const messageElement =
                document.getElementById("landing-message");

            if (messageElement) {
                messageElement.textContent =
                    error.message || "Unable to start login.";

                messageElement.hidden = false;
            }
        }
    }

    // Decode a JWT payload so we can read the user's display name.
    // This is for display only, not for authorizing API requests.
    function decodeJwtPayload(token) {
        try {
            const parts = token.split(".");

            if (parts.length !== 3) {
                throw new Error("Invalid ID token format.");
            }

            let payload = parts[1]
                .replace(/-/g, "+")
                .replace(/_/g, "/");

            while (payload.length % 4) {
                payload += "=";
            }

            return JSON.parse(atob(payload));

        } catch (error) {
            console.error("Could not read ID token:", error);
            return null;
        }
    }

    // Clear all authentication information.
    function clearAuthenticationSession() {
        Object.values(STORAGE_KEYS).forEach(function (key) {
            sessionStorage.removeItem(key);
        });
    }

    // Exchange the authorization code for Cognito tokens.
    async function exchangeCodeForTokens(code) {
        const codeVerifier = sessionStorage.getItem(
            STORAGE_KEYS.codeVerifier
        );

        const savedState = sessionStorage.getItem(
            STORAGE_KEYS.state
        );

        const returnedState = new URLSearchParams(
            window.location.search
        ).get("state");

        // Confirm that this callback belongs to the login we started.
        if (
            !savedState ||
            !returnedState ||
            savedState !== returnedState
        ) {
            throw new Error(
                "Authentication state verification failed. Please log in again."
            );
        }

        if (!codeVerifier) {
            throw new Error(
                "The PKCE verifier is missing. Please start login again."
            );
        }

        const tokenUrl = `${getCognitoDomain()}/oauth2/token`;

        const body = new URLSearchParams({
            grant_type: "authorization_code",
            client_id: config.CLIENT_ID,
            code: code,
            redirect_uri: config.REDIRECT_URI,
            code_verifier: codeVerifier
        });

        const response = await fetch(tokenUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: body.toString()
        });

        let tokenData;

        try {
            tokenData = await response.json();
        } catch (error) {
            throw new Error(
                "Cognito returned an unreadable authentication response."
            );
        }

        if (!response.ok) {
            console.error("Cognito token response:", tokenData);

            throw new Error(
                tokenData.error_description ||
                tokenData.error ||
                "Cognito could not complete authentication."
            );
        }

        if (!tokenData.access_token || !tokenData.id_token) {
            throw new Error(
                "Cognito did not return the required authentication tokens."
            );
        }

        // Store tokens for this browser tab.
        sessionStorage.setItem(
            STORAGE_KEYS.accessToken,
            tokenData.access_token
        );

        sessionStorage.setItem(
            STORAGE_KEYS.idToken,
            tokenData.id_token
        );

        if (tokenData.refresh_token) {
            sessionStorage.setItem(
                STORAGE_KEYS.refreshToken,
                tokenData.refresh_token
            );
        }

        const expiresAt =
            Date.now() + (Number(tokenData.expires_in || 3600) * 1000);

        sessionStorage.setItem(
            STORAGE_KEYS.expiresAt,
            String(expiresAt)
        );

        // Remove temporary OAuth values after successful authentication.
        sessionStorage.removeItem(STORAGE_KEYS.codeVerifier);
        sessionStorage.removeItem(STORAGE_KEYS.state);

        return tokenData;
    }

    // Handle the callback when Cognito redirects the user to index.html.
    async function handleOAuthCallback() {
        const params = new URLSearchParams(window.location.search);

        const code = params.get("code");
        const oauthError = params.get("error");

        if (oauthError) {
            const description =
                params.get("error_description") || oauthError;

            throw new Error(description);
        }

        if (!code) {
            return false;
        }

        try {
            await exchangeCodeForTokens(code);

            // Remove the authorization code from the browser address bar.
            window.history.replaceState(
                {},
                document.title,
                window.location.pathname
            );

            // Authentication succeeded. Open the dashboard.
            window.location.replace("dashboard.html");

            return true;

        } catch (error) {
            console.error("Authentication callback error:", error);

            clearAuthenticationSession();

            // Remove callback parameters so the failed code is not reused.
            window.history.replaceState(
                {},
                document.title,
                window.location.pathname
            );

            const messageElement =
                document.getElementById("landing-message");

            if (messageElement) {
                messageElement.textContent =
                    error.message || "Login failed. Please try again.";

                messageElement.hidden = false;
            }

            return true;
        }
    }

    // Return the access token if it exists and has not expired.
    function getAccessToken() {
        const token = sessionStorage.getItem(STORAGE_KEYS.accessToken);

        const expiresAt = Number(
            sessionStorage.getItem(STORAGE_KEYS.expiresAt)
        );

        if (!token || !expiresAt || Date.now() >= expiresAt) {
            return null;
        }

        return token;
    }

    // Get the user's name from the Cognito ID token.
    function getCurrentUserName() {
        const idToken = sessionStorage.getItem(STORAGE_KEYS.idToken);

        if (!idToken) {
            return "User";
        }

        const payload = decodeJwtPayload(idToken);

        if (!payload) {
            return "User";
        }

        return payload.name ||
            payload.preferred_username ||
            payload.email ||
            "User";
    }

    // Check whether the current page requires authentication.
    function isProtectedPage() {
        const currentPage = window.location.pathname
            .split("/")
            .pop()
            .toLowerCase();

        return PROTECTED_PAGES.includes(currentPage);
    }

    // Protect dashboard, expenses and add-expense pages.
    function protectPage() {
        if (!isProtectedPage()) {
            return;
        }

        if (!getAccessToken()) {
            loginWithHostedUI();
        }
    }

    // Log the user out and send them to Cognito's logout endpoint.
    function logoutUser() {
        try {
            validateConfig();

            // Clear this application's authentication information.
            clearAuthenticationSession();

            const logoutUrl = new URL(
                `${getCognitoDomain()}/logout`
            );

            logoutUrl.search = new URLSearchParams({
                client_id: config.CLIENT_ID,
                logout_uri: config.LOGOUT_URI
            }).toString();

            window.location.assign(logoutUrl.toString());

        } catch (error) {
            console.error("Logout error:", error);
            clearAuthenticationSession();
            window.location.replace("index.html");
        }
    }

    // Make functions available to the other frontend JavaScript files.
    window.loginWithHostedUI = loginWithHostedUI;
    window.logoutUser = logoutUser;
    window.getAccessToken = getAccessToken;
    window.getCurrentUserName = getCurrentUserName;

    // Initialise authentication when the page loads.
    async function initialiseAuthentication() {
        try {
            validateConfig();

            const currentPage = window.location.pathname
                .split("/")
                .pop()
                .toLowerCase();

            // The landing page handles Cognito's OAuth callback.
            if (currentPage === "index.html" || currentPage === "") {
                const callbackHandled = await handleOAuthCallback();

                if (callbackHandled) {
                    return;
                }
            }

            // Only protected pages require an active login.
            protectPage();

        } catch (error) {
            console.error("Authentication initialisation error:", error);

            const messageElement =
                document.getElementById("landing-message");

            if (messageElement) {
                messageElement.textContent =
                    error.message || "Authentication is not configured.";

                messageElement.hidden = false;
            }
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initialiseAuthentication
        );
    } else {
        initialiseAuthentication();
    }

})();
