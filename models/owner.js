const mongoose = require("mongoose");

const ownerSchema = new mongoose.Schema({
  
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

  // New fields
  propertyIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Property" }],
  tenantIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Tenant" }],
  rentalId: { type: mongoose.Schema.Types.ObjectId, ref: "Rental" },
  complaintIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Complaint" }],
  maintenanceRequestIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "MaintenanceRequest" }],
  notificationIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Notification" }],
  rentalAgreementIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "RentalAgreement" }],

}, { timestamps: true });

module.exports = mongoose.model("Owner", ownerSchema);