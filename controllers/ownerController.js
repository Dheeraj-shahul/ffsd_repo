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

    // Create a map of property IDs to names
    const propertyIdsForPayments = payments
      .filter(
        (payment) =>
          payment.propertyId &&
          mongoose.Types.ObjectId.isValid(payment.propertyId)
      )
      .map((payment) => payment.propertyId);

    const propertiesForPayments = await Property.find({
      _id: { $in: propertyIdsForPayments },
    })
      .select("name")
      .lean();

    const propertyMapForPayments = new Map();
    propertiesForPayments.forEach((property) => {
      propertyMapForPayments.set(property._id.toString(), property.name);
    });

    // Attach property name to each payment
    payments.forEach((payment) => {
      payment.property =
        propertyMapForPayments.get(payment.propertyId?.toString()) || "N/A";
    });

    const maintenanceRequests = await MaintenanceRequest.find({
      tenantId: { $in: tenantIds },
    }).lean();

    // Fetch tenant and property details for maintenance requests
    const tenantMap = new Map();
    const propertyMap = new Map();

    // Collect unique tenant and property IDs
    const tenantIdsForRequests = maintenanceRequests
      .filter(
        (req) => req.tenantId && mongoose.Types.ObjectId.isValid(req.tenantId)
      )
      .map((req) => req.tenantId);
    const propertyIdsForRequests = maintenanceRequests
      .filter(
        (req) =>
          req.propertyId && mongoose.Types.ObjectId.isValid(req.propertyId)
      )
      .map((req) => req.propertyId);

    // Fetch tenants
    const tenantsForRequests = await Tenant.find({
      _id: { $in: tenantIdsForRequests },
    })
      .select("firstName lastName")
      .lean();
    tenantsForRequests.forEach((tenant) => {
      tenantMap.set(
        tenant._id.toString(),
        `${tenant.firstName} ${tenant.lastName}`
      );
    });

    // Fetch properties
    const propertiesForRequests = await Property.find({
      _id: { $in: propertyIdsForRequests },
    })
      .select("name")
      .lean();
    propertiesForRequests.forEach((property) => {
      propertyMap.set(property._id.toString(), property.name);
    });

    // Attach tenantName and propertyName to each maintenance request
    maintenanceRequests.forEach((request) => {
      request.tenantName = tenantMap.get(request.tenantId?.toString()) || "N/A";
      request.propertyName =
        propertyMap.get(request.propertyId?.toString()) || "N/A";
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

// Fetch owner's notifications
exports.getNotifications = async (req, res) => {
  try {
    // Check if user is owner
    if (!req.session.user || req.session.user.userType !== "owner") {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const ownerId = req.session.user._id;
    if (!mongoose.Types.ObjectId.isValid(ownerId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid owner ID" });
    }

    // Fetch notifications for the owner
    const notifications = await Notification.find({
      recipient: ownerId,
      recipientType: "Owner",
    }).sort({ createdDate: -1 });

    res.status(200).json({ success: true, notifications });
  } catch (err) {
    console.error("Error fetching notifications:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update maintenance request status
exports.updateMaintenanceRequestStatus = async (req, res) => {
  try {
    const { requestId, status } = req.body;

    // Validate requestId
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid request ID" });
    }

    // Validate status
    const validStatuses = ["Pending", "In Progress", "Resolved"];
    if (!validStatuses.includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status value" });
    }

    // Find and update the maintenance request
    const maintenanceRequest = await MaintenanceRequest.findById(requestId);
    if (!maintenanceRequest) {
      return res
        .status(404)
        .json({ success: false, message: "Maintenance request not found" });
    }

    // Update status
    maintenanceRequest.status = status;
    await maintenanceRequest.save();

    return res.status(200).json({
      success: true,
      message: "Maintenance request status updated successfully",
      status: maintenanceRequest.status,
    });
  } catch (error) {
    console.error("Error updating maintenance request status:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while updating maintenance request status",
      error: error.message,
    });
  }
};

// Delete owner account
exports.deleteOwnerAccount = async (req, res) => {
  try {
    const ownerId = req.session.user?._id;
    const { password } = req.body;

    // Validate ownerId
    if (!ownerId || !mongoose.Types.ObjectId.isValid(ownerId)) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized: Invalid user ID" });
    }

    // Fetch owner
    const owner = await Owner.findById(ownerId);
    if (!owner) {
      return res
        .status(404)
        .json({ success: false, message: "Owner not found" });
    }

    // Validate password (plain text comparison)
    if (password !== owner.password) {
      return res
        .status(400)
        .json({ success: false, message: "Incorrect password" });
    }

    // Fetch properties by ownerId
    const properties = await Property.find({
      ownerId: new mongoose.Types.ObjectId(ownerId),
    });

    // Check if any properties are rented
    const hasRentedProperties = properties.some(
      (property) => property.isRented
    );
    if (hasRentedProperties) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete account because one or more properties are currently rented",
      });
    }

    // Delete all properties owned by the owner
    if (properties.length > 0) {
      await Property.deleteMany({
        ownerId: new mongoose.Types.ObjectId(ownerId),
      });
    }

    // Delete the owner account
    await Owner.findByIdAndDelete(ownerId);

    // Clear session
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
      }
    });

    return res.status(200).json({
      success: true,
      message: "Account and associated properties deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting owner account:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while deleting account",
      error: error.message,
    });
  }
};

