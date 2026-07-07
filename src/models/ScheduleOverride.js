const mongoose = require('mongoose');

const ScheduleOverrideSchema = new mongoose.Schema({
  date: {
    type: String, // format YYYY-MM-DD
    required: true,
    unique: true
  },
  dailySchedule: {
    type: mongoose.Schema.Types.Mixed, // e.g. { 'TIM A': 'Masak & Belanja', 'TIM B': 'Cuci Piring' }
    default: {}
  },
  bathroomPiketTeam: {
    type: String,
    default: ''
  }
}, { timestamps: true });

module.exports = mongoose.model('ScheduleOverride', ScheduleOverrideSchema);
