const express = require('express');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const c = require('../controllers/adminController');
const router = express.Router();
// Never make this router public. Admin must be granted by a trusted server-side process.
router.use(requireAuth, requireRole('admin'));
router.get('/overview', c.overview);
router.get('/users', c.listUsers);
router.patch('/users/:id/status', c.updateUserStatus);
router.get('/appointments', c.listAppointments);
router.patch('/appointments/:id', c.updateAppointment);
router.get('/billing', c.listBilling);
router.post('/billing', c.createBilling);
module.exports = router;
