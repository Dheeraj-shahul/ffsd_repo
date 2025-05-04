const mongoose = require("mongoose");
const bookingSchema = new mongoose.Schema({
  id: String,
  user: String,
  property: String,
  status: String,
});
module.exports = mongoose.model("Booking", bookingSchema);