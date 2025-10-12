# Guide to Creating Network Evidence/Screenshots for Async Calls

This guide explains how to capture network evidence (screenshots) for asynchronous operations in the RentEase application, such as API calls, database queries, and email sends. These screenshots are stored in the `network_evidence/` folder for documentation and verification.

## Prerequisites
- Google Chrome or Firefox browser
- RentEase server running on `localhost:3000`
- MongoDB connected
- Browser DevTools enabled

## Steps to Capture Network Screenshots

### 1. Open Browser DevTools
- Launch Chrome/Firefox and navigate to `http://localhost:3000`
- Press `F12` or right-click > "Inspect" to open DevTools
- Switch to the **Network** tab

### 2. Enable Network Recording
- Ensure the red record button (🔴) is active in the Network tab
- Check "Preserve log" to keep requests across page loads
- Clear existing logs if needed (trash icon)

### 3. Perform Async Operation
Trigger an async call by performing an action in the app, such as:
- User registration/login (POST /register or /login)
- Property search (GET /search with params)
- Booking submission (POST to booking route)
- Contact form submit (POST /submit-form)
- Forgot password OTP (POST /forgot-password)

### 4. Capture Screenshots
- After the operation completes, scroll through the Network tab
- Identify the relevant request (e.g., XHR/Fetch for API calls)
- Right-click the request > "Save as HAR" or take screenshot of the tab
- For detailed view:
  - Click on the request
  - Screenshot the Headers, Payload, Response tabs
  - Note status codes (200 OK for success, 500 for errors)

### 5. Save Evidence
- Save screenshots as PNG/JPG in `network_evidence/` folder
- Name files descriptively, e.g., `registration_api_call.png`, `property_search_db_query.png`
- Include timestamps and operation details in filename

## Key Async Operations to Document
- **Registration**: POST /register → DB insert, session creation
- **Login**: POST /login → DB query, session set
- **Property Fetch**: GET / (home) or /search → MongoDB aggregation
- **Booking**: POST /booking → Insert booking, update property status
- **Payment**: POST /payment → Update payment status, notify
- **Email Send**: POST /forgot-password → Nodemailer SMTP call
- **Admin Data Load**: GET /admin → Multiple model queries

## Tools for Advanced Capture
- **Postman**: For API testing, export request/response as JSON
- **MongoDB Compass**: Screenshot DB changes post-operation
- **Browser Extensions**: Network logger extensions for automated capture

## Example Screenshots Needed
- Successful API response (200 status)
- Failed request (400/500 errors)
- Network timing (latency for async ops)
- Request headers (auth tokens, content-type)
- Response body (JSON data from DB)

This ensures all async calls (fetch, axios, mongoose queries) are documented for validation.
