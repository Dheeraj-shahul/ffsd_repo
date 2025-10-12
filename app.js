const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const session = require("express-session");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const Property = require("./models/property");
const Tenant = require("./models/tenant");
const Worker = require("./models/worker");
const Owner = require("./models/owner");
const Booking = require("./models/booking");
const Payment = require("./models/payment");
const Notification = require("./models/notification");
const Setting = require("./models/setting");
const Contact = require("./models/contactus"); // new Contact model
const Complaint = require("./models/complaint");
const Rating = require("./models/rating");
const RentalHistory = require("./models/rentalhistory");
const MaintenanceRequest = require("./models/MaintenanceRequest");
const Admin = require("./models/admin");

const WorkerPayment = require("./models/workerPayment");

const propertyRoutes = require("./routes/property");
const workerRoutes = require("./routes/workers");
const TenantRoutes = require("./routes/tenant");
const ownerRoutes = require("./routes/owner");
const bookingRoutes = require("./routes/bookingRoutes");

// Admin Routes
const adminRoutes = require("./routes/admin");
const analyticsRoutes = require("./routes/analytics");
// In app.js, add this route after the existing admin route
const adminContactUsController = require("./controllers/adminContactUsController");

require("dns").setDefaultResultOrder("ipv4first");

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
mongoose
  .connect(
    "mongodb+srv://revanthkumardompaka:qqo8F9xCiY5DPQLT@ffsd.pjcw0o6.mongodb.net/rentease"
  )
  .then(() => console.log("Connected to MongoDB Atlas"))
  .catch((err) => console.error("MongoDB Atlas connection error:", err));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: "15mb" }));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 },
  })
);

const isAuthenticated = require("./middleware/auth");

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// In-memory OTP store: { email -> { otp, expires } }
const otpStore = new Map();

// Rate limiter for /forgot-password
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests
  message: "Too many OTP requests, please try again later.",
});

// Generate a 6-digit OTP
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Routes
app.use("/api/property", propertyRoutes);
app.use("/", workerRoutes);
app.use("/tenant", TenantRoutes);
app.use("/", ownerRoutes);
app.use("/", bookingRoutes);
app.use("/admin", adminRoutes);
app.use("/api", analyticsRoutes);

// Forgot Password Page
app.get("/forgot-password", (req, res) => {
  res.render("pages/forgot_password", { error: req.query.error || "" });
});

// Dashboard Route
app.get("/dashboard", isAuthenticated, (req, res) => {
  const userType = req.session.user?.userType;
  if (!userType) {
    return res.redirect("/login?error=Please log in");
  }
  return res.redirect(getDashboardUrl(userType));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render("pages/error", {
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err : {},
  });
});

// Forgot Password - Send OTP
app.post("/forgot-password", forgotPasswordLimiter, async (req, res) => {
  const { email } = req.body;

  try {
    let user = null;
    let userModel = null;

    const tenant = await Tenant.findOne({ email });
    const owner = await Owner.findOne({ email });
    const worker = await Worker.findOne({ email });

    if (tenant) {
      user = tenant;
      userModel = "tenant";
    } else if (owner) {
      user = owner;
      userModel = "owner";
    } else if (worker) {
      user = worker;
      userModel = "worker";
    }

    if (!user) {
      return res.json({ success: false, error: "Email not found" });
    }

    const otp = generateOtp();
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    otpStore.set(email, { otp, expires: otpExpires });

    setTimeout(() => {
      const entry = otpStore.get(email);
      if (entry && entry.expires <= Date.now()) otpStore.delete(email);
    }, 11 * 60 * 1000);

    return res.json({ success: true, message: "OTP generated", otp });
  } catch (err) {
    console.error("Error in forgot password flow:", err);
    return res.json({
      success: false,
      error: "Server error. Please try again later.",
    });
  }
});

