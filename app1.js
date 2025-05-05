const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const path = require("path");
const MaintenanceRequest = require('./models/MaintenanceRequest');

const app = express();

// Middleware
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(session({
  secret: "rentease_admin_secret",
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 15 * 60 * 1000 } // 15 minutes
}));

// MongoDB Connection
mongoose.connect("mongodb://127.0.0.1:27017/admin", {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log("Connected to MongoDB 'admin' database");
}).catch(err => {
  console.error("MongoDB connection error:", err);
  process.exit(1);
});

// Mongoose Schemas
const propertySchema = new mongoose.Schema({
  id: Number,
  name: String,
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "Owner" },
  owner: String,
  location: String,
  type: String,
  subtype: String,
  status: { type: String, default: "Pending" },
  isRented: { type: Boolean, default: false },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant" },
  tenant: String,
  activeWorkerIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Worker" }],
  price: Number,
  rating: Number,
  reviews: Number,
  isVerified: { type: Boolean, default: false },
}, { timestamps: true });

const tenantSchema = new mongoose.Schema({
  id: Number,
  userType: { type: String, default: "tenant" },
  firstName: String,
  lastName: String,
  email: String,
  phone: String,
  location: String,
  password: String,
  status: { type: String, default: "Active" },
  lastLogin: Date,
}, { timestamps: true });

const workerSchema = new mongoose.Schema({
  id: Number,
  userType: { type: String, default: "worker" },
  firstName: String,
  lastName: String,
  email: String,
  phone: String,
  location: String,
  serviceType: String,
  experience: Number,
  password: String,
  availability: { type: Boolean, default: true },
  status: { type: String, default: "Active" },
  lastLogin: Date,
}, { timestamps: true });

const ownerSchema = new mongoose.Schema({
  id: Number,
  userType: { type: String, default: "owner" },
  firstName: String,
  lastName: String,
  email: String,
  phone: String,
  location: String,
  numProperties: Number,
  password: String,
  accountNo: String,
  upiid: String,
  isAdmin: { type: Boolean, default: false },
  status: { type: String, default: "Active" },
  lastLogin: Date,
}, { timestamps: true });

const bookingSchema = new mongoose.Schema({
  id: Number,
  user: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant" },
  userName: String,
  property: { type: mongoose.Schema.Types.ObjectId, ref: "Property" },
  propertyName: String,
  status: String,
  bookingDate: Date,
  startDate: Date,
  endDate: Date,
  amount: Number,
  assignedWorker: { type: mongoose.Schema.Types.ObjectId, ref: "Worker" },
  workerName: String,
}, { timestamps: true });

const paymentSchema = new mongoose.Schema({
  id: Number,
  user: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant" },
  userName: String,
  amount: Number,
  status: String,
  paymentDate: Date,
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
  paymentMethod: String,
  transactionId: String,
}, { timestamps: true });

const notificationSchema = new mongoose.Schema({
  id: Number,
  type: String,
  message: String,
  recipient: { type: mongoose.Schema.Types.ObjectId },
  recipientType: String,
  recipientName: String,
  worker: { type: mongoose.Schema.Types.ObjectId, ref: "Worker" },
  workerName: String,
  status: String,
  priority: String,
  createdDate: Date,
}, { timestamps: true });

const settingSchema = new mongoose.Schema({
  name: String,
  value: String,
  platformFee: Number,
  emailNotifications: Boolean,
  maintenanceMode: Boolean,
  paymentGateway: { provider: String, apiKey: String },
  currency: { type: String, default: "INR" },
});

// Mongoose Models
const Property = mongoose.model("Property", propertySchema);
const Tenant = mongoose.model("Tenant", tenantSchema);
const Worker = mongoose.model("Worker", workerSchema);
const Owner = mongoose.model("Owner", ownerSchema);
const Booking = mongoose.model("Booking", bookingSchema);
const Payment = mongoose.model("Payment", paymentSchema);
const Notification = mongoose.model("Notification", notificationSchema);
const Setting = mongoose.model("Setting", settingSchema);

