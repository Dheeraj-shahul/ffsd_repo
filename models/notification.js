const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  id: String, // From first, preferring String over Number
  type: String, // From both
  message: String, // From both
  recipient: { type: mongoose.Schema.Types.ObjectId }, // From second
  recipientType: String, // From second
  recipientName: String, // From second
  worker: { type: mongoose.Schema.Types.ObjectId, ref: "Worker" }, // From second
  workerName: String, // From second
  status: String, // From second
  priority: String, // From second
  createdDate: Date, // From second
}, { timestamps: true });

module.exports = mongoose.model("Notification", notificationSchema);