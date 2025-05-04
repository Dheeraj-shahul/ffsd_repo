const mongoose = require("mongoose");

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

  // New fields
  savedListings: [{ type: mongoose.Schema.Types.ObjectId, ref: "Property" }],
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" },
  maintenanceRequestIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "MaintenanceRequest" }],
  complaintIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Complaint" }],
  notificationIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Notification" }],
  domesticWorkerId: { type: mongoose.Schema.Types.ObjectId, ref: "Worker" },
  rentalHistoryId: { type: mongoose.Schema.Types.ObjectId, ref: "RentalHistory" },
  ratingId: { type: mongoose.Schema.Types.ObjectId, ref: "Rating" },

}, { timestamps: true });

module.exports = mongoose.model("Tenant", tenantSchema);