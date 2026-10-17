const mongoose = require('mongoose');
const recoveryPlanSchema = new mongoose.Schema({
  physiotherapist: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  clinicalNotes: { type: String, default: '', maxlength: 4000 },
  goals: [{ type: String, trim: true, maxlength: 250 }],
  exercises: [{ name: { type: String, trim: true }, sets: { type: Number, min: 1, max: 20 }, reps: { type: String, maxlength: 80 }, notes: { type: String, maxlength: 500 } }],
  status: { type: String, enum: ['Active', 'Needs review', 'Completed', 'Paused'], default: 'Active' },
  progress: { type: Number, min: 0, max: 100, default: 0 },
  startDate: { type: Date, default: Date.now },
  reviewDate: { type: Date },
}, { timestamps: true });
recoveryPlanSchema.index({ physiotherapist: 1, patient: 1, updatedAt: -1 });
module.exports = mongoose.model('RecoveryPlan', recoveryPlanSchema);
