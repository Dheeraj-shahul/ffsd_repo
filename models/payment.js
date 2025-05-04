// Payment Model

const mongoose = require('mongoose');
const paymentSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Tenant" },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property" },
  amount: Number,
  paymentDate: Date,
  dueDate: Date,
  paymentMethod: String,
  status: { type: String, default: "Pending", enum: ["Pending", "Paid", "Overdue"] },
  receiptUrl: String,
}, { timestamps: true });
module.exports= mongoose.model('Payment', paymentSchema);
