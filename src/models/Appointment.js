const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  service: {
    type: String,
    required: true,
    enum: [
      "Initial physiotherapy consultation",
      "Follow up session",
      "Pain assessment",
      "Post surgery rehabilitation",
      "Sports injury rehabilitation",
      "Online physiotherapy consultation",
    ],
  },
  date: { type: String, required: true, match: [/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date"] },
  time: { type: String, required: true, match: [/^(09|10|11|12|14|15|16|17):00$/, "Choose a valid appointment time"] },
  notes: { type: String, trim: true, maxlength: 1000, default: "" },
  mode: { type: String, enum: ["clinic", "online"], default: "clinic" },
  status: { type: String, enum: ["pending", "confirmed", "cancelled", "completed"], default: "pending", index: true },
}, { timestamps: true });

appointmentSchema.index({ patient: 1, date: 1, time: 1 });
module.exports = mongoose.model("Appointment", appointmentSchema);