// Seed Data
async function seedData() {
  try {
    const ownerCount = await Owner.countDocuments();
    if (ownerCount === 0) {
      await Owner.insertMany([
        {
          id: 1,
          firstName: "Sai",
          lastName: "Kumar",
          email: "sai@example.com",
          phone: "9999999999",
          location: "Visakhapatnam",
          password: "123",
          numProperties: 2,
          accountNo: "1234567890",
          upiid: "sai@upi",
          isAdmin: true,
          status: "Active",
          lastLogin: new Date()
        },
        {
          id: 2,
          firstName: "Priya",
          lastName: "Sharma",
          email: "priya@example.com",
          phone: "8888888888",
          location: "Hyderabad",
          password: "ownerPass123",
          numProperties: 1,
          accountNo: "0987654321",
          upiid: "priya@upi",
          status: "Active",
          lastLogin: new Date()
        }
      ]);

      await Tenant.insertMany([
        {
          id: 1,
          firstName: "Rahul",
          lastName: "Verma",
          email: "rahul@example.com",
          phone: "7777777777",
          location: "Bengaluru",
          password: "tenantPass123",
          status: "Active",
          lastLogin: new Date()
        }
      ]);

      await Worker.insertMany([
        {
          id: 1,
          firstName: "Anil",
          lastName: "Reddy",
          email: "anil@example.com",
          phone: "6666666666",
          location: "Chennai",
          serviceType: "Cleaner",
          experience: 5,
          password: "workerPass123",
          availability: true,
          status: "Active",
          lastLogin: new Date()
        }
      ]);

      await Property.insertMany([
        {
          id: 1,
          name: "Grand Mansion",
          ownerId: (await Owner.findOne({ id: 1 }))._id,
          owner: "Sai Kumar",
          location: "Visakhapatnam",
          type: "House",
          subtype: "2 BHK",
          status: "Active",
          isRented: true,
          tenantId: (await Tenant.findOne({ id: 1 }))._id,
          tenant: "Rahul Verma",
          activeWorkerIds: [(await Worker.findOne({ id: 1 }))._id],
          price: 50000,
          rating: 4.5,
          reviews: 10,
          isVerified: true,
          createdAt: new Date("2025-04-01"),
          updatedAt: new Date("2025-04-15")
        },
        {
          id: 2,
          name: "Cozy Apartment",
          ownerId: (await Owner.findOne({ id: 2 }))._id,
          owner: "Priya Sharma",
          location: "Hyderabad",
          type: "Apartment",
          subtype: "1 BHK",
          status: "Pending",
          isRented: false,
          price: 30000,
          rating: 4.0,
          reviews: 5,
          isVerified: false,
          createdAt: new Date("2025-04-10"),
          updatedAt: new Date("2025-04-12")
        }
      ]);

      await Booking.insertMany([
        {
          id: 1,
          user: (await Tenant.findOne({ id: 1 }))._id,
          userName: "Rahul Verma",
          property: (await Property.findOne({ id: 1 }))._id,
          propertyName: "Grand Mansion",
          status: "Active",
          bookingDate: new Date("2025-04-18"),
          startDate: new Date("2025-05-01"),
          endDate: new Date("2025-06-01"),
          amount: 50000,
          assignedWorker: (await Worker.findOne({ id: 1 }))._id,
          workerName: "Anil Reddy"
        },
        {
          id: 2,
          user: (await Tenant.findOne({ id: 1 }))._id,
          userName: "Rahul Verma",
          property: (await Property.findOne({ id: 2 }))._id,
          propertyName: "Cozy Apartment",
          status: "Pending",
          bookingDate: new Date("2025-04-17"),
          startDate: new Date("2025-05-15"),
          endDate: new Date("2025-06-15"),
          amount: 30000
        }
      ]);

      await Payment.insertMany([
        {
          id: 1,
          user: (await Tenant.findOne({ id: 1 }))._id,
          userName: "Rahul Verma",
          amount: 50000,
          status: "Completed",
          paymentDate: new Date("2025-04-20"),
          bookingId: (await Booking.findOne({ id: 1 }))._id,
          paymentMethod: "Credit Card",
          transactionId: "txn_1234567890"
        },
        {
          id: 2,
          user: (await Tenant.findOne({ id: 1 }))._id,
          userName: "Rahul Verma",
          amount: 30000,
          status: "Pending",
          paymentDate: new Date("2025-04-18"),
          bookingId: (await Booking.findOne({ id: 2 }))._id,
          paymentMethod: "UPI",
          transactionId: "txn_0987654321"
        }
      ]);

      await Notification.insertMany([
        {
          id: 1,
          type: "Maintenance",
          message: "Tenant requested maintenance for the AC.",
          recipient: (await Owner.findOne({ id: 1 }))._id,
          recipientType: "owner",
          recipientName: "Sai Kumar",
          worker: (await Worker.findOne({ id: 1 }))._id,
          workerName: "Anil Reddy",
          status: "Unread",
          priority: "High",
          createdDate: new Date("2025-04-20")
        }
      ]);

      await MaintenanceRequest.insertMany([
        {
          tenantId: (await Tenant.findOne({ id: 1 }))._id,
          propertyId: (await Property.findOne({ id: 1 }))._id,
          issueType: "Plumbing",
          description: "Leaky faucet in bathroom",
          location: "Bathroom",
          dateReported: new Date("2025-04-20"),
          status: "Pending",
          assignedTo: (await Worker.findOne({ id: 1 }))._id
        },
        {
          tenantId: (await Tenant.findOne({ id: 1 }))._id,
          propertyId: (await Property.findOne({ id: 2 }))._id,
          issueType: "Electrical",
          description: "Faulty wiring in kitchen",
          location: "Kitchen",
          dateReported: new Date("2025-04-21"),
          status: "In Progress",
          assignedTo: (await Worker.findOne({ id: 1 }))._id
        }
      ]);

      await Setting.insertMany([
        {
          name: "Website Title",
          value: "RentEase Admin",
          platformFee: 0.05,
          emailNotifications: true,
          maintenanceMode: false,
          paymentGateway: { provider: "Stripe", apiKey: "sk_test_123" },
          currency: "INR"
        }
      ]);

      console.log("Sample data seeded successfully");
    }
  } catch (err) {
    console.error("Seeding error:", err);
  }
}