// Update owner settings
exports.updateOwnerSettings = async (req, res) => {
  try {
    const ownerId = req.session.user._id;
    const {
      firstName,
      lastName,
      email,
      phone,
      location,
      accountNo,
      upiid,
      numProperties,
      emailNotifications,
      smsNotifications,
      paymentReminders,
      complaintAlerts,
      maintenanceAlerts,
      currentPassword,
      newPassword,
      confirmPassword,
    } = req.body;

    // Validate ownerId
    if (!ownerId || !mongoose.Types.ObjectId.isValid(ownerId)) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized: Invalid user ID" });
    }

    // Fetch owner
    const owner = await Owner.findById(ownerId);
    if (!owner) {
      return res
        .status(404)
        .json({ success: false, message: "Owner not found" });
    }

    // Update personal information
    if (firstName) owner.firstName = firstName;
    if (lastName) owner.lastName = lastName;
    if (email) owner.email = email;
    if (phone) owner.phone = phone;
    if (location) owner.location = location;
    if (accountNo) owner.accountNo = accountNo;
    if (upiid) owner.upiid = upiid;
    if (numProperties) owner.numProperties = numProperties;

    // Update notification preferences
    owner.notifications = {
      email: emailNotifications === "true",
      sms: smsNotifications === "true",
      payment: paymentReminders === "true",
      complaint: complaintAlerts === "true",
      maintenance: maintenanceAlerts === "true",
    };

    // Handle password change
    if (currentPassword && newPassword && confirmPassword) {
      // Validate current password (plain text comparison as per existing logic)
      if (currentPassword !== owner.password) {
        return res
          .status(400)
          .json({ success: false, message: "Incorrect current password" });
      }
      // Validate new password match
      if (newPassword !== confirmPassword) {
        return res
          .status(400)
          .json({ success: false, message: "New passwords do not match" });
      }
      // Update password
      owner.password = newPassword;
    }

    // Save updated owner data
    await owner.save();

    // Update session data
    req.session.user = {
      ...req.session.user,
      firstName: owner.firstName,
      lastName: owner.lastName,
      email: owner.email,
      phone: owner.phone,
      location: owner.location,
      accountNo: owner.accountNo,
      upiid: owner.upiid,
      numProperties: owner.numProperties,
    };

    return res.status(200).json({
      success: true,
      message: "Settings updated successfully",
    });
  } catch (error) {
    console.error("Error updating owner settings:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while updating settings",
      error: error.message,
    });
  }
};
