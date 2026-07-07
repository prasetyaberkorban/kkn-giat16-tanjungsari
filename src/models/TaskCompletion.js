const mongoose = require('mongoose');

const TaskCompletionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  task: {
    type: String,
    required: true
  },
  date: {
    type: String, // format YYYY-MM-DD
    required: true
  },
  completed: {
    type: Boolean,
    default: true
  },
  completedAt: {
    type: Date,
    default: Date.now
  }
});

// Indeks unik agar tidak ada duplikasi data checklist untuk orang, tugas, dan tanggal yang sama
TaskCompletionSchema.index({ name: 1, task: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('TaskCompletion', TaskCompletionSchema);
