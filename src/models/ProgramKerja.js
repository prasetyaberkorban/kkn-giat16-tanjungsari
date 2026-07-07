const mongoose = require('mongoose');

const ProgramKerjaSchema = new mongoose.Schema({
  programKerja: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['Wajib', 'Tambahan'],
    required: true
  },
  bidang: {
    type: String,
    required: true,
    trim: true
  },
  rincian: {
    type: String,
    trim: true,
    default: ''
  },
  pelaksanaan: {
    type: String,
    trim: true,
    default: ''
  },
  pj: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ProgramKerja', ProgramKerjaSchema);
