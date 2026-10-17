const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  physiotherapist: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  startsAt: { type: Date, required: true, index: true },
  type: { type: String, default: 'Physiotherapy session', trim: true, maxlength: 120 },
  durationMinutes: { type: Number, min: 10, max: 240, default: 45 },
  status: { type: String, enum: ['Pending', 'Confirmed', 'Cancelled', 'Completed'], default: 'Pending', index: true },
  notes: { type: String, default: '', maxlength: 2000 },
}, { timestamps: true });
schema.index({ physiotherapist: 1, startsAt: 1 });
module.exports = mongoose.model('PhysioAppointment', schema);
