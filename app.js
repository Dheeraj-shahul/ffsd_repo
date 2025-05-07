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

const Complaint = require('./models/complaint');
const Rating = require('./models/rating');
const RentalHistory = require('./models/rentalhistory');
const MaintenanceRequest = require('./models/MaintenanceRequest');
const Admin = require('./models/admin');

//Routes
const propertyRoutes = require("./routes/property");
const workerRoutes = require("./routes/workers");
const TenantRoutes=require("./routes/tenant");
const ownerRoutes = require('./routes/owner');
const bookingRoutes = require('./routes/bookingRoutes');

// Admin Routes
const adminRoutes=require('./routes/admin')



require("dns").setDefaultResultOrder("ipv4first"); // Force IPv4




const app = express();
const PORT = 3000;

// Connect to MongoDB
mongoose.connect("mongodb+srv://revanthkumardompaka:qqo8F9xCiY5DPQLT@ffsd.pjcw0o6.mongodb.net/rentease")
  .then(() => console.log("Connected to MongoDB Atlas"))
  .catch((err) => console.error("MongoDB Atlas connection error:", err));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: "15mb" }));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

// Session middleware setup with MongoDB store
app.use(
  session({
    secret:  "your_secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    },
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
app.use("/tenant", TenantRoutes);
app.use("/",ownerRoutes);
app.use('/', bookingRoutes);

//admin routes
app.use('/admin',adminRoutes);


// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render("pages/error", {
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? err : {},
  });
});



// Route for property listing page
app.get("/list-property", isAuthenticated, (req, res) => {
  if (req.session.user.userType !== "owner") {
    return redirectToDashboard(req, res);
  }
  res.render("pages/propertylisting");
});

// GET: Render Registration Page
app.get("/register", (req, res) => {
  console.log('Rendering registration page');
  res.render("pages/registration", { userType: "", serviceType: "", error: null });
});

