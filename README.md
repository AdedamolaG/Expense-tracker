# Expense Tracker on AWS

A serverless expense-tracking web application built on AWS. Users can securely sign up, log in, record expenses, view their expense history and spending summary, and delete expenses.

> **Project status:** Deployed and tested  
> **AWS Region:** `eu-west-2` (London)

## Live Application

- **Frontend:** `https://YOUR-CLOUDFRONT-DOMAIN.cloudfront.net`

Replace the placeholder above with the application's actual CloudFront URL.

## Overview

The Expense Tracker is a web application that allows authenticated users to manage personal expenses. It uses a serverless AWS architecture, with a static frontend served through CloudFront and a backend powered by AWS Lambda, API Gateway, and DynamoDB.

Authentication is handled by Amazon Cognito. The API uses a Cognito JWT authorizer to protect expense operations and identify the signed-in user.

## Features

- User registration and email verification
- Login and password reset through Amazon Cognito Hosted UI
- Add an expense with an amount, category, description, and date
- View expense history
- View total spending
- View recent expenses and category breakdown
- Delete an expense
- Keep each user's expense records isolated from other users
- Serve the frontend over HTTPS
- Protect API endpoints with Cognito authentication

## Architecture

```mermaid
flowchart TD
    A[User / Browser] -->|HTTPS| B[CloudFront]
    B --> C[Private S3 Bucket<br/>Static Frontend]
    A -->|Sign in / Sign up| D[Amazon Cognito Hosted UI]
    A -->|JWT-authenticated requests| E[API Gateway HTTP API]
    E -->|Cognito JWT Authorizer| F[AWS Lambda<br/>Python 3.12]
    F --> G[(Amazon DynamoDB<br/>Expenses)]
    B --> H[AWS WAF]
```

### Request flow

1. CloudFront serves the static frontend from a private S3 bucket using Origin Access Control (OAC).
2. Users register, verify their email, and sign in through Amazon Cognito Hosted UI.
3. The frontend sends authenticated requests to API Gateway with the Cognito access token.
4. API Gateway validates the JWT through its Cognito authorizer.
5. Lambda receives the validated user identity and performs the requested operation.
6. DynamoDB stores and returns expense records scoped to that user.

## AWS Services Used

| Service | Purpose |
|---|---|
| Amazon S3 | Private storage for frontend files |
| Amazon CloudFront | CDN and HTTPS delivery for the frontend |
| AWS WAF | Web application firewall associated with CloudFront |
| Amazon Cognito | User registration, email verification, login, and password reset |
| Amazon API Gateway (HTTP API) | Exposes the backend endpoints |
| AWS Lambda | Runs the expense-management backend |
| Amazon DynamoDB | Stores expense records |
| AWS IAM | Controls permissions between AWS services |
| Amazon CloudWatch | Lambda logs and troubleshooting |

## Technology Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Python 3.12
- **Authentication:** Amazon Cognito Hosted UI, OAuth 2.0 Authorization Code Grant with PKCE
- **API:** Amazon API Gateway HTTP API
- **Database:** Amazon DynamoDB
- **Hosting and delivery:** Amazon S3 and CloudFront
- **Security:** Cognito JWT authorizer, IAM least privilege, AWS WAF, HTTPS

## Database Design

### DynamoDB table: `Expenses`

| Attribute | Type | Description |
|---|---|---|
| `userId` | String (Partition Key) | Cognito user's `sub` identifier |
| `expenseId` | String (Sort Key) | Unique expense ID (UUID) |
| `amount` | Number | Expense amount |
| `category` | String | Expense category |
| `description` | String | Expense description |
| `expenseDate` | String | Expense date in `YYYY-MM-DD` format |
| `createdAt` | String | Record creation timestamp |

Each expense belongs to a Cognito user. The backend uses the authenticated user's `sub` claim as `userId`, ensuring users can access only their own records.

### Accepted expense categories

- Food
- Transport
- Bills
- Shopping
- Entertainment
- Other

## API Endpoints

