const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const session = require("express-session");
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");
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
const Contact = require('./models/contactus'); // new Contact model
const Complaint = require("./models/complaint");
const Rating = require("./models/rating");
const RentalHistory = require("./models/rentalhistory");
const MaintenanceRequest = require("./models/MaintenanceRequest");
const Admin = require("./models/admin");

const propertyRoutes = require("./routes/property");
const workerRoutes = require("./routes/workers");
const TenantRoutes = require("./routes/tenant");
const ownerRoutes = require("./routes/owner");
const bookingRoutes = require("./routes/bookingRoutes");
const adminRoutes = require("./routes/admin");
const analyticsRoutes = require("./routes/analytics");

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

// Validate email configuration
if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
  console.error('Email configuration missing. Please check your .env file.');
  console.error('GMAIL_USER and GMAIL_PASS must be set for password reset functionality.');
  console.error('See README.md for setup instructions.');
}

// Import email utilities
const { sendOTPEmail, verifyEmailConfig } = require('./utils/emailUtils');

// Verify email configuration on startup
verifyEmailConfig().then(isValid => {
  if (isValid) {
    console.log('✅ Email system is ready');
  } else {
    console.error('⚠️ Email system is not properly configured');
  }
});

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
    console.log('Forgot password request for:', email);
    
    // Try to find user in each model
    let user = null;
    let userModel = null;
    
    const tenant = await Tenant.findOne({ email });
    const owner = await Owner.findOne({ email });
    const worker = await Worker.findOne({ email });
    
    if (tenant) {
      user = tenant;
      userModel = 'tenant';
    } else if (owner) {
      user = owner;
      userModel = 'owner';
    } else if (worker) {
      user = worker;
      userModel = 'worker';
    }

    if (!user) {
      console.log('Email not found:', email);
      return res.json({ success: false, error: "Email not found" });
    }

    const otp = generateOtp();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    console.log('Generated OTP for user:', {
      email,
      userModel,
      otpLength: otp.length,
      expires: otpExpires
    });

    // Save OTP to user record first
    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    // Send OTP email using the new utility
    const emailSent = await sendOTPEmail(email, otp);
    
    if (!emailSent) {
      // If email fails, remove the OTP from user record
      user.otp = null;
      user.otpExpires = null;
      await user.save();
      return res.json({ success: false, error: "Failed to send OTP. Please try again." });
    }

    return res.json({ success: true, message: "OTP sent to your email" });
  } catch (err) {
    console.error("Error in forgot password flow:", err);
    return res.json({ success: false, error: "Server error. Please try again later." });
  }
});

