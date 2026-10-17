const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const PatientPortalData = require("../models/PatientPortalData");
const PatientMedicalRecord = require("../models/PatientMedicalRecord");

const uploadDir = path.resolve(process.env.MEDICAL_RECORDS_DIR || path.join(process.cwd(), "private_uploads", "medical-records"));
const settingsKeys = ["appointmentReminders", "exerciseReminders", "productUpdates"];
const defaultSettings = { appointmentReminders: true, exerciseReminders: true, productUpdates: false };

async function getOrCreate(patientId) {
  let doc = await PatientPortalData.findOne({ patient: patientId });
  if (!doc) {
    try { doc = await PatientPortalData.create({ patient: patientId }); }
    catch (e) { if (e.code === 11000) doc = await PatientPortalData.findOne({ patient: patientId }); else throw e; }
  }
  return doc;
}

exports.getMine = async (req, res) => {
  try {
    const [doc, records] = await Promise.all([
      getOrCreate(req.user._id),
      PatientMedicalRecord.find({ patient: req.user._id }).select("name fileName mimeType size createdAt").sort({ createdAt: -1 }).lean(),
    ]);
    const progressEntries = [...doc.progressEntries].sort((a, b) => b.createdAt - a.createdAt).slice(0, 100);
    return res.json({
      success: true,
      settings: doc.settings || defaultSettings,
      progressEntries,
      recoveryPlan: doc.recoveryPlan?.title ? doc.recoveryPlan : null,
      records,
    });
  } catch (error) {
    console.error("Get patient portal error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to load patient portal data." });
  }
};

exports.addProgress = async (req, res) => {
  try {
    const { value, note = "" } = req.body || {};
    if (!Number.isInteger(value) || value < 0 || value > 10) return res.status(400).json({ success: false, message: "Progress value must be a whole number from 0 to 10." });
    if (typeof note !== "string" || note.length > 300) return res.status(400).json({ success: false, message: "Progress note must be 300 characters or fewer." });
    const doc = await getOrCreate(req.user._id);
    doc.progressEntries.unshift({ value, note: note.trim() });
    if (doc.progressEntries.length > 100) doc.progressEntries = doc.progressEntries.slice(0, 100);
    await doc.save();
    return res.status(201).json({ success: true, entry: doc.progressEntries[0] });
  } catch (error) {
    console.error("Add progress error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to save progress entry." });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const updates = req.body || {};
    const keys = Object.keys(updates);
    if (!keys.length || keys.some(k => !settingsKeys.includes(k)) || keys.some(k => typeof updates[k] !== "boolean")) {
      return res.status(400).json({ success: false, message: "Provide valid notification preference values." });
    }
    const doc = await getOrCreate(req.user._id);
    keys.forEach(k => { doc.settings[k] = updates[k]; });
    await doc.save();
    return res.json({ success: true, settings: doc.settings });
  } catch (error) {
    console.error("Update patient settings error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to save preferences." });
  }
};

exports.uploadRecord = async (req, res) => {
  let storedName;
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "Choose a PDF or image up to 5 MB." });
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    if (!name || name.length > 100) {
      fs.promises.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ success: false, message: "Document name is required and must be under 100 characters." });
    }
    storedName = req.file.filename;
    const record = await PatientMedicalRecord.create({
      patient: req.user._id, name, fileName: path.basename(req.file.originalname).slice(0, 255),
      storedName, mimeType: req.file.mimetype, size: req.file.size,
    });
    return res.status(201).json({ success: true, record: {
      _id: record._id, name: record.name, fileName: record.fileName,
      mimeType: record.mimeType, size: record.size, createdAt: record.createdAt,
    }});
  } catch (error) {
    if (req.file?.path) fs.promises.unlink(req.file.path).catch(() => {});
    console.error("Upload medical record error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to upload medical document." });
  }
};

exports.downloadRecord = async (req, res) => {
  try {
    const record = await PatientMedicalRecord.findOne({ _id: req.params.id, patient: req.user._id });
    if (!record) return res.status(404).json({ success: false, message: "Document not found." });
    const filePath = path.join(uploadDir, record.storedName);
    if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, message: "Stored document is unavailable on this server." });
    res.setHeader("Content-Type", record.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${record.fileName.replace(/["\\\r\n]/g, "_")}"`);
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.sendFile(filePath);
  } catch (error) {
    if (error.name === "CastError") return res.status(404).json({ success: false, message: "Document not found." });
    console.error("Download medical record error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to download document." });
  }
};

exports.deleteRecord = async (req, res) => {
  try {
    const record = await PatientMedicalRecord.findOneAndDelete({ _id: req.params.id, patient: req.user._id });
    if (!record) return res.status(404).json({ success: false, message: "Document not found." });
    fs.promises.unlink(path.join(uploadDir, record.storedName)).catch(() => {});
    return res.json({ success: true });
  } catch (error) {
    if (error.name === "CastError") return res.status(404).json({ success: false, message: "Document not found." });
    console.error("Delete medical record error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to delete document." });
  }
};

// This handler is intentionally restricted to trusted clinician/admin roles by its route.
exports.setRecoveryPlan = async (req, res) => {
  try {
    const { patientId, title, summary = "", items = [] } = req.body || {};
    if (!patientId || typeof title !== "string" || !title.trim() || title.length > 160 ||
        typeof summary !== "string" || summary.length > 1500 || !Array.isArray(items) || items.length > 30) {
      return res.status(400).json({ success: false, message: "Provide a valid recovery plan." });
    }
    const cleanItems = [];
    for (const item of items) {
      if (!item || typeof item.title !== "string" || !item.title.trim() || item.title.length > 120 ||
          typeof (item.description || "") !== "string" || (item.description || "").length > 1000 ||
          typeof (item.frequency || "") !== "string" || (item.frequency || "").length > 120) {
        return res.status(400).json({ success: false, message: "One or more recovery plan items are invalid." });
      }
      cleanItems.push({ title: item.title.trim(), description: (item.description || "").trim(), frequency: (item.frequency || "").trim() });
    }
    const doc = await PatientPortalData.findOneAndUpdate(
      { patient: patientId },
      { $set: { recoveryPlan: { title: title.trim(), summary: summary.trim(), items: cleanItems, updatedBy: req.user._id, updatedAt: new Date() } }, $setOnInsert: { patient: patientId } },
      { new: true, upsert: true, runValidators: true }
    );
    return res.json({ success: true, recoveryPlan: doc.recoveryPlan });
  } catch (error) {
    console.error("Set recovery plan error:", error.message);
    return res.status(500).json({ success: false, message: "Unable to save recovery plan." });
  }
};
