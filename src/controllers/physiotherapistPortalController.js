const mongoose = require('mongoose');
const RecoveryPlan = require('../models/RecoveryPlan');
const PhysioExercise = require('../models/PhysioExercise');
const PhysioAppointment = require('../models/PhysioAppointment');
const PhysioMessage = require('../models/PhysioMessage');
// If your existing user model file has a different name/path, update this import.
const User = require('../models/User');

const oid = (v) => mongoose.Types.ObjectId.isValid(v);
const physioId = (req) => req.user?._id || req.user?.id;
const patientProjection = '_id name email role';
const fail = (res, status, message) => res.status(status).json({ success: false, message });

exports.getOverview = async (req, res) => {
  try {
    const pid = physioId(req);
    const now = new Date(); const end = new Date(now); end.setHours(23,59,59,999);
    const [patientIds, appointments, activePlans, unreadMessages, plans] = await Promise.all([
      RecoveryPlan.distinct('patient', { physiotherapist: pid }),
      PhysioAppointment.find({ physiotherapist: pid, startsAt: { $gte: new Date(now.setHours(0,0,0,0)), $lte: end } }).populate('patient', patientProjection).sort({ startsAt: 1 }).lean(),
      RecoveryPlan.countDocuments({ physiotherapist: pid, status: 'Active' }),
      PhysioMessage.countDocuments({ physiotherapist: pid, senderRole: 'patient', readAt: null }),
      RecoveryPlan.find({ physiotherapist: pid }).select('progress status').lean(),
    ]);
    res.json({ success: true, stats: { totalPatients: patientIds.length, todaySessions: appointments.length, activePlans, unreadMessages, averageProgress: plans.length ? Math.round(plans.reduce((n,p)=>n+(p.progress||0),0)/plans.length) : 0 }, appointments: appointments.map(formatAppointment) });
  } catch (e) { console.error('Physio overview:', e.message); fail(res, 500, 'Unable to load dashboard overview.'); }
};

exports.listPatients = async (req, res) => {
  try {
    const pid = physioId(req);
    const ids = await RecoveryPlan.distinct('patient', { physiotherapist: pid });
    const query = ids.length ? { _id: { $in: ids }, role: 'patient' } : { _id: { $in: [] } };
    const users = await User.find(query).select(patientProjection).lean();
    const plans = await RecoveryPlan.find({ physiotherapist: pid, patient: { $in: ids } }).sort({ updatedAt: -1 }).lean();
    const latest = new Map(); for (const p of plans) if (!latest.has(String(p.patient))) latest.set(String(p.patient), p);
    res.json({ success: true, patients: users.map(u => { const p = latest.get(String(u._id)); return { id: String(u._id), name: u.name || 'Patient', email: u.email || '', condition: p?.goals?.[0] || 'Not specified', plan: p?.title || 'No recovery plan', progress: p?.progress || 0, status: p?.status || 'Needs plan', nextReview: p?.reviewDate || null }; }) });
  } catch (e) { console.error('Physio patients:', e.message); fail(res, 500, 'Unable to load patients.'); }
};