// Verify OTP
app.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  try {
    console.log('Verifying OTP for:', email);

    // Find user in each model
    let user = null;
    let userModel = null;
    
    const tenant = await Tenant.findOne({ email });
    const owner = await Owner.findOne({ email });
    const worker = await Worker.findOne({ email });
    
    if (tenant) {
      user = tenant;
      userModel = 'tenant';
    } else if (owner) {
      user = owner;
      userModel = 'owner';
    } else if (worker) {
      user = worker;
      userModel = 'worker';
    }

    if (!user) {
      console.log('User not found for OTP verification:', email);
      return res.json({ success: false, error: "User not found" });
    }

    console.log('OTP verification attempt:', {
      email,
      userModel,
      hasOtp: !!user.otp,
      otpMatches: user.otp === otp,
      otpExpired: user.otpExpires < Date.now()
    });

    if (!user.otp) {
      return res.json({ success: false, error: "No OTP requested" });
    }

    if (user.otp !== otp) {
      return res.json({ success: false, error: "Invalid OTP" });
    }

    if (user.otpExpires < Date.now()) {
      return res.json({ success: false, error: "OTP has expired" });
    }

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
    console.log('Password reset attempt for:', email);

    if (!password || password.length < 8) {
      return res.json({ 
        success: false, 
        error: "Password must be at least 8 characters long" 
      });
    }

    // Find user in each model
    let user = null;
    let userModel = null;
    
    const tenant = await Tenant.findOne({ email }).select('+password');
    const owner = await Owner.findOne({ email }).select('+password');
    const worker = await Worker.findOne({ email }).select('+password');
    
    if (tenant) {
      user = tenant;
      userModel = 'tenant';
    } else if (owner) {
      user = owner;
      userModel = 'owner';
    } else if (worker) {
      user = worker;
      userModel = 'worker';
    }

    if (!user) {
      console.log('User not found for password reset:', email);
      return res.json({ success: false, error: "User not found" });
    }

    console.log('Reset password verification:', {
      email,
      userModel,
      hasOtp: !!user.otp,
      otpExpired: user.otpExpires < Date.now()
    });

    if (!user.otp) {
      return res.json({ success: false, error: "Please verify OTP first" });
    }

    if (user.otpExpires < Date.now()) {
      return res.json({ success: false, error: "OTP has expired, please request a new one" });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    console.log('Password reset successful:', {
      email,
      userModel
    });

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
    console.log('Login - Received request:', {
      userType,
      email,
      hasPassword: !!password,
      passwordLength: password ? password.length : 0
    });

    if (!userType || !email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    let user;
    let Model;
    
    // Determine which model to use
    if (userType === "tenant") {
      Model = Tenant;
    } else if (userType === "owner") {
      Model = Owner;
    } else if (userType === "worker") {
      Model = Worker;
    } else {
      return res.status(400).json({ error: "Invalid user type" });
    }

    // Find user and explicitly select password
    user = await Model.findOne({ email }).select('+password');
    
    console.log('Login - Database query result:', {
      found: !!user,
      userType,
      email,
      hasPasswordField: user ? !!user.password : false,
      passwordFieldLength: user && user.password ? user.password.length : 0
    });

    if (!user) {
      return res.status(404).json({ error: "Create an account first" });
    }

    if (!user.password) {
      console.log('Login - No password hash found in database');
      return res.status(401).json({ error: "Password not set for this account" });
    }

    if (!user) {
      return res.status(404).json({ error: "Create an account first" });
    }

    // Use bcrypt to compare password
    try {
      console.log('Login - Before password comparison:', {
        providedPasswordLength: password.length,
        storedHashLength: user.password.length,
        storedHashStartsWith: user.password.substring(0, 7) // Show just the beginning of the hash
      });

      // Verify the stored hash is in correct bcrypt format
      if (!user.password.startsWith('$2')) {
        console.log('Login - Invalid hash format in database');
        // Re-hash the password if it's not in bcrypt format
        user.password = await bcrypt.hash(user.password, 10);
        await user.save();
      }

      const isMatch = await bcrypt.compare(password, user.password);
      
      console.log('Login - Password comparison complete:', {
        isMatch,
        email,
        userType
      });

      if (!isMatch) {
        return res.status(401).json({ error: "Incorrect password" });
      }
    } catch (error) {
      console.error('Login - Password comparison error:', {
        error: error.message,
        email,
        userType
      });
      return res.status(500).json({ error: "Error verifying password" });
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
    accountNo,
    upiid,
  } = req.body;

  try {
    // Validate required fields
    if (!userType || !firstName || !lastName || !email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Validate password length
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    // Check for existing user
    const existingUser =
      (await Tenant.findOne({ email })) ||
      (await Owner.findOne({ email })) ||
      (await Worker.findOne({ email }));

    if (existingUser) {
      return res.status(400).json({ error: "Email already exists" });
    }

    // Hash password
    console.log('Registration - Before hashing:', {
      email,
      userType,
      passwordLength: password.length
    });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    console.log('Registration - After hashing:', {
      email,
      userType,
      hashedPasswordLength: hashedPassword.length
    });
    
    let newUser;

    // Create new user based on userType
    if (userType === "tenant") {
      newUser = new Tenant({
        firstName,
        lastName,
        email,
        phone,
        location,
        password: hashedPassword,
        userType: "tenant",
      });
    } else if (userType === "worker") {
      if (!serviceType || !experience) {
        return res.status(400).json({ error: "Service type and experience required for workers" });
      }
      newUser = new Worker({
        firstName,
        lastName,
        email,
        phone,
        location,
        serviceType,
        experience: Number(experience) || 0,
        password: hashedPassword,
        userType: "worker",
      });
    } else if (userType === "owner") {
      if (!numProperties || !accountNo || !upiid) {
        return res.status(400).json({ error: "Number of properties, account number, and UPI ID required for owners" });
      }
      newUser = new Owner({
        firstName,
        lastName,
        email,
        phone,
        location,
        numProperties: Number(numProperties) || 0,
        password: hashedPassword,
        accountNo,
        upiid,
        userType: "owner",
      });
    } else {
      return res.status(400).json({ error: "Invalid user type" });
    }

    await newUser.save();
    return res.json({ success: true, redirectUrl: "/login", message: "Registration successful" });
  } catch (err) {
    console.error("Registration error:", err);
    return res.status(500).json({ error: `Registration failed: ${err.message}` });
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

// Home Route
app.get("/", async (req, res) => {
  try {
    const propertiesData = await Property.find({
      isRented: false,
      isVerified: true,
      is_popular: true,
    })
      .select("_id location subtype price images")
      .limit(10)
      .lean();

    const sliderPropertiesData = await Property.find({
      isRented: false,
      isVerified: true,
    })
      .select("name description images _id")
      .limit(10)
      .lean();

    res.render("pages/index", {
      propertiesData,
      sliderPropertiesData,
    });
  } catch (error) {
    console.error("Error fetching properties:", error);
    res.render("pages/index", {
      propertiesData: [],
      sliderPropertiesData: [],
      error: "Failed to load properties",
    });
  }
});

// Search Route
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
    res
      .status(500)
      .render("pages/propertydetails", {
        property: null,
        error: "Server Error",
      });
  }
});

// Static Routes
app.get("/register", (req, res) => {
  const data = {
    error: null,
    userType: req.query.userType || 'tenant',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',
    serviceType: '',
    experience: '',
    numProperties: '',
    accountNo: '',
    upiid: '',
    errors: {},
    success: false
  };
  console.log('Rendering registration with data:', data); // Debug log
  res.render("pages/registration", data);
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

app.get("/termsofservice", (req, res) => {
  res.render("pages/termsofservice");
});

app.get("/contact_us", (req, res) => {
  res.render("pages/contact_us");
});


// POST route to handle contact form submission
app.post('/submit-form', async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    // Basic validation
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'Name, email, subject, and message are required' });
    }

    // Validate email (must be a Gmail address)
    const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid Gmail address' });
    }

    // Validate phone number if provided (must be 10 digits)
    if (phone && !/^\d{10}$/.test(phone)) {
      return res.status(400).json({ error: 'Please provide a valid 10-digit phone number' });
    }

    // Create new contact entry
    const contact = new Contact({
      name,
      email,
      phone: phone || '',
      subject,
      message,
    });

    // Save to MongoDB
    await contact.save();

    res.status(200).json({ message: 'Form submitted successfully' });
  } catch (error) {
    console.error('Error submitting form:', error);
    res.status(500).json({ error: 'Server error, please try again later' });
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
    if (!admin || !(await bcrypt.compare(password, admin.password))) {
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

// Admin Dashboard Route
app.get("/admin", isAuthenticate, async (req, res) => {
  try {
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
      monthlyRevenue: revenueMonthly,
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

    res.render("pages/admin1", {
      stats,
      properties,
      users,
      bookings,
      payments,
      notifications,
      maintenanceRequests,
    });
  } catch (err) {
    console.error("Error fetching dashboard data:", err);
    res.status(500).send("Server Error");
  }
});

// Start server with error handling
const startServer = (port) => {
  try {
    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
      console.log('Email configuration:', {
        user: process.env.GMAIL_USER ? 'Configured' : 'Missing',
        pass: process.env.GMAIL_PASS ? 'Configured' : 'Missing'
      });
    }).on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${port} is busy, trying ${port + 1}`);
        startServer(port + 1);
      } else {
        console.error('Server error:', err);
      }
    });
  } catch (err) {
    console.error('Failed to start server:', err);
  }
};

startServer(PORT);