// POST: Handle Registration
app.post("/register", async (req, res) => {
  console.log('Received POST /register with body:', req.body);

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

  // Input validation
  if (!userType || !firstName || !lastName || !email || !password) {
    console.log('Validation failed: Missing required fields');
    return res.render("pages/registration", {
      userType,
      serviceType,
      firstName,
      lastName,
      email,
      phone,
      location,
      error: "Missing required fields",
    });
  }

  try {
    // Check for existing user
    console.log('Checking for existing user with email:', email);
    const existingUserPromises = [
      Tenant.findOne({ email }),
      Worker.findOne({ email }),
      Owner.findOne({ email }),
    ];
    const results = await Promise.allSettled(existingUserPromises);
    const existingUser = results.find(result => result.status === 'fulfilled' && result.value)?.value;

    if (existingUser) {
      console.log('Existing user found:', existingUser);
      return res.render("pages/registration", {
        userType,
        serviceType,
        firstName,
        lastName,
        email,
        phone,
        location,
        error: "Email already exists",
      });
    }

    let newUser;
    console.log('Creating new user for userType:', userType);

    if (userType === "tenant") {
      newUser = new Tenant({
        firstName,
        lastName,
        email,
        phone,
        location,
        password,
      });
    } else if (userType === "worker") {
      newUser = new Worker({
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
      console.log('Invalid user type:', userType);
      return res.render("pages/registration", {
        userType,
        serviceType,
        firstName,
        lastName,
        email,
        phone,
        location,
        error: "Invalid user type",
      });
    }

    console.log('Saving new user:', newUser);
    await newUser.save();
    console.log('New user saved successfully:', newUser);
    res.redirect("/login");
  } catch (err) {
    console.error('Error registering user:', err);
    res.render("pages/registration", {
      userType,
      serviceType,
      firstName,
      lastName,
      email,
      phone,
      location,
      error: `Registration failed: ${err.message}`,
    });
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

    if (user.status === "Suspended") {
      errors.auth = "Your account is suspended temporarily";
      return res.render("pages/login", {
        userType,
        email,
        password: "",
        errors,
      });
    }

    req.session.user = {
      _id: user._id.toString(),
      userType,
      email: user.email,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      phone: user.phone || '',
      location: user.location || '',
      emailNotifications: user.emailNotifications || false,
      smsNotifications: user.smsNotifications || false,
      rentReminders: user.rentReminders || false,
      maintenanceUpdates: user.maintenanceUpdates || false,
      newListings: user.newListings || false
    };

    console.log("Login successful, user ID:", req.session.user._id);
    redirectToDashboard(req, res);
  } catch (err) {
    console.error("Error during login:", err);
    res.status(500).render("pages/login", {
      userType,
      email,
      password: "",
      errors: { auth: "Server error" },
    });
  }
});

// Redirect to Dashboard
function redirectToDashboard(req, res) {
  if (!req.session.user || !req.session.user.userType) {
    return res.redirect('/login?error=Please log in');
  }
  if (req.session.user.userType === 'tenant') {
    return res.redirect('/tenant/tenant_dashboard');
  } else if (req.session.user.userType === 'owner') {
    return res.redirect('/owner_dashboard');
  } else if (req.session.user.userType === 'worker') {
    return res.redirect('/worker_dashboard');
  }
  return res.redirect('/login?error=Invalid user type');
}

// Logout route
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

//Dashboard Routes
// app.get("/tenant_dashboard", isAuthenticated, (req, res) => {
//   const user = req.session.user;
//   if (user.userType !== "tenant") {
//     return redirectToDashboard(req, res);
//   }
//   res.render("pages/tenant_dashboard", { user });
// });

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



// Route for the main page
app.get("/", (req, res) => {
  res.render("pages/index"); 
});

// Route to render search.ejs
app.get("/search", async (req, res) => {
  try {
    const properties = await Property.find({
      $and: [
        {
          $or: [
            { isRented: false },
            { isRented: { $exists: false } }
          ]
        },
        { isVerified: true }
      ]
    });
    
    res.render("pages/search1", { properties, request: req });
  } catch (err) {
    console.error("Error fetching properties for search:", err);
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



// Authentication Middleware
function isAuthenticate(req, res, next) {
  if (req.session.adminId) {
    return next();
  }
  res.redirect('/admin/login');
}

// Admin Login Routes
app.get('/admin/login', (req, res) => {
  res.render('pages/adminlogin', { error: null });
});

app.post('/admin/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const admin = await Admin.findOne({ username });
    if (!admin || admin.password !== password) {
      return res.render('pages/adminlogin', { error: 'Invalid username or password' });
    }
    req.session.adminId = admin._id.toString();
    res.redirect('/admin');
  } catch (err) {
    console.error('Login error:', err);
    res.render('pages/adminlogin', { error: 'Server error' });
  }
});




// Admin Dashboard Route
app.get('/admin', isAuthenticate, async (req, res) => {
  try {
    // Existing dashboard logic remains unchanged
    const totalProperties = await Property.countDocuments();
    const totalRenters = await Tenant.countDocuments();
    const totalOwners = await Owner.countDocuments();
    const totalWorkers = await Worker.countDocuments();
    const activeRentals = await Booking.countDocuments({ status: 'Active' });
    const pendingBookings = await Booking.countDocuments({ status: 'Pending' });
    const cancelledBookings = await Booking.countDocuments({ status: 'Terminated' });
    const activeUsers = (
      await Tenant.countDocuments({ status: 'Active' }) +
      await Worker.countDocuments({ status: 'Active' }) +
      await Owner.countDocuments({ status: 'Active' })
    );

    const totalRevenueResult = await Payment.aggregate([
      { $match: { status: 'Paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalRevenue = totalRevenueResult[0]?.total || 0;

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const revenueDailyResult = await Payment.aggregate([
      { $match: { status: 'Paid', paymentDate: { $gte: oneDayAgo } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const revenueDaily = revenueDailyResult[0]?.total || 0;

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const revenueWeeklyResult = await Payment.aggregate([
      { $match: { status: 'Paid', paymentDate: { $gte: oneWeekAgo } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const revenueWeekly = revenueWeeklyResult[0]?.total || 0;

    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const revenueMonthlyResult = await Payment.aggregate([
      { $match: { status: 'Paid', paymentDate: { $gte: oneMonthAgo } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const revenueMonthly = revenueMonthlyResult[0]?.total || 0;

    const propertiesActive = await Property.countDocuments({ status: 'Active' });
    const propertiesPending = await Property.countDocuments({ status: 'Pending' });
    const workersAvailable = await Worker.countDocuments({ availability: true });

    const userGrowth = (
      await Tenant.countDocuments({ createdAt: { $gte: oneMonthAgo } }) +
      await Worker.countDocuments({ createdAt: { $gte: oneMonthAgo } }) +
      await Owner.countDocuments({ createdAt: { $gte: oneMonthAgo } })
    );

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
      .populate('ownerId', 'firstName lastName')
      .populate('tenantId', 'firstName lastName')
      .populate({
        path: 'activeWorkers',
        select: 'firstName lastName',
        match: { _id: { $exists: true } },
      })
      .lean();
    properties.forEach(p => {
      p.id = p._id.toString();
      p.owner = p.ownerId ? `${p.ownerId.firstName} ${p.ownerId.lastName}` : 'N/A';
      p.tenant = p.tenantId ? `${p.tenantId.firstName} ${p.tenantId.lastName}` : 'N/A';
      p.activeWorkers = p.activeWorkers?.map(w => ({
        name: w.firstName && w.lastName ? `${w.firstName} ${w.lastName}` : 'N/A',
      })) || [];
    });

    const tenants = await Tenant.find().lean();
    const workers = await Worker.find().lean();
    const owners = await Owner.find().lean();

    const users = [
      ...tenants.map(t => ({
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
      ...workers.map(w => ({
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
      ...owners.map(o => ({
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
      if (user.userType === 'tenant') {
        user.tenantBookings = await Booking.countDocuments({ tenantId: user.id });
      }
    }

    const bookings = await Booking.find()
      .populate('tenantId', 'firstName lastName')
      .populate('propertyId', 'name')
      .populate('assignedWorker', 'firstName lastName')
      .lean();
    bookings.forEach(b => {
      b.id = b._id.toString();
      b.userName = b.tenantId ? `${b.tenantId.firstName} ${b.tenantId.lastName}` : 'N/A';
      b.propertyName = b.propertyId?.name || 'N/A';
      b.workerName = b.assignedWorker ? `${b.assignedWorker.firstName} ${b.assignedWorker.lastName}` : 'N/A';
      b.user = b.tenantId?._id;
      b.property = b.propertyId?._id;
    });

    const payments = await Payment.find()
      .populate('tenantId', 'firstName lastName')
      .lean();
    payments.forEach(p => {
      p.id = p._id.toString();
      p.userName = p.tenantId ? `${p.tenantId.firstName} ${p.tenantId.lastName}` : 'N/A';
      p.user = p.tenantId?._id;
    });

    const notifications = await Notification.find()
      .populate('worker', 'firstName lastName')
      .populate('recipient', 'firstName lastName')
      .lean();
    notifications.forEach(n => {
      n.id = n._id.toString();
      n.workerName = n.worker ? `${n.worker.firstName} ${n.worker.lastName}` : 'N/A';
      n.recipientName = n.recipient ? `${n.recipient.firstName} ${n.recipient.lastName}` : 'N/A';
    });

    const maintenanceRequests = await MaintenanceRequest.find()
      .populate('propertyId', 'name ownerId')
      .populate({
        path: 'propertyId.ownerId',
        select: 'firstName lastName',
      })
      .populate('tenantId', 'firstName lastName')
      .lean();
    maintenanceRequests.forEach(m => {
      m.id = m._id.toString();
      m.propertyName = m.propertyId?.name || 'N/A';
      m.tenantName = m.tenantId ? `${m.tenantId.firstName} ${m.tenantId.lastName}` : 'N/A';
      m.ownerName = m.propertyId?.ownerId ? `${m.propertyId.ownerId.firstName} ${m.propertyId.ownerId.lastName}` : 'N/A';
    });

    res.render('pages/admin1', {
      stats,
      properties,
      users,
      bookings,
      payments,
      notifications,
      maintenanceRequests,
    });
  } catch (err) {
    console.error('Error fetching dashboard data:', err);
    res.status(500).send('Server Error');
  }
});
// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://127.0.0.1:${PORT}`);
});