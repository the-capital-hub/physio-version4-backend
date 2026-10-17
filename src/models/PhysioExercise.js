const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  physiotherapist: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  category: { type: String, required: true, trim: true, maxlength: 60 },
  instructions: { type: String, default: '', maxlength: 3000 },
  durationMinutes: { type: Number, min: 1, max: 240, default: 10 },
  difficulty: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Beginner' },
  active: { type: Boolean, default: true },
}, { timestamps: true });
schema.index({ physiotherapist: 1, name: 1 });
module.exports = mongoose.model('PhysioExercise', schema);
