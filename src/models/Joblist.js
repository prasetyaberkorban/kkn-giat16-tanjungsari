const mongoose = require('mongoose');

const joblistSchema = new mongoose.Schema({
  division: {
    type: String,
    required: true,
    enum: ['Ketua', 'Sekretaris', 'Bendahara', 'Acara', 'Humas', 'Logistik', 'PDD']
  },
  taskName: {
    type: String,
    required: true,
    trim: true
  },
  note: {
    type: String,
    default: ''
  },
  dueDate: {
    type: String, // YYYY-MM-DD
    default: ''
  },
  status: {
    type: String,
    enum: ['NOT STARTED', 'IN PROGRES', 'COMPLETED'],
    default: 'NOT STARTED'
  },
  progressInfo: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Joblist', joblistSchema);