// Verify OTP
app.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  try {
    const entry = otpStore.get(email);
    if (!entry) return res.json({ success: false, error: "No OTP requested" });
    if (Date.now() > entry.expires) {
      otpStore.delete(email);
      return res.json({ success: false, error: "OTP has expired" });
    }
    if (entry.otp !== String(otp))
      return res.json({ success: false, error: "Invalid OTP" });
    return res.json({ success: true, message: "OTP verified" });
  } catch (err) {
    console.error("Error verifying OTP:", err);
    return res.json({ success: false, error: "Server error" });
  }
});

// Reset Password
app.post("/reset-password", async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!password || password.length < 8) {
      return res.json({
        success: false,
        error: "Password must be at least 8 characters long",
      });
    }

    let user = null;
    let userModel = null;

    const tenant = await Tenant.findOne({ email }).select("+password");
    const owner = await Owner.findOne({ email }).select("+password");
    const worker = await Worker.findOne({ email }).select("+password");

    if (tenant) {
      user = tenant;
      userModel = "tenant";
    } else if (owner) {
      user = owner;
      userModel = "owner";
    } else if (worker) {
      user = worker;
      userModel = "worker";
    }

    if (!user) {
      return res.json({ success: false, error: "User not found" });
    }

    const entry = otpStore.get(email);
    if (!entry) {
      return res.json({ success: false, error: "Please verify OTP first" });
    }
    if (Date.now() > entry.expires) {
      otpStore.delete(email);
      return res.json({
        success: false,
        error: "OTP has expired, please request a new one",
      });
    }

    user.password = password;
    await user.save();
    otpStore.delete(email);

    return res.json({ success: true, message: "Password reset successful" });
  } catch (err) {
    console.error("Error resetting password:", err);
    return res.json({ success: false, error: "Server error" });
  }
});

// GET: Render Login Page
app.get("/login", (req, res) => {
  if (req.session.user) {
    return res.redirect("/dashboard");
  }
  res.render("pages/login", {
    userType: "",
    email: "",
    password: "",
    error: req.query.error || "",
    errors: {},
  });
});

// Login Route
app.post("/login", async (req, res) => {
  const { userType, email, password } = req.body;
  try {
    if (!userType || !email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    let user;
    let Model;

    if (userType === "tenant") {
      Model = Tenant;
    } else if (userType === "owner") {
      Model = Owner;
    } else if (userType === "worker") {
      Model = Worker;
    } else {
      return res.status(400).json({ error: "Invalid user type" });
    }

    user = await Model.findOne({ email }).select("+password");

    if (!user) {
      return res.status(404).json({ error: "Create an account first" });
    }

    if (!user.password) {
      return res
        .status(401)
        .json({ error: "Password not set for this account" });
    }

    if (user.password !== password) {
      return res.status(401).json({ error: "Incorrect password" });
    }

    req.session.user = {
      _id: user._id.toString(),
      userType,
      email: user.email,
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      phone: user.phone || "",
      location: user.location || "",
      emailNotifications: user.emailNotifications || false,
      smsNotifications: user.smsNotifications || false,
      rentReminders: user.rentReminders || false,
      maintenanceUpdates: user.maintenanceUpdates || false,
      newListings: user.newListings || false,
    };

    return res.json({ success: true, redirectUrl: getDashboardUrl(userType) });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// Registration Route
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
  } = req.body;

  try {
    // Log received password for debugging
    console.log("Received password:", JSON.stringify(password));

    // Basic validation
    if (!userType || !firstName || !lastName || !email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ error: "Password must be at least 8 characters" });
    }

    // Check for existing user
    const existingUser =
      (await Tenant.findOne({ email })) ||
      (await Owner.findOne({ email })) ||
      (await Worker.findOne({ email }));

    if (existingUser) {
      return res.status(400).json({ error: "Email already exists" });
    }

    // Use plain text password as requested
    const plainPassword = password;

    let newUser;

    if (userType === "tenant") {
      newUser = new Tenant({
        firstName,
        lastName,
        email,
        phone,
        location,
        password: plainPassword,
        userType: "tenant",
      });
    } else if (userType === "worker") {
      if (!serviceType || !experience) {
        return res
          .status(400)
          .json({ error: "Service type and experience required for workers" });
      }
      newUser = new Worker({
        firstName,
        lastName,
        email,
        phone,
        location,
        serviceType,
        experience: Number(experience) || 0,
        password: plainPassword,
        userType: "worker",
      });
    } else if (userType === "owner") {
      if (!numProperties || numProperties < 1) {
        return res
          .status(400)
          .json({ error: "Number of properties required for owners" });
      }
      newUser = new Owner({
        firstName,
        lastName,
        email,
        phone,
        location,
        numProperties: Number(numProperties) || 0,
        password: plainPassword,
        userType: "owner",
        notifications: {
          email: true,
          sms: false,
          payment: true,
          complaint: true,
          maintenance: true,
        },
      });
    } else {
      return res.status(400).json({ error: "Invalid user type" });
    }

    // Log user data before saving
    console.log("Saving user with password:", JSON.stringify(newUser.password));
    await newUser.save();
    console.log("User saved successfully");

    return res.json({
      success: true,
      redirectUrl: "/login",
      message: "Registration successful",
    });
  } catch (err) {
    console.error("Registration error:", err);
    return res
      .status(500)
      .json({ error: `Registration failed: ${err.message}` });
  }
});

