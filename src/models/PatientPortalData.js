const mongoose = require("mongoose");

const progressEntrySchema = new mongoose.Schema({
  value: { type: Number, required: true, min: 0, max: 10 },
  note: { type: String, trim: true, maxlength: 300, default: "" },
}, { timestamps: true });

const recoveryItemSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 1000, default: "" },
  frequency: { type: String, trim: true, maxlength: 120, default: "" },
}, { _id: true });

const patientPortalDataSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
  settings: {
    appointmentReminders: { type: Boolean, default: true },
    exerciseReminders: { type: Boolean, default: true },
    productUpdates: { type: Boolean, default: false },
  },
  progressEntries: { type: [progressEntrySchema], default: [] },
  recoveryPlan: {
    title: { type: String, trim: true, maxlength: 160, default: "" },
    summary: { type: String, trim: true, maxlength: 1500, default: "" },
    items: { type: [recoveryItemSchema], default: [] },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updatedAt: { type: Date, default: null },
  },
}, { timestamps: true });

module.exports = mongoose.model("PatientPortalData", patientPortalDataSchema);
