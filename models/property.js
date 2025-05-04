// D:\RentEase\models\property.js
const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  id: Number,
  name: String,
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "Owner" },
  owner: String,
  location: String,
  type: String,
  subtype: String,
  status: { type: String, default: "Pending" },
  isRented: { type: Boolean, default: false },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant" },
  tenant: String,
  activeWorkerIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Worker" }],
  price: Number, // Converted to Number (from String) for consistency
  rating: Number,
  reviews: Number,
  isVerified: { type: Boolean, default: false },

  // Fields from the second schema
  address: String,
  beds: Number,
  baths: Number,
  size: String,
  floor: String,
  furnished: String,
  description: String,
  images: [String],
  amenities: [String],
  map: String,
  securityDeposit: Number,
  maintenance: Number,
  availableFrom: Date,
  preferredTenants: String,
  leaseDuration: String,
  contactNumber: String,
  alternativeNumber: String,
  contactEmail: String,

}, { timestamps: true });

module.exports = mongoose.model('Property', propertySchema);