// Helper function to get dashboard URL based on userType
function getDashboardUrl(userType) {
  if (userType === "tenant") {
    return "/tenant/tenant_dashboard";
  } else if (userType === "owner") {
    return "/owner_dashboard";
  } else if (userType === "worker") {
    return "/worker_dashboard";
  }
  return "/login?error=Invalid user type";
}

// Logout route
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Session destroy error:", err);
    }
    res.redirect("/");
  });
});

// Static Routes
app.get("/register", (req, res) => {
  const data = {
    error: null,
    userType: req.query.userType || "tenant",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    location: "",
    serviceType: "",
    experience: "",
    numProperties: "",
    errors: {},
    success: false,
  };
  res.render("pages/registration", data);
});
// Logout route
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Session destroy error:", err);
    }
    res.redirect("/");
  });
});

// app.get("/owner_dashboard", isAuthenticated, (req, res) => {
//   const user = req.session.user;
//   if (user.userType !== "owner") {
//     return redirectToDashboard(req, res);
//   }
//   res.render("pages/owner_dashboard", { user });
// });

// app.get("/worker_dashboard", isAuthenticated, (req, res) => {
//   const user = req.session.user;
//   if (user.userType !== "worker") {
//     return redirectToDashboard(req, res);
//   }
//   res.render("pages/worker_dashboard", { user });
// });

app.get("/", async (req, res) => {
  try {
    // Fetch properties for Popular Listings
    // Popular Listings (show only not rented, verified, and marked popular)
    const propertiesData = await Property.find({
      isRented: false,
      isVerified: true,
      is_popular: true,
    })
      .select("_id location subtype price images")
      .limit(10)
      .lean();

    // Slider Container (show only not rented, verified properties)
    const sliderPropertiesData = await Property.find({
      isRented: false,
      isVerified: true,
    })
      .select("name description images _id")
      .limit(10)
      .lean();

    // Render the index.ejs template with fetched data
    res.render("pages/index", {
      propertiesData,
      sliderPropertiesData,
    });
  } catch (error) {
    console.error("Error fetching properties:", error);
    // Render with empty arrays and an error message if query fails
    res.render("pages/index", {
      propertiesData: [],
      sliderPropertiesData: [],
      error: "Failed to load properties",
    });
  }
});

