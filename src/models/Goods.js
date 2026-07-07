const mongoose = require('mongoose');

const GoodsSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['pribadi', 'kelompok'],
    default: 'pribadi',
    required: true
  },
  qty: {
    type: String,
    default: '',
    trim: true
  },
  note: {
    type: String,
    default: '',
    trim: true
  },
  pj: {
    type: String,
    default: '',
    trim: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Goods', GoodsSchema);
