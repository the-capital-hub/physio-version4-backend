const mongoose = require("mongoose");

const patientMedicalRecordSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  fileName: { type: String, required: true, maxlength: 255 },
  storedName: { type: String, required: true, unique: true },
  mimeType: { type: String, required: true, enum: ["application/pdf", "image/png", "image/jpeg"] },
  size: { type: Number, required: true, max: 5 * 1024 * 1024 },
}, { timestamps: true });

module.exports = mongoose.model("PatientMedicalRecord", patientMedicalRecordSchema);
