# Test Results

| Test Case ID | Module | Description | Input/Trigger | Expected Result | Actual Result | Status | Timestamp |
|--------------|--------|-------------|---------------|-----------------|---------------|--------|-----------|
| V1 | Registration | Empty required fields | All fields empty | Error: "Missing required fields" | Error displayed | Passed | 2025-10-10 10:00:00 |
| V2 | Registration | Invalid email format | email: "invalid-email" | Error: "Invalid email format" | Error displayed | Passed | 2025-10-10 10:05:00 |
| V3 | Registration | Password too short | password: "123" | Error: "Password must be at least 8 characters" | Error displayed | Passed | 2025-10-10 10:10:00 |
| V4 | Registration | Duplicate email | Existing email | Error: "Email already exists" | Error displayed | Passed | 2025-10-10 10:15:00 |
| V5 | Login | Invalid credentials | Wrong password | Error: "Incorrect password" | Error displayed | Passed | 2025-10-10 10:20:00 |
| V6 | Property Listing | Invalid price (negative) | price: -100 | Error: "Enter a valid price" | Error displayed | Passed | 2025-10-10 10:25:00 |
| V7 | Property Listing | Missing property type | type: empty | Error: "Property type required" | Error displayed | Passed | 2025-10-10 10:30:00 |
| V8 | Booking | Invalid date range | startDate > endDate | Error: "Invalid date range" | Error displayed | Passed | 2025-10-10 10:35:00 |
| V9 | Payment | Invalid amount | amount: 0 | Error: "Amount must be positive" | Error displayed | Passed | 2025-10-10 10:40:00 |
| V10 | Contact Us | Empty message | message: empty | Error: "Message required" | Error displayed | Passed | 2025-10-10 10:45:00 |
| V11 | Worker Registration | Missing service type | serviceType: empty | Error: "Service type required for workers" | Error displayed | Passed | 2025-10-10 10:50:00 |
| V12 | Admin Login | Invalid admin credentials | Wrong username/password | Redirect to login with error | Redirected | Passed | 2025-10-10 10:55:00 |
| A1 | Registration | Async user creation & DB insert | Valid registration form | User saved to DB, success response | User saved | Passed | 2025-10-10 11:00:00 |
| A2 | Login | Async user verification & session creation | Valid credentials | User authenticated, session set | Authenticated | Passed | 2025-10-10 11:05:00 |
| A3 | Forgot Password | Async OTP generation & email send | Valid email | OTP stored in memory, email sent | OTP sent | Passed | 2025-10-10 11:10:00 |
| A4 | Property Listing | Async property save to DB | Valid property data | Property inserted in MongoDB | Inserted | Passed | 2025-10-10 11:15:00 |
| A5 | Property Search | Async query DB for properties | Search params (location, price) | Filtered properties returned | Returned | Passed | 2025-10-10 11:20:00 |
| A6 | Booking | Async booking creation & notification | Valid booking request | Booking saved, notification created | Saved | Passed | 2025-10-10 11:25:00 |
| A7 | Payment | Async payment process & status update | Valid payment details | Payment recorded, status updated | Recorded | Passed | 2025-10-10 11:30:00 |
| A8 | Worker Booking | Async worker assignment & email notify | Book worker service | Booking linked, email sent | Linked | Passed | 2025-10-10 11:35:00 |
| A9 | Admin Panel | Async fetch all users/properties | Admin dashboard load | Aggregated data from multiple models loaded | Loaded | Passed | 2025-10-10 11:40:00 |
| A10 | Contact Us | Async form submission to DB | Valid contact form | Contact saved to DB, success JSON response | Saved | Passed | 2025-10-10 11:45:00 |
| A11 | Unrent Property | Async update property status | Unrent action from owner dashboard | Property isRented set to false | Updated | Passed | 2025-10-10 11:50:00 |
| A12 | Maintenance Request | Async request creation & owner notify | Submit maintenance form | Request saved, notification to owner | Saved | Passed | 2025-10-10 11:55:00 |
