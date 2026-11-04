
/*
=========================================
EXPENSE TRACKER - EXAMPLE CONFIGURATION
File: js/config.example.js

Purpose:
Provides the configuration structure required
by the frontend application.

IMPORTANT:
This is an example file.
Replace the placeholder values in your local
config.js file with your actual AWS values.

Never upload config.js to GitHub.
=========================================
*/

window.APP_CONFIG = {

    // AWS region where the project resources are deployed.
    AWS_REGION: "eu-west-2",

    // Amazon Cognito User Pool ID.
    // Example format: eu-west-2_XXXXXXXXX
    USER_POOL_ID: "REPLACE_ME",

    // Cognito App Client ID.
    CLIENT_ID: "REPLACE_ME",

    // Cognito Hosted UI domain.
    // Example format:
    // https://your-domain.auth.eu-west-2.amazoncognito.com
    COGNITO_DOMAIN: "https://REPLACE_ME.auth.eu-west-2.amazoncognito.com",

    // URL Cognito redirects to after successful login.
    // Must match the callback URL configured in Cognito.
    REDIRECT_URI: "REPLACE_ME",

    // URL Cognito redirects to after logout.
    // Must match the sign-out URL configured in Cognito.
    LOGOUT_URI: "REPLACE_ME",

    // OAuth scopes requested during authentication.
    SCOPES: [
        "openid",
        "email",
        "profile"
    ],

    // API Gateway base URL.
    // Example format:
    // https://xxxxxxxxxx.execute-api.eu-west-2.amazonaws.com/prod
    API_BASE_URL: "REPLACE_ME"

};
