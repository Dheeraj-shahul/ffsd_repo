const mongoose = require("mongoose");
const Owner = require("../models/owner");
const Property = require("../models/property");
const Tenant = require("../models/tenant");
const Payment = require("../models/payment");
const MaintenanceRequest = require("../models/MaintenanceRequest");
const Complaint = require("../models/complaint");
const Agreement = require("../models/Agreement");
const Notification = require("../models/notification");

exports.getOwnerDashboard = async (req, res) => {
  try {
    // Log session user for debugging
    console.log("Session user:", req.session.user);

    // Owner's ObjectId from session
    const ownerId = req.session.user?._id;

    // Validate ownerId
    if (!ownerId) {
      console.error("No ownerId found in session");
      return res
        .status(401)
        .json({ message: "Unauthorized: No user ID in session" });
    }

    // Ensure ownerId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(ownerId)) {
      console.error("Invalid ownerId format:", ownerId);
      return res.status(400).json({ message: "Invalid owner ID format" });
    }

    // Convert to ObjectId
    const objectId = new mongoose.Types.ObjectId(ownerId);

    // Fetch owner
    const owner = await Owner.findById(objectId);
    if (!owner) {
      console.error("Owner not found for ID:", ownerId);
      return res.status(404).json({ message: "Owner not found" });
    }

    // Fetch properties by ownerId
    const properties = await Property.find({ ownerId: objectId });

    // Fetch tenants by matching tenantId in properties
    const tenantIds = properties
      .filter(
        (property) =>
          property.tenantId &&
          mongoose.Types.ObjectId.isValid(property.tenantId)
      )
      .map((property) => property.tenantId);
    const tenants = await Tenant.find({ _id: { $in: tenantIds } }).lean();

    // Attach property name to each tenant
    tenants.forEach((tenant) => {
      const property = properties.find(
        (prop) =>
          prop.tenantId && prop.tenantId.toString() === tenant._id.toString()
      );
      tenant.property = property ? property.name : "N/A";
      tenant.propid = property ? property._id : "N/A";
      tenant.leaseDuration = tenant.leaseDuration || "N/A";
      tenant.occupation = tenant.occupation || "N/A";
    });

    // Fetch other data
    const payments = await Payment.find({ tenantId: { $in: tenantIds } });
    const maintenanceRequests = await MaintenanceRequest.find({
      tenantId: { $in: tenantIds },
    });
    const complaints = await Complaint.find({ tenantId: { $in: tenantIds } });
    const agreements = await Agreement.find({ ownerId: objectId });
    const notifications = await Notification.find({
      _id: { $in: owner.notificationIds },
    });

    // Sample reports data
    const reports = {
      monthlyRevenue: payments.reduce((sum, p) => sum + (p.amount || 0), 0),
      occupancyRate: properties.length
        ? (properties.filter((p) => p.isRented).length / properties.length) *
          100
        : 0,
      maintenanceCosts: maintenanceRequests.length * 5000,
      revenueTrend: { class: "positive", text: "Up 5%" },
      occupancyTrend: { class: "stable", text: "Stable" },
      maintenanceTrend: { class: "negative", text: "Down 2%" },
      revenueChart: [
        { height: 60, value: 40000, month: "Jan" },
        { height: 80, value: 50000, month: "Feb" },
        { height: 70, value: 45000, month: "Mar" },
        { height: 90, value: 60000, month: "Apr" },
        { height: 65, value: 42000, month: "May" },
        { height: 85, value: 55000, month: "Jun" },
      ],
    };

    // Sample payment summary
    const paymentSummary = {
      monthlyRevenue: payments.reduce((sum, p) => sum + (p.amount || 0), 0),
      upcomingPayments: payments
        .filter((p) => p.status === "Pending")
        .reduce((sum, p) => sum + (p.amount || 0), 0),
      totalRevenue: payments.reduce((sum, p) => sum + (p.amount || 0), 0),
      commission: payments.reduce((sum, p) => sum + (p.amount || 0), 0) * 0.05,
      netIncome: payments.reduce((sum, p) => sum + (p.amount || 0), 0) * 0.95,
    };

    // Render dashboard
    res.render("pages/owner_dashboard", {
      user: {
        firstName: owner.firstName,
        lastName: owner.lastName,
        email: owner.email,
        phone: owner.phone,
        location: owner.location,
        accountNo: owner.accountNo,
        upiid: owner.upiid,
        numProperties: properties.length,
        notifications: owner.notifications || {
          email: true,
          sms: true,
          payment: true,
          complaint: true,
          maintenance: true,
        },
      },
      properties: properties || [],
      tenants: tenants || [],
      payments: payments || [],
      paymentSummary: paymentSummary || {},
      maintenanceRequests: maintenanceRequests || [],
      complaints: complaints || [],
      reports: reports || {},
      agreements: agreements || [],
      notifications: notifications || [],
    });
  } catch (err) {
    console.error("Error fetching owner dashboard:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

// Add delete property function
exports.deleteProperty = async (req, res) => {
  try {
    const propertyId = req.params.id;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid property ID" });
    }

    // Find property to check if it's rented
    const property = await Property.findById(propertyId);

    if (!property) {
      return res
        .status(404)
        .json({ success: false, message: "Property not found" });
    }

    // Check if property is currently rented
    if (property.isRented) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete property because it is currently rented",
      });
    }

    // Delete the property
    await Property.findByIdAndDelete(propertyId);

    return res.status(200).json({
      success: true,
      message: "Property deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting property:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while deleting property",
      error: error.message,
    });
  }
};
