const mongoose = require('mongoose');

const QrSettingSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    default: 'active_qr'
  },
  value: {
    type: Number,
    required: true,
    min: 1,
    max: 4,
    default: 1
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('QrSetting', QrSettingSchema);
