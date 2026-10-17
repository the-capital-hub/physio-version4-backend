const mongoose = require('mongoose');
const User = require('../models/User');
const Appointment = require('../models/PhysioAppointment');
const Billing = require('../models/AdminBillingRecord');
const safeId = req => req.user?._id || req.user?.id;
const fail = (res, err) => res.status(err.status || 500).json({ message: err.status ? err.message : 'Admin request failed' });

exports.overview = async (req, res) => {
  try {
    const [totalUsers, physiotherapists, totalAppointments, pendingBilling, totalBilling] = await Promise.all([
      User.countDocuments(), User.countDocuments({ role: 'physiotherapist' }), Appointment.countDocuments(),
      Billing.countDocuments({ status: 'pending' }), Billing.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: null, total: { $sum: '$amount' } } }])
    ]);
    res.json({ data: { totalUsers, physiotherapists, totalAppointments, pendingBilling, paidBillingTotal: totalBilling[0]?.total || 0 } });
  } catch (e) { fail(res, e); }
};
exports.listUsers = async (req, res) => {
  try { const users = await User.find({}, 'name email role status createdAt').sort({ createdAt: -1 }).limit(500).lean(); res.json({ data: users }); }
  catch (e) { fail(res, e); }
};
exports.updateUserStatus = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid user id' });
    if (!['active', 'pending', 'suspended'].includes(req.body.status)) return res.status(400).json({ message: 'Invalid status' });
    if (String(req.params.id) === String(safeId(req))) return res.status(400).json({ message: 'You cannot change your own status here' });
    const user = await User.findByIdAndUpdate(req.params.id, { $set: { status: req.body.status } }, { new: true, runValidators: true }).select('name email role status');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ data: user });
  } catch (e) { fail(res, e); }
};
exports.listAppointments = async (req, res) => {
  try { const data = await Appointment.find({}).sort({ createdAt: -1 }).limit(500).populate('patient', 'name email').populate('physiotherapist', 'name email').lean(); res.json({ data }); }
  catch (e) { fail(res, e); }
};
exports.updateAppointment = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid appointment id' });
    const statusMap = { pending: 'Pending', confirmed: 'Confirmed', cancelled: 'Cancelled', completed: 'Completed' };
    const status = statusMap[String(req.body.status || '').toLowerCase()];
    if (!status) return res.status(400).json({ message: 'Invalid appointment status' });
    const data = await Appointment.findByIdAndUpdate(req.params.id, { $set: { status } }, { new: true, runValidators: true });
    if (!data) return res.status(404).json({ message: 'Appointment not found' }); res.json({ data });
  } catch (e) { fail(res, e); }
};
exports.listBilling = async (req, res) => {
  try { const data = await Billing.find({}).sort({ createdAt: -1 }).limit(500).populate('userId', 'name email').lean(); res.json({ data }); }
  catch (e) { fail(res, e); }
};
exports.createBilling = async (req, res) => {
  try {
    const { userId, amount, currency = 'INR', description, type = 'subscription', status = 'pending' } = req.body;
    if (!mongoose.isValidObjectId(userId)) return res.status(400).json({ message: 'A valid userId is required' });
    if (!Number.isFinite(Number(amount)) || Number(amount) < 0) return res.status(400).json({ message: 'Amount must be zero or greater' });
    if (!String(description || '').trim()) return res.status(400).json({ message: 'Description is required' });
    const user = await User.findById(userId).select('_id'); if (!user) return res.status(404).json({ message: 'User not found' });
    const data = await Billing.create({ userId, amount: Number(amount), currency, description, type, status, createdBy: safeId(req) });
    res.status(201).json({ data });
  } catch (e) { fail(res, e); }
};