// Authentication Middleware
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.redirect("/login");
  }
};

// Routes
app.get("/login", (req, res) => {
  res.render("pages/login", { error: null });
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await Owner.findOne({ email, password, isAdmin: true }).lean();
    if (user) {
      req.session.user = { ...user, isAdmin: true };
      res.redirect("/admin");
    } else {
      res.render("pages/login", { error: "Invalid credentials" });
    }
  } catch (err) {
    console.error("Login error:", err);
    res.render("pages/login", { error: "Server error" });
  }
});

app.get("/admin", isAuthenticated, async (req, res) => {
  if (!req.session.user.isAdmin) {
    return res.status(403).send("Access denied");
  }
  try {
    const properties = await Property.find({}).lean();
    const tenants = await Tenant.find({}).lean();
    const workers = await Worker.find({}).lean();
    const owners = await Owner.find({}).lean();
    const bookings = await Booking.find({}).lean();
    const payments = await Payment.find({}).lean();
    const notifications = await Notification.find({}).lean();
    const settings = await Setting.find({}).lean();
    const maintenanceRequests = await MaintenanceRequest.find({}).lean();

    const users = await Promise.all([...tenants, ...workers, ...owners].map(async u => ({
      ...u,
      tenantBookings: u.userType === "tenant" ? await Booking.countDocuments({ user: u._id }) : null,
    })));

    const enhancedProperties = properties.map(p => ({
      ...p,
      owner: owners.find(o => o._id.equals(p.ownerId))?.firstName + ' ' + owners.find(o => o._id.equals(p.ownerId))?.lastName,
      tenant: p.tenantId ? tenants.find(t => t._id.equals(p.tenantId))?.firstName + ' ' + tenants.find(t => t._id.equals(p.tenantId))?.lastName : null,
      activeWorkers: p.activeWorkerIds ? workers.filter(w => p.activeWorkerIds.includes(w._id)).map(w => ({ name: w.firstName + ' ' + w.lastName })) : []
    }));

    const enhancedBookings = bookings.map(b => ({
      ...b,
      userName: tenants.find(t => t._id.equals(b.user))?.firstName + ' ' + tenants.find(t => t._id.equals(b.user))?.lastName,
      propertyName: properties.find(p => p._id.equals(b.property))?.name,
      workerName: b.assignedWorker ? workers.find(w => w._id.equals(b.assignedWorker))?.firstName + ' ' + workers.find(w => w._id.equals(b.assignedWorker))?.lastName : null
    }));

    const enhancedPayments = payments.map(p => ({
      ...p,
      userName: tenants.find(t => t._id.equals(p.user))?.firstName + ' ' + tenants.find(t => t._id.equals(p.user))?.lastName
    }));

    const enhancedNotifications = notifications.map(n => ({
      ...n,
      recipientName: (n.recipientType === "owner" ? owners : n.recipientType === "worker" ? workers : tenants)
        .find(u => u._id.equals(n.recipient))?.firstName + ' ' + (n.recipientType === "owner" ? owners : n.recipientType === "worker" ? workers : tenants)
        .find(u => u._id.equals(n.recipient))?.lastName,
      workerName: n.worker ? workers.find(w => w._id.equals(n.worker))?.firstName + ' ' + workers.find(w => w._id.equals(n.worker))?.lastName : null,
      recipientType: n.recipientType || "tenant"
    }));

    const enhancedMaintenanceRequests = maintenanceRequests.map(m => ({
      ...m,
      tenantName: tenants.find(t => t._id.equals(m.tenantId))?.firstName + ' ' + tenants.find(t => t._id.equals(m.tenantId))?.lastName,
      ownerName: owners.find(o => o._id.equals(properties.find(p => p._id.equals(m.propertyId))?.ownerId))?.firstName + ' ' + owners.find(o => o._id.equals(properties.find(p => p._id.equals(m.propertyId))?.ownerId))?.lastName,
      propertyName: properties.find(p => p._id.equals(m.propertyId))?.name,
      assignedWorkerName: m.assignedTo ? workers.find(w => w._id.equals(m.assignedTo))?.firstName + ' ' + workers.find(w => w._id.equals(m.assignedTo))?.lastName : null
    }));

    const stats = {
      totalProperties: await Property.countDocuments({}),
      totalRenters: await Tenant.countDocuments({}),
      totalOwners: await Owner.countDocuments({}),
      totalWorkers: await Worker.countDocuments({}),
      activeRentals: await Booking.countDocuments({ status: "Active" }),
      pendingBookings: await Booking.countDocuments({ status: "Pending" }),
      cancelledBookings: await Booking.countDocuments({ status: "Cancelled" }),
      renters: await Tenant.countDocuments({}),
      activeUsers: await Promise.all([
        Tenant.countDocuments({ lastLogin: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }),
        Worker.countDocuments({ lastLogin: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }),
        Owner.countDocuments({ lastLogin: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } })
      ]).then(counts => counts.reduce((sum, count) => sum + count, 0)),
      totalRevenue: (await Payment.aggregate([
        { $match: { status: "Completed" } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]))[0]?.total || 0,
      revenueDaily: (await Payment.aggregate([
        { $match: { status: "Completed", paymentDate: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]))[0]?.total || 0,
      revenueWeekly: (await Payment.aggregate([
        { $match: { status: "Completed", paymentDate: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]))[0]?.total || 0,
      revenueMonthly: (await Payment.aggregate([
        { $match: { status: "Completed", paymentDate: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]))[0]?.total || 0,
      propertiesActive: await Property.countDocuments({ status: "Active" }),
      propertiesPending: await Property.countDocuments({ status: "Pending" }),
      workersAvailable: await Worker.countDocuments({ availability: true }),
      userGrowth: 100,
      propertyPerformance: [],
      bookingStatusDistribution: {
        active: await Booking.countDocuments({ status: "Active" }),
        pending: await Booking.countDocuments({ status: "Pending" }),
        cancelled: await Booking.countDocuments({ status: "Cancelled" })
      },
      revenueBySource: [],
      userRetention: 0,
      propertyOccupancy: 0,
      workerPerformance: [],
      geographicTrends: [],
      churnRate: 0
    };

    res.render("pages/admin1", {
      properties: enhancedProperties,
      users,
      bookings: enhancedBookings,
      payments: enhancedPayments,
      notifications: enhancedNotifications,
      maintenanceRequests: enhancedMaintenanceRequests,
      settings,
      stats
    });
  } catch (err) {
    console.error("Error fetching admin data or rendering template:", err);
    res.status(500).send(`Server Error: ${err.message}`);
  }
});

// Action Routes
app.post("/admin/property/verify/:id", isAuthenticated, async (req, res) => {
  if (!req.session.user.isAdmin) return res.status(403).send("Access denied");
  try {
    await Property.updateOne({ id: req.params.id }, { isVerified: req.body.isVerified });
    res.redirect("/admin");
  } catch (err) {
    console.error("Verify property error:", err);
    res.status(500).send("Server Error");
  }
});

app.post("/admin/property/status/:id", isAuthenticated, async (req, res) => {
  if (!req.session.user.isAdmin) return res.status(403).send("Access denied");
  try {
    await Property.updateOne({ id: req.params.id }, { status: req.body.status });
    res.redirect("/admin");
  } catch (err) {
    console.error("Update property status error:", err);
    res.status(500).send("Server Error");
  }
});

app.delete("/admin/property/delete/:id", isAuthenticated, async (req, res) => {
  if (!req.session.user.isAdmin) return res.status(403).send("Access denied");
  try {
    await Property.deleteOne({ id: req.params.id });
    res.sendStatus(200);
  } catch (err) {
    console.error("Delete property error:", err);
    res.status(500).send("Server Error");
  }
});

app.post("/admin/user/status/:id/:userType", isAuthenticated, async (req, res) => {
  if (!req.session.user.isAdmin) return res.status(403).send("Access denied");
  try {
    const Model = { tenant: Tenant, worker: Worker, owner: Owner }[req.params.userType];
    await Model.updateOne({ id: req.params.id }, { status: req.body.status });
    res.redirect("/admin");
  } catch (err) {
    console.error("Update user status error:", err);
    res.status(500).send("Server Error");
  }
});

app.delete("/admin/user/delete/:id/:userType", isAuthenticated, async (req, res) => {
  if (!req.session.user.isAdmin) return res.status(403).send("Access denied");
  try {
    const Model = { tenant: Tenant, worker: Worker, owner: Owner }[req.params.userType];
    await Model.deleteOne({ id: req.params.id });
    res.sendStatus(200);
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).send("Server Error");
  }
});

app.post("/admin/booking/approve/:id", isAuthenticated, async (req, res) => {
  if (!req.session.user.isAdmin) return res.status(403).send("Access denied");
  try {
    await Booking.updateOne({ id: req.params.id }, { status: "Active" });
    res.redirect("/admin");
  } catch (err) {
    console.error("Approve booking error:", err);
    res.status(500).send("Server Error");
  }
});

app.post("/admin/booking/reject/:id", isAuthenticated, async (req, res) => {
  if (!req.session.user.isAdmin) return res.status(403).send("Access denied");
  try {
    await Booking.updateOne({ id: req.params.id }, { status: "Rejected" });
    res.redirect("/admin");
  } catch (err) {
    console.error("Reject booking error:", err);
    res.status(500).send("Server Error");
  }
});

app.post("/admin/booking/cancel/:id", isAuthenticated, async (req, res) => {
  if (!req.session.user.isAdmin) return res.status(403).send("Access denied");
  try {
    await Booking.updateOne({ id: req.params.id }, { status: "Cancelled" });
    res.redirect("/admin");
  } catch (err) {
    console.error("Cancel booking error:", err);
    res.status(500).send("Server Error");
  }
});

app.post("/admin/payment/refund/:id", isAuthenticated, async (req, res) => {
  if (!req.session.user.isAdmin) return res.status(403).send("Access denied");
  try {
    await Payment.updateOne({ id: req.params.id }, { status: "Refunded" });
    res.redirect("/admin");
  } catch (err) {
    console.error("Refund payment error:", err);
    res.status(500).send("Server Error");
  }
});

app.post("/admin/notification/status/:id", isAuthenticated, async (req, res) => {
  if (!req.session.user.isAdmin) return res.status(403).send("Access denied");
  try {
    await Notification.updateOne({ id: req.params.id }, { status: req.body.status });
    res.redirect("/admin");
  } catch (err) {
    console.error("Update notification status error:", err);
    res.status(500).send("Server Error");
  }
});

app.post("/admin/notification/complete/:id", isAuthenticated, async (req, res) => {
  if (!req.session.user.isAdmin) return res.status(403).send("Access denied");
  try {
    await Notification.updateOne({ id: req.params.id }, { status: "Completed" });
    res.redirect("/admin");
  } catch (err) {
    console.error("Complete notification error:", err);
    res.status(500).send("Server Error");
  }
});

app.post("/admin/maintenance/mark/:id", isAuthenticated, async (req, res) => {
  if (!req.session.user.isAdmin) return res.status(403).send("Access denied");
  try {
    await MaintenanceRequest.updateOne({ _id: req.params.id }, { status: req.body.status });
    res.redirect("/admin");
  } catch (err) {
    console.error("Mark maintenance error:", err);
    res.status(500).send("Server Error");
  }
});

app.post("/admin/maintenance/respond/:id", isAuthenticated, async (req, res) => {
  if (!req.session.user.isAdmin) return res.status(403).send("Access denied");
  try {
    await MaintenanceRequest.updateOne({ _id: req.params.id }, { description: req.body.response });
    res.redirect("/admin");
  } catch (err) {
    console.error("Respond maintenance error:", err);
    res.status(500).send("Server Error");
  }
});

app.post("/admin/maintenance/escalate/:id", isAuthenticated, async (req, res) => {
  if (!req.session.user.isAdmin) return res.status(403).send("Access denied");
  try {
    await MaintenanceRequest.updateOne({ _id: req.params.id }, { status: "In Progress" });
    res.redirect("/admin");
  } catch (err) {
    console.error("Escalate maintenance error:", err);
    res.status(500).send("Server Error");
  }
});

app.post("/admin/maintenance/complete/:id", isAuthenticated, async (req, res) => {
  if (!req.session.user.isAdmin) return res.status(403).send("Access denied");
  try {
    await MaintenanceRequest.updateOne({ _id: req.params.id }, { status: "Completed", completedDate: new Date() });
    res.redirect("/admin");
  } catch (err) {
    console.error("Complete maintenance error:", err);
    res.status(500).send("Server Error");
  }
});

app.post("/admin/maintenance/update/:id", isAuthenticated, async (req, res) => {
  if (!req.session.user.isAdmin) return res.status(403).send("Access denied");
  try {
    await MaintenanceRequest.updateOne({ _id: req.params.id }, { description: req.body.update });
    res.redirect("/admin");
  } catch (err) {
    console.error("Update maintenance error:", err);
    res.status(500).send("Server Error");
  }
});

app.get("/admin/maintenance/:id", isAuthenticated, async (req, res) => {
  if (!req.session.user.isAdmin) return res.status(403).send("Access denied");
  try {
    const maintenanceRequest = await MaintenanceRequest.findById(req.params.id).lean();
    res.render("pages/maintenance", { maintenanceRequest });
  } catch (err) {
    console.error("View maintenance error:", err);
    res.status(500).send("Server Error");
  }
});

app.get("/admin/maintenance/assign-worker/:id", isAuthenticated, async (req, res) => {
  if (!req.session.user.isAdmin) return res.status(403).send("Access denied");
  try {
    const maintenanceRequest = await MaintenanceRequest.findById(req.params.id).lean();
    const workers = await Worker.find({ availability: true }).lean();
    res.render("pages/assignWorker", { maintenanceRequest, workers });
  } catch (err) {
    console.error("Assign worker error:", err);
    res.status(500).send("Server Error");
  }
});

app.post("/admin/maintenance/assign-worker/:id", isAuthenticated, async (req, res) => {
  if (!req.session.user.isAdmin) return res.status(403).send("Access denied");
  try {
    await MaintenanceRequest.updateOne({ _id: req.params.id }, { assignedTo: req.body.workerId });
    res.redirect("/admin");
  } catch (err) {
    console.error("Assign worker error:", err);
    res.status(500).send("Server Error");
  }
});

// Seed data on startup
seedData().catch(err => console.error("Initial seeding error:", err));

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}/admin`);
});