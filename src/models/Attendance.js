const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  division: {
    type: String,
    default: '-'
  },
  team: {
    type: String,
    required: true
  },
  date: {
    type: String, // format YYYY-MM-DD
    required: true
  },
  time: {
    type: String, // format HH:MM:SS
    required: true
  },
  dayName: {
    type: String, // e.g. Senin, Selasa
    required: true
  },
  task: {
    type: String, // e.g. Masak & Belanja
    required: true
  },
  status: {
    type: String,
    default: 'Hadir'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indeks unik agar satu orang tidak bisa absen lebih dari sekali pada tanggal yang sama
AttendanceSchema.index({ name: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);
