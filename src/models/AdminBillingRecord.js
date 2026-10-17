const mongoose = require('mongoose');
const AdminBillingRecordSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'INR', uppercase: true, trim: true },
  description: { type: String, required: true, trim: true, maxlength: 240 },
  type: { type: String, enum: ['subscription', 'appointment', 'refund', 'other'], default: 'subscription' },
  status: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending', index: true },
  externalPaymentId: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });
module.exports = mongoose.models.AdminBillingRecord || mongoose.model('AdminBillingRecord', AdminBillingRecordSchema);
