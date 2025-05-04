const mongoose = require('mongoose');

const maintenanceRequestSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant" },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property" },
  issueType: String,
  description: String,
  location: String, // Location within property
  dateReported: { type: Date, default: Date.now },
  scheduledDate: Date,
  status: { type: String, default: "Pending", enum: ["Pending", "In Progress", "Completed"] },
  assignedTo: String,
  completedDate: Date,
}, { timestamps: true });

module.exports = mongoose.model('MaintenanceRequest', maintenanceRequestSchema);