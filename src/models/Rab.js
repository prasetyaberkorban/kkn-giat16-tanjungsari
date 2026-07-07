const mongoose = require('mongoose');

const RabSchema = new mongoose.Schema({
  type: { type: String, required: true },
  prokerName: { type: String, default: '' },
  kebutuhan: { type: String, required: true },
  satuan: { type: String, default: '' },
  volume: { type: Number, default: 1 },
  harga: { type: Number, default: 0 },
  hargaSatuan: { type: Number, default: 0 },
  anggota: { type: Number, default: 11 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Rab', RabSchema);
