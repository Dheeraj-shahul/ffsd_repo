const express = require("express");
const fs = require("fs");
const path = require("path");
const session = require("express-session"); // Add this import
const app = express();
const PORT = 3000;

// import data
const properties = require("./properties.js");
const initialUsers = require("./users.js");

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

// Session middleware setup
app.use(
  session({
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 3600000 }, // 1 hour
  })
);

// Authentication middleware
function isAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  }
  res.redirect("/login");
}

// Load initial users
const usersFilePath = path.join(__dirname, "users.js");

// In-memory user storage (will reset on restart)
let users = [...initialUsers];

// Helper function to save users to users.js
function saveUsers(updatedUsers) {
  fs.writeFileSync(
    usersFilePath,
    `// users.js – Temporary in-memory storage\n\nconst users = ${JSON.stringify(
      updatedUsers,
      null,
      2
    )};\n\nmodule.exports = users;\n`
  );
}

// Pass user data to all views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

app.get("/workerDetails", (req, res) => {
  res.render("pages/workerDetails");
});

// GET: Render Registration Page
app.get("/register", (req, res) => {
  res.render("pages/registration", { userType: "", serviceType: "" });
});

// Signup route
app.post("/register", (req, res) => {
  const {
    userType,
    firstName,
    lastName,
    email,
    phone,
    location,
    serviceType,
    experience,
    numProperties,
    password,
  } = req.body;

  const newUser = {
    id: users.length + 1,
    userType,
    firstName,
    lastName,
    email,
    phone,
    location,
    serviceType: userType === "worker" ? serviceType : null,
    experience: userType === "worker" ? Number(experience) || null : null,
    numProperties:
      userType === "homeowner" ? Number(numProperties) || null : null,
    password,
  };

  users.push(newUser);
  console.log("New User Registered:", newUser);

  // Save updated users list
  saveUsers(users);

  res.redirect("/login");
});

// GET: Render Login Page
app.get("/login", (req, res) => {
  // If user is already logged in, redirect to appropriate dashboard
  if (req.session.user) {
    return redirectToDashboard(req, res);
  }

  res.render("pages/login", {
    userType: "",
    email: "",
    password: "",
    error: req.query.error || "",
    errors: {},
  });
});

// Helper function to redirect to appropriate dashboard
function redirectToDashboard(req, res) {
  const user = req.session.user;
  if (user.userType === "tenant") {
    return res.redirect("/tenant_dashboard");
  } else if (user.userType === "owner") {
    return res.redirect("/owner_dashboard");
  } else if (user.userType === "worker") {
    return res.redirect("/worker_dashboard");
  }
  // Default fallback
  return res.redirect("/");
}

// POST: Handle Login Logic
app.post("/login", (req, res) => {
  console.log("POST /login received:", req.body);
  const { userType, email, password } = req.body;
  const errors = {};

  // Basic validation
  if (!userType) errors.userType = "Role is required";
  if (!email) errors.email = "Email is required";
  if (!password) errors.password = "Password is required";

  if (Object.keys(errors).length > 0) {
    return res.render("pages/login", {
      userType,
      email,
      password: "",
      errors,
    });
  }

  // Check against users array (includes both initial and newly registered)
  const user = users.find(
    (u) =>
      u.email === email && u.password === password && u.userType === userType
  );

  if (!user) {
    console.log("No user found, setting auth error");
    errors.auth = "Invalid email, password, or user type";
    console.log("Errors object before render:", errors);
    return res.render("pages/login", {
      userType,
      email,
      password: "",
      errors,
    });
  } else {
    // Store user in session
    req.session.user = user;

    // Successful login - redirect based on user type
    console.log("Login successful, user ID:", user.id);
    redirectToDashboard(req, res);
  }
});

// Logout route
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

// Dashboard Routes (with session protection)
app.get("/tenant_dashboard", isAuthenticated, (req, res) => {
  const user = req.session.user;
  if (user.userType !== "tenant") {
    return redirectToDashboard(req, res);
  }
  res.render("pages/tenant_dashboard", { user });
});

app.get("/owner_dashboard", isAuthenticated, (req, res) => {
  const user = req.session.user;
  if (user.userType !== "owner") {
    return redirectToDashboard(req, res);
  }
  res.render("pages/owner_dashboard", { user });
});

app.get("/worker_dashboard", isAuthenticated, (req, res) => {
  const user = req.session.user;
  if (user.userType !== "worker") {
    return redirectToDashboard(req, res);
  }
  res.render("pages/worker_dashboard", { user });
});

// Route for the main page
app.get("/", (req, res) => {
  res.render("pages/index");
});

app.get("/header", (req, res) => {
  res.render("partials/header");
});

// Route to render search.ejs
app.get("/search", (req, res) => {
  res.render("pages/search1", { properties, request: req });
});

// Route to the property listing
app.get("/property_listing_page", (req, res) => {
  res.render("pages/property_listing_page", { properties, request: req });
});

// Route for property details
app.get("/property", (req, res) => {
  const propertyId = req.query.id;
  const property = properties.find((p) => p.id == propertyId);

  if (!property) {
    return res.status(404).send("Property not found");
  }

  res.render("pages/propertydetails", { property });
});

app.get("/worker_register", (req, res) => {
  res.render("pages/worker_register");
});

app.get("/faq", (req, res) => {
  res.render("pages/FAQ");
});

app.get("/privacy_policy", (req, res) => {
  res.render("pages/privacy_policy");
});

app.get("/contact_us", (req, res) => {
  res.render("pages/contact_us");
});

app.get("/about_us", (req, res) => {
  res.render("pages/about_us");
});
// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://127.0.0.1:${PORT}`);
});
