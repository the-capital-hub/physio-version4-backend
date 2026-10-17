const Appointment = require("../models/Appointment");

const allowedServices = [
  "Initial physiotherapy consultation",
  "Follow up session",
  "Pain assessment",
  "Post surgery rehabilitation",
  "Sports injury rehabilitation",
  "Online physiotherapy consultation",
];
const allowedTimes = ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00"];

exports.listMine = async (req, res) => {
  try {
    const appointments = await Appointment.find({ patient: req.user._id }).sort({ date: 1, time: 1, createdAt: -1 }).lean();
    return res.json({ success: true, appointments });
  } catch (error) {
    console.error("List appointments error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to load appointments." });
  }
};

exports.create = async (req, res) => {
  try {
    const { service, date, time, notes = "" } = req.body || {};
    if (!allowedServices.includes(service)) return res.status(400).json({ success: false, message: "Choose a valid appointment type." });
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ success: false, message: "Choose a valid date." });
    const chosen = new Date(`${date}T00:00:00`);
    if (Number.isNaN(chosen.getTime()) || chosen.toISOString().slice(0, 10) !== date) return res.status(400).json({ success: false, message: "Choose a valid date." });
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (chosen < today) return res.status(400).json({ success: false, message: "Appointment date cannot be in the past." });
    if (!allowedTimes.includes(time)) return res.status(400).json({ success: false, message: "Choose a valid appointment time." });
    if (typeof notes !== "string" || notes.length > 1000) return res.status(400).json({ success: false, message: "Notes must be 1000 characters or fewer." });

    const collision = await Appointment.findOne({ date, time, status: { $in: ["pending", "confirmed"] } });
    // This prevents two requests at the same slot in this simple MVP. Staff confirmation is still required.
    if (collision) return res.status(409).json({ success: false, message: "That time has already been requested. Please choose another time." });

    const appointment = await Appointment.create({
      patient: req.user._id,
      service, date, time, notes: notes.trim(),
      mode: service === "Online physiotherapy consultation" ? "online" : "clinic",
    });
    return res.status(201).json({ success: true, appointment });
  } catch (error) {
    console.error("Create appointment error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to create the appointment request." });
  }
};

exports.cancelMine = async (req, res) => {
  try {
    const appointment = await Appointment.findOne({ _id: req.params.id, patient: req.user._id });
    if (!appointment) return res.status(404).json({ success: false, message: "Appointment not found." });
    if (!["pending", "confirmed"].includes(appointment.status)) return res.status(409).json({ success: false, message: "This appointment can no longer be cancelled." });
    appointment.status = "cancelled";
    await appointment.save();
    return res.json({ success: true, appointment });
  } catch (error) {
    if (error.name === "CastError") return res.status(404).json({ success: false, message: "Appointment not found." });
    console.error("Cancel appointment error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to cancel this appointment." });
  }
};