// Route to render search.ejs
// Route to render search.ejs
app.get("/search", async (req, res) => {
  try {
    const {
      location,
      "property-type": propertyType,
      price,
      "bedroom-no": bedrooms,
      "bathroom-no": bathrooms,
      furnishing,
      amenities,
    } = req.query;

    let query = {
      $and: [
        { $or: [{ isRented: false }, { isRented: { $exists: false } }] },
        { isVerified: true },
      ],
    };

    if (location) {
      query.location = { $regex: location, $options: "i" };
    }
    if (propertyType) {
      query.type = propertyType;
    }
    if (price) {
      query.price = { $lte: Number(price) };
    }
    if (bedrooms) {
      query.beds = Number(bedrooms);
    }
    if (bathrooms) {
      query.baths = Number(bathrooms);
    }
    if (furnishing) {
      query.furnished = furnishing;
    }
    if (amenities) {
      const amenitiesArray = amenities.split(",").map((item) => item.trim());
      if (amenitiesArray.length > 0) {
        query.amenities = { $all: amenitiesArray };
      }
    }

    const properties = await Property.find(query);
    res.render("pages/search1", { properties, request: req });
  } catch (err) {
    console.error("Error fetching properties for search:", err);
    res.status(500).send("Server Error");
  }
});

// Property Listing Page
app.get("/property_listing_page", isAuthenticated, (req, res) => {
  if (req.session.user.userType !== "owner") {
    return res.redirect(getDashboardUrl(req.session.user.userType));
  }
  res.render("pages/property_listing_page");
});

// Property Details Route
app.get("/property", async (req, res) => {
  const propertyId = req.query.id;
  try {
    const property = await Property.findById(propertyId).lean();
    if (!property) {
      return res
        .status(404)
        .render("pages/propertydetails", { property: null });
    }
    res.render("pages/propertydetails", { property });
  } catch (err) {
    console.error("Error fetching property:", err);
    res.status(500).render("pages/propertydetails", {
      property: null,
      error: "Server Error",
    });
  }
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

// POST route to handle contact form submission
app.post("/submit-form", async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res
        .status(400)
        .json({ error: "Name, email, subject, and message are required" });
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    if (!emailRegex.test(email)) {
      return res
        .status(400)
        .json({ error: "Please provide a valid Gmail address" });
    }

    if (phone && !/^\d{10}$/.test(phone)) {
      return res
        .status(400)
        .json({ error: "Please provide a valid 10-digit phone number" });
    }

    const contact = new Contact({
      name,
      email,
      phone: phone || "",
      subject,
      message,
    });

    await contact.save();

    res.status(200).json({ message: "Form submitted successfully" });
  } catch (error) {
    console.error("Error submitting form:", error);
    res.status(500).json({ error: "Server error, please try again later" });
  }
});

app.get("/about_us", (req, res) => {
  res.render("pages/about_us");
});

// Authentication Middleware for Admin
function isAuthenticate(req, res, next) {
  if (req.session.adminId) {
    return next();
  }
  res.redirect("/admin/login");
}

// Admin Login Routes
app.get("/admin/login", (req, res) => {
  res.render("pages/adminlogin", { error: null });
});

app.post("/admin/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const admin = await Admin.findOne({ username });
    if (!admin || admin.password !== password) {
      return res.render("pages/adminlogin", {
        error: "Invalid username or password",
      });
    }
    req.session.adminId = admin._id.toString();
    res.redirect("/admin");
  } catch (err) {
    console.error("Login error:", err);
    res.render("pages/adminlogin", { error: "Server error" });
  }
});

