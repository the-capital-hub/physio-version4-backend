const express = require("express");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");
const { listMine, create, cancelMine } = require("../controllers/appointmentController");

const router = express.Router();
router.use(requireAuth, requireRole("patient"));
router.get("/mine", listMine);
router.post("/", create);
router.patch("/:id/cancel", cancelMine);
module.exports = router;
