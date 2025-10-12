# 🏠 RentEase – Home Rental Management System

### Group ID: 48

### SPOC: Syed Dheeraj Shahul

**Email:** dheerajshahul.s23@iiits.in 
**Roll No:** S20230010235

---

## 📘 Overview

**RentEase** is a full-stack **Home Rental Management System** built with **Node.js, Express.js, MongoDB, and EJS**.  
It streamlines the process of **renting, managing, and maintaining properties** by providing role-based dashboards for tenants, property owners, workers, and administrators.

The system allows users to register, list properties or services, make rental requests, manage ongoing rentals, and communicate seamlessly within a unified platform.

---

## 👥 Team Members and Contributions

| Member Name             | Role                                | Major Contributions                                                                                           |
| ----------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Syed Dheeraj Shahul** | Frontend & Backend Developer        | Developed Tenant, Worker, and Owner dashboards; implemented payment and notification system ;  implemented property management on user dashboard (unrenting modules) |
| **D. Revanth Kumar**    | Backend & Frontend Developer        | Integrated admin panel with all models; implemented property details page with filters and worker de-booking modules            |
| **A. Sai Satish**       | Frontend Developer                  | Implemented authentication (login & registration); implemented domestic services showcase page with filters and booking                                  |
| **B. Vignesh**          | Frontend Developer & UI/UX Designer | Developed property registration page with data storage and dynamic unified header navigation bar ; designed UI/UX components                                        |
| **Ganesh Koti Reddy**   | Frontend Developer & QA Engineer    | Developed my services module  in worker dashboard ; handled quality assurance and bug fixes                                      |

---

## ⚙️ Features

- 🔐 **Authentication System** – Secure registration and login for all users including forgot password reset mechanism 
- 🏡 **Owner Dashboard** – Owners can list, update, unrent properties and manage their earnings
- 👷 **Worker Dashboard** – Manage service listings, availability, bookings and earnings
- 👤 **Tenant Dashboard** – Search, view, book and manage properties and domestic worker services through interactive realtime dashboard.
- 💵 **Online Payment Model** -  Seamless integration of online rent payments and worker payments.
- 🤝 **Grivence resolvement system** - Maintainence  and complaints grivence system and the Realtime updates of the current status of the grevince from owner side.
- 🧰 **Admin Panel** – Monitor users, properties, and service requests across the platform
- 💬 **Contact Us Page** – For user inquiries , problem resolvent and support
- 📊 **Database Tracking** – Admin can view real-time data and log

---

## 🧠 Tech Stack

**Frontend:** EJS (Embedded JavaScript), HTML, CSS, JavaScript  
**Backend:** Node.js, Express.js  
**Database:** MongoDB (via Mongoose)  
**Version Control:** Git & GitHub

---

## 🚀 Getting Started

### **Prerequisites**

Make sure you have the following installed:

- [Node.js](https://nodejs.org/) (latest version)
- [MongoDB](https://www.mongodb.com/)
- npm (Node Package Manager)

---

### **Installation Steps**

1. **Clone the repository**
   ```bash
   git clone https://github.com/Dheeraj-shahul/ffsd_repo.git
   ```
2. **Navigate into the project folder**
   ```bash
   cd ffsd_repo
   ```
3. **Install dependencies**
   ```bash
   npm install
   ```
4. **Start the server**
   ```bash
   node app.js
   ```
5. **Open in browser**
   ```
   http://localhost:3000
   ```
   The web application will run on **port 3000** by default.

---

## 🧩 Project Structure

```
ffsd_repo/
│
├── app.js                  # Main server file
│
├── models/                 # MongoDB schemas
│
├── controllers/            # Business logic for models
│
├── routes/                 # API and web routes
│
├── middleware/
│   └── auth.js             # Authentication middleware
│
├── views/
│   ├── admin/              # Admin dashboard and management pages
│   ├── pages/              # User-facing EJS templates
│   ├── partials/           # Shared layouts (header, footer, etc.)
│   └── ...                 # Other EJS pages
│
├── public/                 # Static files (CSS, JS, Images)
│
├── network_evidence/       # Network tracking evidence
│
├── git-logs.txt            # Git commit logs
│
└── README_FULL.md          # Project documentation
```

---

## 🗂️ Key Files & EJS Pages

### **Authentication**

- `registration.ejs`
- `login.ejs`

### **Dashboards**

- `owner_dashboard.ejs`
- `tenant_dashboard.ejs`
- `worker_dashboard.ejs`
- `admin_dashboard.ejs`

### **Property & Service Management**

- `property_listing_page.ejs`
- `worker_register.ejs`
- `propertydetails.ejs`
- `service_details.ejs`
- `search1.ejs`
- `workerDetails.ejs`

### **Other Pages**

- `contact_us.ejs` – for contacting the team
- `admin1.ejs` – admin database tracking interface

---

## 🧾 Admin Functionalities

- Manage all users (tenants, owners, workers)
- View and delete property listings
- Monitor service requests
- Track overall system data

---

## 📸 Demo

🔗 

---

## 🧾 Evidence Locations

- **Network Evidence:** `/network_evidence/`
- **Git Logs:** `git-logs.txt`

---

## 🧑‍💻 Developers’ Note

RentEase aims to simplify the home rental and property management experience by connecting tenants, owners, and service providers on a single platform.  
The project demonstrates seamless integration between frontend and backend using **Express.js and MongoDB**, with role-based functionalities for each user type.

---

## 🏁 Conclusion

RentEase is a scalable, user-friendly rental management platform designed for real-world application and academic demonstration.  
It provides end-to-end functionality from property listing to booking and service management — all under one roof.

---

### 🧾 License

This project is for academic and educational purposes under the Full Stack Development course submission (FFSD).

---

### 👨‍💻 Developed by Team 48

**RentEase – Simplifying Home Rentals**
