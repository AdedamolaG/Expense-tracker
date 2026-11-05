/* =========================================
   EXPENSE TRACKER - AUTH (Cognito Hosted UI)
   File: js/auth.js

   Login / signup / password reset all happen on Cognito's
   Hosted UI. This file only:
     - sends the user to the Hosted UI (Authorization code + PKCE)
     - exchanges the returned code for tokens (index.html)
     - keeps / refreshes the tokens and signs out

   Cognito app client settings:
     Allowed callback URL : <site>/index.html
     Allowed sign-out URL : <site>/index.html
     OAuth flow           : Authorization code grant
     Scopes               : openid, email, profile

   Auth.login()            Auth.signup()
   Auth.signOut()          Auth.requireAuth()
   Auth.getAccessToken()   (sent to the API in api.js)
   Auth.getCurrentUser()   -> { email, name, sub } | null
========================================= */

(function () {
    "use strict";

    var config = window.APP_CONFIG || {};
    var domain = String(config.COGNITO_DOMAIN || "").replace(/\/+$/, "");
    var clientId = config.CLIENT_ID;

    var REDIRECT_URI = window.location.origin + "/index.html";
    var KEYS = {
        id: "expenseTracker_idToken",
        access: "expenseTracker_accessToken",
        refresh: "expenseTracker_refreshToken",
        expiresAt: "expenseTracker_expiresAt",
        verifier: "expenseTracker_pkceVerifier",
        state: "expenseTracker_state"
    };

    function isConfigured() {
        return domain.indexOf("YOUR_") === -1 && String(clientId || "").indexOf("YOUR_") === -1 && !!clientId;
    }

    /* ---------- PKCE helpers ---------- */

    function base64Url(bytes) {
        var text = "";
        bytes.forEach(function (b) { text += String.fromCharCode(b); });
        return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    }

    function randomString() {
        var bytes = new Uint8Array(32);
        crypto.getRandomValues(bytes);
        return base64Url(Array.from(bytes));
    }

    async function sha256(text) {
        var digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
        return base64Url(Array.from(new Uint8Array(digest)));
    }

    /* ---------- Token storage ---------- */

    function saveTokens(tokens, oldRefreshToken) {
        localStorage.setItem(KEYS.id, tokens.id_token);
        localStorage.setItem(KEYS.access, tokens.access_token);
        localStorage.setItem(KEYS.expiresAt, String(Date.now() + (tokens.expires_in || 3600) * 1000));
        var refresh = tokens.refresh_token || oldRefreshToken;
        if (refresh) { localStorage.setItem(KEYS.refresh, refresh); }
    }

    function clearTokens() {
        [KEYS.id, KEYS.access, KEYS.refresh, KEYS.expiresAt].forEach(function (key) {
            localStorage.removeItem(key);
        });
    }

    function decodeToken(token) {
        try {
            var payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
            return JSON.parse(decodeURIComponent(atob(payload).split("").map(function (c) {
                return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
            }).join("")));
        } catch (e) {
            return null;
        }
    }

    async function tokenRequest(params) {
        var response = await fetch(domain + "/oauth2/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams(params).toString()
        });
        var data = await response.json();
        if (!response.ok) { throw new Error(data.error || "token_error"); }
        return data;
    }

    /* ---------- Login / logout ---------- */

    async function goToHostedUi(path) {
        if (!isConfigured()) {
            alert("Login is not configured yet. Fill in COGNITO_DOMAIN and CLIENT_ID in js/config.js.");
            return;
        }
        var verifier = randomString();
        var state = randomString();
        sessionStorage.setItem(KEYS.verifier, verifier);
        sessionStorage.setItem(KEYS.state, state);

        var query = new URLSearchParams({
            client_id: clientId,
            response_type: "code",
            scope: "openid email profile",
            redirect_uri: REDIRECT_URI,
            state: state,
            code_challenge_method: "S256",
            code_challenge: await sha256(verifier)
        });
        window.location.href = domain + path + "?" + query.toString();
    }

    function login() { return goToHostedUi("/login"); }
    function signup() { return goToHostedUi("/signup"); }

    function signOut() {
        clearTokens();
        if (!isConfigured()) {
            window.location.href = "index.html";
            return;
        }
        window.location.href = domain + "/logout?" + new URLSearchParams({
            client_id: clientId,
            logout_uri: REDIRECT_URI
        }).toString();
    }

    // Runs on index.html after Cognito sends the user back with ?code=...
    async function handleCallback() {
        var params = new URLSearchParams(window.location.search);
        if (params.has("error")) { return "Login failed: " + (params.get("error_description") || params.get("error")); }
        if (!params.has("code")) { return null; }

        var verifier = sessionStorage.getItem(KEYS.verifier);
        var expectedState = sessionStorage.getItem(KEYS.state);
        sessionStorage.removeItem(KEYS.verifier);
        sessionStorage.removeItem(KEYS.state);

        if (!verifier || params.get("state") !== expectedState) {
            return "Login could not be verified. Please try again.";
        }

        try {
            var tokens = await tokenRequest({
                grant_type: "authorization_code",
                client_id: clientId,
                code: params.get("code"),
                redirect_uri: REDIRECT_URI,
                code_verifier: verifier
            });
            saveTokens(tokens);
            window.location.replace("dashboard.html");
            return "";
        } catch (error) {
            return "Login failed. Please try again.";
        }
    }

    /* ---------- Session ---------- */

    function tokenIsFresh() {
        var expiresAt = Number(localStorage.getItem(KEYS.expiresAt) || 0);
        return Boolean(localStorage.getItem(KEYS.access)) && Date.now() < expiresAt - 60000;
    }

    function isAuthenticated() {
        return tokenIsFresh() || Boolean(localStorage.getItem(KEYS.refresh));
    }

    async function refreshSession() {
        var refreshToken = localStorage.getItem(KEYS.refresh);
        if (!refreshToken) { return false; }
        try {
            var tokens = await tokenRequest({
                grant_type: "refresh_token",
                client_id: clientId,
                refresh_token: refreshToken
            });
            saveTokens(tokens, refreshToken);
            return true;
        } catch (error) {
            clearTokens();
            return false;
        }
    }

    async function getAccessToken() {
        if (tokenIsFresh()) { return localStorage.getItem(KEYS.access); }
        return (await refreshSession()) ? localStorage.getItem(KEYS.access) : null;
    }

    function getCurrentUser() {
        var token = localStorage.getItem(KEYS.id);
        var claims = token ? decodeToken(token) : null;
        if (!claims) { return null; }
        return { email: claims.email || "", name: claims.name || "", sub: claims.sub || "" };
    }

    // Top of every protected page: no valid session -> Hosted UI login
    async function requireAuth() {
        if (await getAccessToken()) { return true; }
        login();
        return false;
    }

    /* ---------- Landing page (index.html) ---------- */

    async function initLanding() {
        var alertBox = document.getElementById("landing-alert");
        var message = await handleCallback();
        if (message === "") { return; }
        if (message && alertBox) {
            alertBox.textContent = message;
            alertBox.classList.remove("hidden");
            window.history.replaceState({}, "", "index.html");
        }

        var signedIn = isAuthenticated();
        document.querySelectorAll("[data-guest-only]").forEach(function (el) { el.classList.toggle("hidden", signedIn); });
        document.querySelectorAll("[data-user-only]").forEach(function (el) { el.classList.toggle("hidden", !signedIn); });
        document.querySelectorAll("[data-login]").forEach(function (el) { el.addEventListener("click", login); });
        document.querySelectorAll("[data-signup]").forEach(function (el) { el.addEventListener("click", signup); });
    }

    document.addEventListener("DOMContentLoaded", function () {
        if (document.body.dataset.page === "landing") { initLanding(); }
    });

    window.Auth = {
        login: login,
        signup: signup,
        signOut: signOut,
        requireAuth: requireAuth,
        getAccessToken: getAccessToken,
        getCurrentUser: getCurrentUser,
        isAuthenticated: isAuthenticated
    };
})();
