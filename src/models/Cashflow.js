const mongoose = require('mongoose');

const CashflowSchema = new mongoose.Schema({
  tanggal: { type: String, required: true },
  keterangan: { type: String, required: true },
  jenis: { type: String, enum: ['Pemasukan', 'Pengeluaran'], required: true },
  nominal: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Cashflow', CashflowSchema);