All endpoints require a valid Cognito JWT.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/expenses` | Retrieve the signed-in user's expenses and total spending |
| `POST` | `/expenses` | Create an expense |
| `DELETE` | `/expenses/{expenseId}` | Delete an expense belonging to the signed-in user |

### Example: Create an expense

`POST /expenses`

```json
{
  "amount": 2500,
  "category": "Food",
  "description": "Lunch",
  "expenseDate": "2026-11-05"
}
```

### Input validation

The backend validates expense data before saving it:

- Amount must be greater than `0`.
- Category must be one of the accepted categories.
- Description must not exceed 100 characters.
- Date must use the `YYYY-MM-DD` format.

## Security

Security was considered throughout the application design and deployment:

- **Authentication:** Amazon Cognito manages user sign-up and sign-in.
- **API authorization:** API Gateway validates Cognito JWTs before requests reach Lambda.
- **User isolation:** Lambda obtains the user's `sub` from the validated authorizer context. It does not trust a user ID supplied by the frontend.
- **Data access:** DynamoDB operations are scoped to the authenticated user.
- **Least privilege:** IAM permissions are limited to the resources and actions required by the backend.
- **Private frontend storage:** S3 Block Public Access is enabled; CloudFront accesses the bucket through OAC.
- **HTTPS:** CloudFront delivers the frontend over HTTPS.
- **Web protection:** AWS WAF is attached to CloudFront.
- **Secrets and configuration:** AWS credentials and sensitive configuration are not committed to the repository. `config.js` is excluded, while `config.example.js` provides a template.

## Repository Structure

The structure below is illustrative. Update it to match the actual files in your repository.

```text
expense-tracker/
├── index.html
├── dashboard.html
├── expenses.html
├── add-expense.html
├── css/
│   └── styles.css
├── js/
│   ├── auth.js
│   ├── api.js
│   ├── config.example.js
│   └── ...
├── backend/
│   └── lambda_function.py
├── README.md
└── .gitignore
```

## Deployment Overview

The application was deployed in the AWS `eu-west-2` (London) region.

At a high level, deployment involved:

1. Creating and configuring the Amazon Cognito user pool and Hosted UI.
2. Creating the DynamoDB `Expenses` table.
3. Creating the Lambda backend and its execution role.
4. Creating API Gateway routes and configuring the Cognito JWT authorizer.
5. Configuring API CORS for the approved frontend origin.
6. Uploading frontend files to a private S3 bucket.
7. Configuring CloudFront with S3 Origin Access Control (OAC) and HTTPS.
8. Associating AWS WAF with the CloudFront distribution.
9. Configuring frontend application settings and testing the deployed application.

### Frontend configuration

Use the provided `config.example.js` as a reference for the required configuration. Create your local `config.js` with the actual application values, and do not commit it.

Typical values include:

- Cognito user pool/client configuration
- Cognito Hosted UI domain
- API Gateway endpoint
- Frontend redirect and sign-out URLs

The exact variable names depend on the implementation in the repository.

## Testing

The following application flows were tested:

- User registration
- Email verification
- Login
- Adding an expense
- Saving expense records to DynamoDB
- Retrieving expense history
- Calculating total spending
- Deleting an expense

Additional checks include:

- Logout and invalid credentials
- Requests to protected endpoints without authentication
- Cross-user data isolation
- HTTPS frontend access
- Browser testing and troubleshooting

## Monitoring and Troubleshooting

- **AWS Lambda:** Review function logs in Amazon CloudWatch.
- **API Gateway:** Check API configuration and request errors.
- **Amazon Cognito:** Check user-pool and app-client configuration for authentication issues.
- **DynamoDB:** Verify table keys and stored records.
- **CloudFront and S3:** Check distribution status, OAC, bucket permissions, and frontend deployment.
- **Browser:** Use Developer Tools to inspect network requests, console errors, and authentication redirects.

## Cost Management

This project uses serverless and managed AWS services. Costs depend on traffic, requests, storage, and configuration. Review AWS pricing and usage regularly, and remove resources that are no longer needed after testing or demonstrations.

## Learning Outcomes

This project provided practical experience with:

- Designing a serverless application architecture on AWS
- Hosting static content securely with S3 and CloudFront
- Configuring Cognito authentication and JWT-protected APIs
- Building and deploying a Python Lambda backend
- Integrating API Gateway with Lambda and DynamoDB
- Designing user-scoped data access
- Applying IAM least privilege and basic web security controls
- Testing, monitoring, troubleshooting, and documenting a cloud application

## AI Assistance Disclosure

AI tools were used to support parts of the code-writing and development process. The team reviewed, tested, and worked through the implementation. The team's primary contributions focused on cloud architecture, AWS infrastructure configuration, service integration, security, deployment, monitoring, troubleshooting, testing, and documentation.

## Contributors

Add the project contributors and their GitHub profiles below.

- [Contributor 1](https://github.com/GITHUB_USERNAME)
- [Contributor 2](https://github.com/GITHUB_USERNAME)
- [Contributor 3](https://github.com/GITHUB_USERNAME)

## Acknowledgements

Built as a Cloud Engineering group project to practice deploying and securing an application using AWS services.
