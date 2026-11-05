/* =========================================
   EXPENSE TRACKER - CONFIGURATION (EXAMPLE)
   File: js/config.example.js

   1. Copy this file to js/config.js
   2. Replace the placeholder values below
   3. js/config.js is listed in .gitignore, so your real
      values are never committed.

   Login and signup use Cognito's Hosted UI (no custom pages).
========================================= */

window.APP_CONFIG = {
    // Cognito > User pool > App clients > Login pages > Cognito domain
    // e.g. "https://eu-west-2xxxxxxxxx.auth.eu-west-2.amazoncognito.com"
    COGNITO_DOMAIN: "https://YOUR_COGNITO_DOMAIN.auth.eu-west-2.amazoncognito.com",

    // Cognito App client ID (public SPA client, NO client secret)
    CLIENT_ID: "YOUR_APP_CLIENT_ID",

    // API Gateway invoke URL (no trailing slash, no /expenses)
    // e.g. "https://abc123.execute-api.eu-west-2.amazonaws.com"
    API_BASE_URL: "https://YOUR_API_ID.execute-api.eu-west-2.amazonaws.com"
};