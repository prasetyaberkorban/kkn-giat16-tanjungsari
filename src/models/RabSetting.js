const mongoose = require('mongoose');

const RabSettingSchema = new mongoose.Schema({
  type: { type: String, required: true, unique: true },
  uangSisa: { type: Number, default: 0 }
});

module.exports = mongoose.model('RabSetting', RabSettingSchema);
