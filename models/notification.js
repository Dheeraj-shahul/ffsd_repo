const mongoose = require("mongoose");
const notificationSchema = new mongoose.Schema({
  id: String,
  type: String,
  message: String,
});
module.exports = mongoose.model("Notification", notificationSchema);