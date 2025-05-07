const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  type: String,
  message: String,
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'recipientType' // Dynamic reference based on recipientType
  },
  recipientType: {
    type: String,
    enum: ['Owner', 'Tenant', 'Worker'],
    required: true
  },
  recipientName: String,
  worker: { type: mongoose.Schema.Types.ObjectId, ref: "Worker" },
  workerName: String,
  propertyName: { type: String },
  status: { type: String, enum: ['Pending', 'Completed'], default: 'Pending' },
  priority: String,
  createdDate: Date,
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" }
}, { timestamps: true });

module.exports = mongoose.model("Notification", notificationSchema);