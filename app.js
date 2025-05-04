const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const session = require("express-session");
const Property = require("./models/property");
const Tenant = require("./models/tenant"); // New model
const Worker = require("./models/worker"); // New model
const Owner = require("./models/owner");   // New model
const Booking = require("./models/booking");
const Payment = require("./models/payment");
const Notification = require("./models/notification");
const Setting = require("./models/setting");
const propertyRoutes = require("./routes/property");
const workerRoutes = require("./routes/workers");


const Complaint = require('./models/complaint');
const Rating = require('./models/rating');
const RentalHistory = require('./models/rentalhistory');
const MaintananceRequest = require('./models/MaintenanceRequest');
const TenantRoutes=require("./routes/tenant");


require("dns").setDefaultResultOrder("ipv4first"); // Force IPv4




const app = express();
const PORT = 3000;

// Connect to MongoDB
mongoose.connect("mongodb://127.0.0.1:27017/rentease")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: "15mb" }));
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
const isAuthenticated = require("./middleware/auth");

// Pass user data to all views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// Routes

// Property Routes
app.use("/api/property", propertyRoutes);
app.use("/", workerRoutes);
app.use('/',TenantRoutes);



// Route for property listing page
app.get("/list-property", isAuthenticated, (req, res) => {
  if (req.session.user.userType !== "owner") {
    return redirectToDashboard(req, res);
  }
  res.render("pages/propertylisting");
});

// GET: Render Registration Page
app.get("/register", (req, res) => {
  res.render("pages/registration", { userType: "", serviceType: "" });
});

// POST: Handle Registration
app.post("/register", async (req, res) => {
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
    accountNo,
    upiid,
  } = req.body;

  try {
    // Check for existing user in all collections
    const existingUser = await Promise.any([
      Tenant.findOne({ email }),
      Worker.findOne({ email }),
      Owner.findOne({ email }),
    ].map(p => p.catch(() => null)));

    if (existingUser) {
      return res.render("pages/registration", {
        userType,
        serviceType,
        error: "Email already exists",
      });
    }

    let newUser;
    const id = (await Promise.all([
      Tenant.countDocuments(),
      Worker.countDocuments(),
      Owner.countDocuments(),
    ])).reduce((sum, count) => sum + count, 0) + 1;

    if (userType === "tenant") {
      newUser = new Tenant({
        id,
        firstName,
        lastName,
        email,
        phone,
        location,
        password,
      });
    } else if (userType === "worker") {
      newUser = new Worker({
        id,
        firstName,
        lastName,
        email,
        phone,
        location,
        serviceType,
        experience: Number(experience) || null,
        password,
      });
    } else if (userType === "owner") {
      newUser = new Owner({
        id,
        firstName,
        lastName,
        email,
        phone,
        location,
        numProperties: Number(numProperties) || null,
        password,
        accountNo,
        upiid,
      });
    } else {
      return res.render("pages/registration", {
        userType,
        serviceType,
        error: "Invalid user type",
      });
    }

    await newUser.save();
    console.log("New User Registered:", newUser);
    res.redirect("/login");
  } catch (err) {
    console.error("Error registering user:", err);
    res.status(500).send("Server Error");
  }
});

// GET: Render Login Page
app.get("/login", (req, res) => {
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
  return res.redirect("/");
}

// POST: Handle Login Logic
app.post("/login", async (req, res) => {
  console.log("POST /login received:", req.body);
  const { userType, email, password } = req.body;
  const errors = {};

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

  try {
    let user;
    if (userType === "tenant") {
      user = await Tenant.findOne({ email, password });
    } else if (userType === "worker") {
      user = await Worker.findOne({ email, password });
    } else if (userType === "owner") {
      user = await Owner.findOne({ email, password });
    } else {
      errors.auth = "Invalid user type";
      return res.render("pages/login", {
        userType,
        email,
        password: "",
        errors,
      });
    }

    if (!user) {
      errors.auth = "Invalid email, password, or user type";
      return res.render("pages/login", {
        userType,
        email,
        password: "",
        errors,
      });
    }

    req.session.user = user;
    console.log("Login successful, user ID:", user.id);
    redirectToDashboard(req, res);
  } catch (err) {
    console.error("Error during login:", err);
    res.status(500).send("Server Error");
  }
});

// Logout route
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

// Dashboard Routes
// app.get("/tenant_dashboard", isAuthenticated, (req, res) => {
//   const user = req.session.user;
//   if (user.userType !== "tenant") {
//     return redirectToDashboard(req, res);
//   }
//   res.render("pages/tenant_dashboard", { user });
// });

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

// Route to render search.ejs
app.get("/search", async (req, res) => {
  try {
    const properties = await Property.find({});
    res.render("pages/search1", { properties, request: req });
  } catch (err) {
    console.error("Error fetching properties:", err);
    res.status(500).send("Server Error");
  }
});

// Route to the property listing
// Route to the property listing page (form for owners)
app.get("/property_listing_page", isAuthenticated, (req, res) => {
  if (req.session.user.userType !== "owner") {
    return redirectToDashboard(req, res);
  }
  res.render("pages/property_listing_page");
});

// Route for property details
app.get("/property", async (req, res) => {
  const propertyId = req.query.id;
  try {
    const property = await Property.findById(propertyId).lean();
    if (!property) {
      return res.status(404).render("pages/propertydetails", { property: null });
    }
    res.render("pages/propertydetails", { property });
  } catch (err) {
    console.error("Error fetching property:", err);
    res.status(500).render("pages/propertydetails", { property: null, error: "Server Error" });
  }
});

// Other static routes
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

// Admin dashboard route
app.get("/admin", async (req, res) => {
  try {
    const properties = await Property.find({});
    const tenants = await Tenant.find({});
    const workers = await Worker.find({});
    const owners = await Owner.find({});
    const bookings = await Booking.find({});
    const payments = await Payment.find({});
    const notifications = await Notification.find({});
    const settings = await Setting.find({});
    
    const users = [...tenants, ...workers, ...owners]; // Combine users for display
    
    const stats = {
      totalProperties: await Property.countDocuments({}),
      activeRentals: await Booking.countDocuments({ status: "Active" }),
      pendingBookings: await Booking.countDocuments({ status: "Pending" }),
      cancelledBookings: await Booking.countDocuments({ status: "Cancelled" }),
      renters: await Tenant.countDocuments({}),
      totalRevenue: (await Payment.aggregate([
        { $match: { status: "Completed" } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]))[0]?.total || 0,
    };

    res.render("pages/admin", {
      properties,
      users,
      bookings,
      payments,
      notifications,
      settings,
      stats,
    });
  } catch (err) {
    console.error("Error fetching admin data:", err);
    res.status(500).send("Server Error");
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://127.0.0.1:${PORT}`);
});