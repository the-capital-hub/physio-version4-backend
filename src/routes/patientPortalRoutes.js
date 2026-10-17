const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");
const controller = require("../controllers/patientPortalController");

const router = express.Router();
const uploadDir = path.resolve(process.env.MEDICAL_RECORDS_DIR || path.join(process.cwd(), "private_uploads", "medical-records"));
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, _file, cb) => cb(null, `${crypto.randomUUID()}.upload`),
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const allowed = new Set(["application/pdf", "image/png", "image/jpeg"]);
    if (!allowed.has(file.mimetype)) return cb(new Error("Only PDF, PNG, and JPEG files are allowed."));
    cb(null, true);
  },
});

router.use(requireAuth);
router.get("/", requireRole("patient"), controller.getMine);
router.post("/progress", requireRole("patient"), controller.addProgress);
router.patch("/settings", requireRole("patient"), controller.updateSettings);
router.post("/records", requireRole("patient"), (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (!err) return next();
    const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    return res.status(status).json({ success: false, message: err.message || "Unable to upload document." });
  });
}, controller.uploadRecord);
router.get("/records/:id/download", requireRole("patient"), controller.downloadRecord);
router.delete("/records/:id", requireRole("patient"), controller.deleteRecord);
router.put("/recovery-plan", requireRole("physiotherapist"), controller.setRecoveryPlan);

module.exports = router;
