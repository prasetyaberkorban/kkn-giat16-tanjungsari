const mongoose = require('mongoose');

const ContentListSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  executionDate: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['Not yet', 'Done'],
    default: 'Not yet'
  },
  refLink: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ContentList', ContentListSchema);