// In app.js, update the admin route
app.get("/admin", isAuthenticate, async (req, res) => {
  try {
    

    // Existing dashboard logic remains unchanged
    const totalProperties = await Property.countDocuments();
    const totalRenters = await Tenant.countDocuments();
    const totalOwners = await Owner.countDocuments();
    const totalWorkers = await Worker.countDocuments();
    const activeRentals = await Booking.countDocuments({ status: "Active" });
    const pendingBookings = await Booking.countDocuments({ status: "Pending" });
    const cancelledBookings = await Booking.countDocuments({
      status: "Terminated",
    });
    const activeUsers =
      (await Tenant.countDocuments({ status: "Active" })) +
      (await Worker.countDocuments({ status: "Active" })) +
      (await Owner.countDocuments({ status: "Active" }));

    const totalRevenueResult = await Payment.aggregate([
      { $match: { status: "Paid" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalRevenue = totalRevenueResult[0]?.total || 0;

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const revenueDailyResult = await Payment.aggregate([
      { $match: { status: "Paid", paymentDate: { $gte: oneDayAgo } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const revenueDaily = revenueDailyResult[0]?.total || 0;

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const revenueWeeklyResult = await Payment.aggregate([
      { $match: { status: "Paid", paymentDate: { $gte: oneWeekAgo } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const revenueWeekly = revenueWeeklyResult[0]?.total || 0;

    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const revenueMonthlyResult = await Payment.aggregate([
      { $match: { status: "Paid", paymentDate: { $gte: oneMonthAgo } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const revenueMonthly = revenueMonthlyResult[0]?.total || 0;

    const propertiesActive = await Property.countDocuments({
      status: "Active",
    });
    const propertiesPending = await Property.countDocuments({
      status: "Pending",
    });
    const workersAvailable = await Worker.countDocuments({
      availability: true,
    });

    const userGrowth =
      (await Tenant.countDocuments({ createdAt: { $gte: oneMonthAgo } })) +
      (await Worker.countDocuments({ createdAt: { $gte: oneMonthAgo } })) +
      (await Owner.countDocuments({ createdAt: { $gte: oneMonthAgo } }));

    const bookingStatusDistribution = {
      active: activeRentals,
      pending: pendingBookings,
      cancelled: cancelledBookings,
    };

    const stats = {
      totalProperties,
      totalRenters,
      totalOwners,
      totalWorkers,
      activeRentals,
      pendingBookings,
      cancelledBookings,
      activeUsers,
      totalRevenue,
      revenueDaily,
      revenueWeekly,
      revenueMonthly,
      propertiesActive,
      propertiesPending,
      workersAvailable,
      userGrowth,
      bookingStatusDistribution,
    };

    const properties = await Property.find()
      .populate("ownerId", "firstName lastName")
      .populate("tenantId", "firstName lastName")
      .populate({
        path: "activeWorkers",
        select: "firstName lastName",
        match: { _id: { $exists: true } },
      })
      .lean();
    properties.forEach((p) => {
      p.id = p._id.toString();
      p.owner = p.ownerId
        ? `${p.ownerId.firstName} ${p.ownerId.lastName}`
        : "N/A";
      p.tenant = p.tenantId
        ? `${p.tenantId.firstName} ${p.tenantId.lastName}`
        : "N/A";
      p.activeWorkers =
        p.activeWorkers?.map((w) => ({
          name:
            w.firstName && w.lastName ? `${w.firstName} ${w.lastName}` : "N/A",
        })) || [];
    });

    const tenants = await Tenant.find().lean();
    const workers = await Worker.find().lean();
    const owners = await Owner.find().lean();

    const users = [
      ...tenants.map((t) => ({
        id: t._id.toString(),
        firstName: t.firstName,
        lastName: t.lastName,
        userType: t.userType,
        email: t.email,
        phone: t.phone,
        address: t.location,
        createdAt: t.createdAt,
        status: t.status,
        tenantBookings: null,
        serviceType: null,
        experience: null,
        numProperties: null,
        accountNo: null,
        upiid: null,
      })),
      ...workers.map((w) => ({
        id: w._id.toString(),
        firstName: w.firstName,
        lastName: w.lastName,
        userType: w.userType,
        email: w.email,
        phone: w.phone,
        address: w.location,
        createdAt: w.createdAt,
        status: w.status,
        tenantBookings: null,
        serviceType: w.serviceType,
        experience: w.experience,
        numProperties: null,
        accountNo: null,
        upiid: null,
      })),
      ...owners.map((o) => ({
        id: o._id.toString(),
        firstName: o.firstName,
        lastName: o.lastName,
        userType: o.userType,
        email: o.email,
        phone: o.phone,
        address: o.location,
        createdAt: o.createdAt,
        status: o.status,
        tenantBookings: null,
        serviceType: null,
        experience: null,
        numProperties: o.numProperties || o.propertyIds?.length || 0,
        accountNo: o.accountNo,
        upiid: o.upiid,
      })),
    ];

    for (let user of users) {
      if (user.userType === "tenant") {
        user.tenantBookings = await Booking.countDocuments({
          tenantId: user.id,
        });
      }
    }

    const bookings = await Booking.find()
      .populate("tenantId", "firstName lastName")
      .populate("propertyId", "name")
      .populate("assignedWorker", "firstName lastName")
      .lean();
    bookings.forEach((b) => {
      b.id = b._id.toString();
      b.userName = b.tenantId
        ? `${b.tenantId.firstName} ${b.tenantId.lastName}`
        : "N/A";
      b.propertyName = b.propertyId?.name || "N/A";
      b.workerName = b.assignedWorker
        ? `${b.assignedWorker.firstName} ${b.assignedWorker.lastName}`
        : "N/A";
      b.user = b.tenantId?._id;
      b.property = b.propertyId?._id;
    });

    const payments = await Payment.find()
      .populate("tenantId", "firstName lastName")
      .lean();
    payments.forEach((p) => {
      p.id = p._id.toString();
      p.userName = p.tenantId
        ? `${p.tenantId.firstName} ${p.tenantId.lastName}`
        : "N/A";
      p.user = p.tenantId?._id;
    });

    const notifications = await Notification.find()
      .populate("worker", "firstName lastName")
      .populate("recipient", "firstName lastName")
      .lean();
    notifications.forEach((n) => {
      n.id = n._id.toString();
      n.workerName = n.worker
        ? `${n.worker.firstName} ${n.worker.lastName}`
        : "N/A";
      n.recipientName = n.recipient
        ? `${n.recipient.firstName} ${n.recipient.lastName}`
        : "N/A";
    });

    const maintenanceRequests = await MaintenanceRequest.find()
      .populate("propertyId", "name ownerId")
      .populate({
        path: "propertyId.ownerId",
        select: "firstName lastName",
      })
      .populate("tenantId", "firstName lastName")
      .lean();
    maintenanceRequests.forEach((m) => {
      m.id = m._id.toString();
      m.propertyName = m.propertyId?.name || "N/A";
      m.tenantName = m.tenantId
        ? `${m.tenantId.firstName} ${m.tenantId.lastName}`
        : "N/A";
      m.ownerName = m.propertyId?.ownerId
        ? `${m.propertyId.ownerId.firstName} ${m.propertyId.ownerId.lastName}`
        : "N/A";
    });

    // Add contact submissions
    const contactSubmissions = await Contact.find().lean();
    contactSubmissions.forEach((s) => {
      s.id = s._id.toString();
      s.submittedAt = s.submittedAt
        ? new Date(s.submittedAt).toLocaleString()
        : "N/A";
    });

    // Add workerPayments
    const workerPayments = await WorkerPayment.find()
      .populate("tenantId", "firstName lastName")
      .populate("workerId", "firstName lastName")
      .sort({ createdAt: -1 })
      .lean();
    workerPayments.forEach((p) => {
      p.id = p._id.toString();
      p.paidByName = p.tenantId
        ? `${p.tenantId.firstName} ${p.tenantId.lastName}`
        : p.userName || "N/A";
      p.paidById = p.tenantId?._id;
      p.receivedByName = p.workerId
        ? `${p.workerId.firstName} ${p.workerId.lastName}`
        : "N/A";
      p.receivedById = p.workerId?._id;
    });

    res.render("pages/admin1", {
      stats,
      properties,
      users,
      bookings,
      payments,
      notifications,
      maintenanceRequests,
      contactSubmissions,
      workerPayments,
    });
  } catch (err) {
    console.error("Error fetching dashboard data:", err);
    res.status(500).send("Server Error");
  }
});

app.get("/admin/message/:id", isAuthenticate, async (req, res) => {
  try {
    const submission = await Contact.findById(req.params.id).lean();
    if (!submission) {
      return res.status(404).send("Message not found");
    }
    submission.id = submission._id.toString();
    submission.submittedAt = submission.submittedAt
      ? new Date(submission.submittedAt).toLocaleString()
      : "N/A";
    res.render("admin/message-view", { submission });
  } catch (err) {
    console.error("Error fetching message details:", err);
    res.status(500).send("Server Error");
  }
});
// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
