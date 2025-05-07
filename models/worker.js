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
  rateUnit: String, // From Service schema
  availability: String,
  description: String,
  image: String, // Already exists, will store the service/worker image
  password: String,
  status: { type: String, enum: ['Active', 'Suspended'], default: "Active" }, // Worker status (e.g., Active, Inactive)
  serviceStatus: { type: String, default: "Available" }, // From Service schema (Available/Unavailable)
  lastLogin: Date,
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
        comment: String,
        serviceName: String // Optional: Keep for review context
      }]
    },
    default: null
  },
}, { timestamps: true });

module.exports = mongoose.model("Worker", workerSchema);