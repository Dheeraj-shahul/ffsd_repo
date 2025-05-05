const mongoose = require("mongoose");

const workerSchema = new mongoose.Schema({
  userType: { type: String, default: "worker" },
  firstName: String,
  lastName: String,
  email: String,
  phone: String,
  location: String,
  area: String,
  serviceType: String,
  experience: Number,
  price: Number,
  description: String,
  image: String,
  password: String,
  availability: { type: Boolean, default: true },
  status: { type: String, default: "Active" },
  lastLogin: Date,
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: "Service" },
  bookingIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Booking" }],
  clientIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Tenant" }],
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" },
  ratingId: {
    type: {
      average: Number,
      reviews: [{
        user: String,
        rating: Number,
        date: String,
        comment: String
      }]
    },
    default: null
  },
}, { timestamps: true });

module.exports = mongoose.model("Worker", workerSchema);