# Test Plan – RentEase

This document outlines the validation and asynchronous test cases used to verify the functionality and reliability of the RentEase Home Rental Management System.

## ✅ Validation Test Cases

| Test Case ID | Module           | Description            | Input            | Expected Result                    | Actual Result     | Status    |
| ------------ | ---------------- | ---------------------- | ---------------- | ---------------------------------- | ----------------- | --------- |
| V1           | Registration     | Check empty fields     | All fields empty | Display "All fields are required"  | Message displayed | ✅ Passed |
| V2           | Registration     | Validate email format  | dheeraj@abc      | Display "Invalid email format"     | Message displayed | ✅ Passed |
| V3           | Registration     | Duplicate email check  | Existing email   | Display "Email already registered" | Message displayed | ✅ Passed |
| V4           | Property Listing | Validate price field   | Negative value   | Display "Enter a valid price"      | Message displayed | ✅ Passed |
| V5           | Contact Us       | Validate message field | Empty            | Display "Message required"         | Message displayed | ✅ Passed |

## ⚙️ Asynchronous Test Cases

| Test Case ID | Module           | Async Operation                     | Expected Result                                   | Actual Result              | Status    |
| ------------ | ---------------- | ----------------------------------- | ------------------------------------------------- | -------------------------- | --------- |
| A1           | Login            | Async user verification via MongoDB | Valid user should be authenticated and redirected | Redirected to dashboard    | ✅ Passed |
| A2           | Property Listing | Async property fetch                | Properties should load dynamically from DB        | Fetched successfully       | ✅ Passed |
| A3           | Worker Dashboard | Async job updates                   | Status updates should reflect instantly           | Real-time update confirmed | ✅ Passed |
| A4           | Admin Panel      | Async data aggregation              | All models’ data loaded correctly                 | Data displayed properly    | ✅ Passed |
| A5           | Contact Us       | Async form submission               | Message should be stored in DB and alert shown    | Stored & alert displayed   | ✅ Passed |

## 🧰 Tools & Environment

- **Testing Tools:** Postman, Browser Console, MongoDB Compass
- **Framework:** Node.js (v20+), Express.js
- **Database:** MongoDB
- **Browser:** Chrome v141
- **OS:** Windows 11

## 📊 Summary

| Total Test Cases | Passed | Failed | Remarks                                    |
| ---------------- | ------ | ------ | ------------------------------------------ |
| 10               | 10     | 0      | All functionalities validated successfully |

✅ All major validation and asynchronous operations are functioning as expected.
