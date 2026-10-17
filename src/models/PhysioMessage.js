const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  physiotherapist: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  text: { type: String, required: true, trim: true, maxlength: 3000 },
  senderRole: { type: String, enum: ['patient', 'physiotherapist'], required: true },
  readAt: { type: Date, default: null },
}, { timestamps: true });
schema.index({ physiotherapist: 1, patient: 1, createdAt: -1 });
module.exports = mongoose.model('PhysioMessage', schema);
