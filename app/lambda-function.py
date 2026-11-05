"""
Expense Tracker - single Lambda handling all expense operations.

Routes (API Gateway HTTP API, payload format 2.0, Cognito JWT authorizer):
    GET    /expenses                 -> { "expenses": [...], "total": number }
    POST   /expenses                 -> created expense (201)
    DELETE /expenses/{expenseId}     -> { "message": "Expense deleted" }

Security:
    - userId ALWAYS comes from the validated JWT claim (sub), never from the request.
    - Every DynamoDB call is keyed on that userId, so users can't touch each other's data.

Environment variable:
    TABLE_NAME  (optional, defaults to "Expenses")
"""

import base64
import json
import logging
import os
import re
import uuid
from datetime import date, datetime, timezone
from decimal import Decimal, InvalidOperation

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

TABLE_NAME = os.environ.get("TABLE_NAME", "Expenses")
table = boto3.resource("dynamodb").Table(TABLE_NAME)

ALLOWED_CATEGORIES = {
    "Food",
    "Transport",
    "Bills",
    "Shopping",
    "Entertainment",
    "Other",
}

MAX_DESCRIPTION_LENGTH = 100


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _json_default(value):
    """Convert DynamoDB Decimals into normal JSON numbers."""
    if isinstance(value, Decimal):
        return int(value) if value == value.to_integral_value() else float(value)
    raise TypeError(f"Cannot serialize {type(value)}")


def response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body, default=_json_default),
    }


def get_user_id(event):
    """Read the authenticated user's Cognito sub from the validated authorizer context."""
    try:
        return event["requestContext"]["authorizer"]["jwt"]["claims"]["sub"]
    except (KeyError, TypeError):
        return None


def parse_body(event):
    body = event.get("body")
    if not body:
        raise ValueError("Request body is required.")

    if event.get("isBase64Encoded"):
        body = base64.b64decode(body).decode("utf-8")

    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        raise ValueError("Request body must be valid JSON.")

    if not isinstance(data, dict):
        raise ValueError("Request body must be a JSON object.")

    return data


def validate_expense(data):
    """Validate the POST body and return clean values. Raises ValueError on bad input."""

    # Amount: a number greater than zero (booleans are not numbers here).
    amount = data.get("amount")
    if isinstance(amount, bool) or not isinstance(amount, (int, float, str)):
        raise ValueError("Amount must be a number greater than zero.")
    try:
        amount = Decimal(str(amount))
    except InvalidOperation:
        raise ValueError("Amount must be a number greater than zero.")
    if not amount.is_finite() or amount <= 0:
        raise ValueError("Amount must be a number greater than zero.")

    # Category: one of the allowed values.
    category = data.get("category")
    if category not in ALLOWED_CATEGORIES:
        raise ValueError(
            "Category must be one of: " + ", ".join(sorted(ALLOWED_CATEGORIES)) + "."
        )

    # Description: non-empty text, limited length.
    description = data.get("description")
    if not isinstance(description, str) or not description.strip():
        raise ValueError("Description is required.")
    description = description.strip()
    if len(description) > MAX_DESCRIPTION_LENGTH:
        raise ValueError(f"Description must be {MAX_DESCRIPTION_LENGTH} characters or fewer.")

    # Expense date: a real calendar date in YYYY-MM-DD format.
    expense_date = data.get("expenseDate")
    if not isinstance(expense_date, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", expense_date):
        raise ValueError("expenseDate must be in YYYY-MM-DD format.")
    try:
        date.fromisoformat(expense_date)
    except ValueError:
        raise ValueError("expenseDate is not a valid date.")

    return amount, category, description, expense_date


# ---------------------------------------------------------------------------
# Operations
# ---------------------------------------------------------------------------

def get_expenses(user_id):
    """Return all of the user's expenses (newest first) plus the total."""
    items = []
    query_args = {"KeyConditionExpression": boto3.dynamodb.conditions.Key("userId").eq(user_id)}

    while True:
        result = table.query(**query_args)
        items.extend(result.get("Items", []))

        last_key = result.get("LastEvaluatedKey")
        if not last_key:
            break
        query_args["ExclusiveStartKey"] = last_key

    items.sort(key=lambda item: (item.get("expenseDate", ""), item.get("createdAt", "")), reverse=True)

    total = sum((item.get("amount", Decimal(0)) for item in items), Decimal(0))

    # The userId is the owner's identity, so there's no need to send it back.
    expenses = [{k: v for k, v in item.items() if k != "userId"} for item in items]

    return response(200, {"expenses": expenses, "total": total})


def add_expense(user_id, event):
    try:
        data = parse_body(event)
        amount, category, description, expense_date = validate_expense(data)
    except ValueError as error:
        return response(400, {"message": str(error)})

    expense = {
        "userId": user_id,  # always from the token, never from the request
        "expenseId": str(uuid.uuid4()),
        "amount": amount,
        "category": category,
        "description": description,
        "expenseDate": expense_date,
        "createdAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }

    table.put_item(Item=expense)

    created = {k: v for k, v in expense.items() if k != "userId"}
    return response(201, created)


def delete_expense(user_id, expense_id):
    if not expense_id:
        return response(400, {"message": "expenseId is required."})

    try:
        table.delete_item(
            Key={"userId": user_id, "expenseId": expense_id},
            ConditionExpression="attribute_exists(expenseId)",
        )
    except ClientError as error:
        if error.response["Error"]["Code"] == "ConditionalCheckFailedException":
            # Either it doesn't exist or it belongs to someone else. Same answer for both.
            return response(404, {"message": "Expense not found."})
        raise

    return response(200, {"message": "Expense deleted"})


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def lambda_handler(event, context):
    try:
        user_id = get_user_id(event)
        if not user_id:
            return response(401, {"message": "Unauthorized."})

        method = event["requestContext"]["http"]["method"]
        path_params = event.get("pathParameters") or {}

        if method == "GET":
            return get_expenses(user_id)

        if method == "POST":
            return add_expense(user_id, event)

        if method == "DELETE":
            return delete_expense(user_id, path_params.get("expenseId"))

        return response(405, {"message": "Method not allowed."})

    except Exception:
        # Full details go to CloudWatch; the client only gets a generic message.
        logger.exception("Unhandled error")
        return response(500, {"message": "Internal server error."})