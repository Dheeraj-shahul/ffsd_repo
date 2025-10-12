# Test Plan – RentEase Home Rental Management System

This document outlines comprehensive validation (synchronous input checks) and asynchronous (API/DB operations) test cases for the RentEase system. Tests cover core modules: Authentication, Property Management, Bookings, Payments, Worker Services, Admin Panel, and Contact Us. Tests were executed using Postman for APIs, browser for UI, and MongoDB Compass for DB verification.

## ✅ Validation Test Cases (Synchronous - Input/Frontend Validation)

| Test Case ID | Module              | Description                          | Input Data                          | Expected Result                              | Status   |
|--------------|---------------------|--------------------------------------|-------------------------------------|----------------------------------------------|----------|
| V1          | Registration        | Empty required fields                | All fields empty                    | Error: "Missing required fields"             | Passed  |
| V2          | Registration        | Invalid email format                 | email: "invalid-email"              | Error: "Invalid email format"                | Passed  |
| V3          | Registration        | Password too short                   | password: "123"                     | Error: "Password must be at least 8 characters" | Passed  |
| V4          | Registration        | Duplicate email                      | Existing email                      | Error: "Email already exists"                | Passed  |
| V5          | Login               | Invalid credentials                  | Wrong password                      | Error: "Incorrect password"                  | Passed  |
| V6          | Property Listing    | Invalid price (negative)             | price: -100                         | Error: "Enter a valid price"                 | Passed  |
| V7          | Property Listing    | Missing property type                | type: empty                         | Error: "Property type required"              | Passed  |
| V8          | Booking             | Invalid date range                   | startDate > endDate                 | Error: "Invalid date range"                  | Passed  |
| V9          | Payment             | Invalid amount                       | amount: 0                           | Error: "Amount must be positive"             | Passed  |
| V10         | Contact Us          | Empty message                        | message: empty                      | Error: "Message required"                    | Passed  |
| V11         | Worker Registration | Missing service type                 | serviceType: empty                  | Error: "Service type required for workers"   | Passed  |
| V12         | Admin Login         | Invalid admin credentials            | Wrong username/password             | Redirect to login with error                 | Passed  |

## ⚙️ Asynchronous Test Cases (API/DB Operations)

| Test Case ID | Module              | Description (Async Operation)              | Input/Trigger                       | Expected Result                                      | Status   |
|--------------|---------------------|--------------------------------------------|-------------------------------------|------------------------------------------------------|----------|
| A1          | Registration        | Async user creation & DB insert            | Valid registration form             | User saved to DB, success response, redirect to login | Passed  |
| A2          | Login               | Async user verification & session creation | Valid credentials                   | User authenticated, session set, redirect to dashboard | Passed  |
| A3          | Forgot Password     | Async OTP generation & email send          | Valid email                         | OTP stored in memory, email sent (nodemailer)        | Passed  |
| A4          | Property Listing    | Async property save to DB                  | Valid property data                 | Property inserted in MongoDB, success response       | Passed  |
| A5          | Property Search     | Async query DB for properties              | Search params (location, price)     | Filtered properties returned from DB                 | Passed  |
| A6          | Booking             | Async booking creation & notification      | Valid booking request               | Booking saved, notification created in DB            | Passed  |
| A7          | Payment             | Async payment process & status update      | Valid payment details               | Payment recorded, status updated in DB               | Passed  |
| A8          | Worker Booking      | Async worker assignment & email notify     | Book worker service                 | Booking linked, email sent via nodemailer            | Passed  |
| A9          | Admin Panel         | Async fetch all users/properties           | Admin dashboard load                | Aggregated data from multiple models loaded          | Passed  |
| A10         | Contact Us          | Async form submission to DB                | Valid contact form                  | Contact saved to DB, success JSON response           | Passed  |
| A11         | Unrent Property     | Async update property status               | Unrent action from owner dashboard  | Property isRented set to false, history updated      | Passed  |
| A12         | Maintenance Request | Async request creation & owner notify      | Submit maintenance form             | Request saved, notification to owner via DB/email    | Passed  |

## 🧪 Test Execution Details
- **Environment:** Node.js v20+, MongoDB Atlas, Chrome v120+
- **Tools:** Postman (API), Jest (unit, not implemented yet), Browser DevTools (UI), MongoDB Compass (DB verification)
- **Preconditions:** Server running on localhost:3000, DB connected, seed data loaded via seed.js
- **Results File:** See test_results.csv for detailed logs and timestamps.

## 📊 Summary
- Total Validation Cases: 12 | Passed: 12 | Failed: 0
- Total Async Cases: 12 | Passed: 12 | Failed: 0
- Overall: All tests passed. System ready for deployment. Edge cases like network failures need integration tests.

Last Updated: 2025-10-10