exports.listAppointments = async (req, res) => {
  try { const items = await PhysioAppointment.find({ physiotherapist: physioId(req) }).populate('patient', patientProjection).sort({ startsAt: 1 }).limit(250).lean(); res.json({ success: true, appointments: items.map(formatAppointment) }); }
  catch (e) { console.error(e.message); fail(res, 500, 'Unable to load appointments.'); }
};
exports.createAppointment = async (req, res) => {
  try {
    const { patientId, startsAt, type, durationMinutes, notes } = req.body || {};
    if (!oid(patientId) || !startsAt || Number.isNaN(new Date(startsAt).getTime())) return fail(res, 400, 'A valid patientId and startsAt are required.');
    const patient = await User.findOne({ _id: patientId, role: 'patient' }).select('_id');
    if (!patient) return fail(res, 404, 'Patient not found.');
    const item = await PhysioAppointment.create({ physiotherapist: physioId(req), patient: patient._id, startsAt: new Date(startsAt), type, durationMinutes, notes });
    await item.populate('patient', patientProjection); res.status(201).json({ success: true, appointment: formatAppointment(item.toObject()) });
  } catch (e) { console.error(e.message); fail(res, 500, 'Unable to create appointment.'); }
};
exports.updateAppointment = async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!['Pending','Confirmed','Cancelled','Completed'].includes(status)) return fail(res, 400, 'Invalid appointment status.');
    const item = await PhysioAppointment.findOneAndUpdate({ _id: req.params.id, physiotherapist: physioId(req) }, { $set: { status } }, { new: true, runValidators: true }).populate('patient', patientProjection).lean();
    if (!item) return fail(res, 404, 'Appointment not found.'); res.json({ success: true, appointment: formatAppointment(item) });
  } catch (e) { console.error(e.message); fail(res, 500, 'Unable to update appointment.'); }
};
exports.listPlans = async (req, res) => {
  try { const items = await RecoveryPlan.find({ physiotherapist: physioId(req) }).populate('patient', patientProjection).sort({ updatedAt: -1 }).lean(); res.json({ success: true, plans: items.map(formatPlan) }); }
  catch (e) { console.error(e.message); fail(res, 500, 'Unable to load recovery plans.'); }
};
exports.createPlan = async (req, res) => {
  try {
    const { patientId, title, clinicalNotes = '', goals = [], exercises = [], status = 'Active', progress = 0, reviewDate } = req.body || {};
    if (!oid(patientId) || typeof title !== 'string' || !title.trim()) return fail(res, 400, 'A valid patientId and plan title are required.');
    if (!Array.isArray(goals) || !Array.isArray(exercises) || !Number.isFinite(Number(progress)) || Number(progress)<0 || Number(progress)>100) return fail(res, 400, 'Invalid plan fields.');
    const patient = await User.findOne({ _id: patientId, role: 'patient' }).select('_id'); if (!patient) return fail(res, 404, 'Patient not found.');
    const plan = await RecoveryPlan.create({ physiotherapist: physioId(req), patient: patient._id, title: title.trim(), clinicalNotes, goals: goals.slice(0,30), exercises: exercises.slice(0,50), status, progress: Number(progress), reviewDate: reviewDate || undefined });
    await plan.populate('patient', patientProjection); res.status(201).json({ success: true, plan: formatPlan(plan.toObject()) });
  } catch (e) { console.error(e.message); fail(res, 500, 'Unable to create recovery plan.'); }
};
exports.updatePlan = async (req, res) => {
  try {
    const allowed = ['title','clinicalNotes','goals','exercises','status','progress','reviewDate']; const update = {};
    for (const key of allowed) if (req.body && Object.prototype.hasOwnProperty.call(req.body,key)) update[key] = req.body[key];
    if (!Object.keys(update).length) return fail(res, 400, 'No valid fields supplied.');
    if (update.progress !== undefined && (!Number.isFinite(Number(update.progress)) || Number(update.progress)<0 || Number(update.progress)>100)) return fail(res, 400, 'Progress must be between 0 and 100.');
    const item = await RecoveryPlan.findOneAndUpdate({ _id: req.params.id, physiotherapist: physioId(req) }, { $set: update }, { new: true, runValidators: true }).populate('patient', patientProjection).lean();
    if (!item) return fail(res, 404, 'Recovery plan not found.'); res.json({ success: true, plan: formatPlan(item) });
  } catch (e) { console.error(e.message); fail(res, 500, 'Unable to update recovery plan.'); }
};
exports.deletePlan = async (req, res) => {
  try { const item = await RecoveryPlan.findOneAndDelete({ _id: req.params.id, physiotherapist: physioId(req) }); if (!item) return fail(res, 404, 'Recovery plan not found.'); res.json({ success: true }); }
  catch (e) { console.error(e.message); fail(res, 500, 'Unable to delete recovery plan.'); }
};
exports.listExercises = async (req, res) => {
  try { const items = await PhysioExercise.find({ physiotherapist: physioId(req), active: true }).sort({ name: 1 }).lean(); res.json({ success: true, exercises: items }); }
  catch (e) { console.error(e.message); fail(res, 500, 'Unable to load exercises.'); }
};
exports.createExercise = async (req, res) => {
  try { const { name, category, instructions = '', durationMinutes = 10, difficulty = 'Beginner' } = req.body || {}; if (!name?.trim() || !category?.trim()) return fail(res, 400, 'Exercise name and category are required.'); const item = await PhysioExercise.create({ physiotherapist: physioId(req), name: name.trim(), category: category.trim(), instructions, durationMinutes, difficulty }); res.status(201).json({ success: true, exercise: item }); }
  catch (e) { console.error(e.message); fail(res, 500, 'Unable to create exercise.'); }
};
exports.deleteExercise = async (req, res) => {
  try { const item = await PhysioExercise.findOneAndUpdate({ _id: req.params.id, physiotherapist: physioId(req) }, { active: false }, { new: true }); if (!item) return fail(res, 404, 'Exercise not found.'); res.json({ success: true }); }
  catch (e) { console.error(e.message); fail(res, 500, 'Unable to remove exercise.'); }
};
exports.listMessages = async (req, res) => {
  try { const items = await PhysioMessage.find({ physiotherapist: physioId(req) }).populate('patient', patientProjection).sort({ createdAt: -1 }).limit(300).lean(); res.json({ success: true, messages: items.map(m => ({ id: String(m._id), patientId: String(m.patient?._id || m.patient), patient: m.patient?.name || 'Patient', text: m.text, senderRole: m.senderRole, unread: m.senderRole === 'patient' && !m.readAt, createdAt: m.createdAt })) }); }
  catch (e) { console.error(e.message); fail(res, 500, 'Unable to load messages.'); }
};
exports.sendMessage = async (req, res) => {
  try { const { patientId, text } = req.body || {}; if (!oid(patientId) || typeof text !== 'string' || !text.trim()) return fail(res, 400, 'A valid patientId and message text are required.'); const hasCare = await RecoveryPlan.exists({ physiotherapist: physioId(req), patient: patientId }); if (!hasCare) return fail(res, 403, 'You can message only patients assigned to your care.'); const item = await PhysioMessage.create({ physiotherapist: physioId(req), patient: patientId, text: text.trim(), senderRole: 'physiotherapist' }); res.status(201).json({ success: true, message: item }); }
  catch (e) { console.error(e.message); fail(res, 500, 'Unable to send message.'); }
};
exports.markMessagesRead = async (req, res) => {
  try { const filter = { physiotherapist: physioId(req), senderRole: 'patient', readAt: null }; if (req.params.patientId) { if (!oid(req.params.patientId)) return fail(res, 400, 'Invalid patient ID.'); filter.patient = req.params.patientId; } await PhysioMessage.updateMany(filter, { $set: { readAt: new Date() } }); res.json({ success: true }); }
  catch (e) { console.error(e.message); fail(res, 500, 'Unable to update messages.'); }
};
exports.getProfile = async (req, res) => {
  try { const user = await User.findById(physioId(req)).select('_id name email role phone specialization createdAt').lean(); if (!user) return fail(res, 404, 'Profile not found.'); res.json({ success: true, profile: user }); }
  catch (e) { console.error(e.message); fail(res, 500, 'Unable to load profile.'); }
};
function formatAppointment(a) { const d = a.startsAt ? new Date(a.startsAt) : new Date(); return { id: String(a._id), patientId: String(a.patient?._id || a.patient), patient: a.patient?.name || 'Patient', patientEmail: a.patient?.email || '', time: d.toISOString(), type: a.type, durationMinutes: a.durationMinutes, status: a.status, notes: a.notes || '' }; }
function formatPlan(p) { return { id: String(p._id), patientId: String(p.patient?._id || p.patient), patient: p.patient?.name || 'Patient', title: p.title, clinicalNotes: p.clinicalNotes, goals: p.goals, exercises: p.exercises, status: p.status, progress: p.progress, startDate: p.startDate, reviewDate: p.reviewDate, updatedAt: p.updatedAt }; }
