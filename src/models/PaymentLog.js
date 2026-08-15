const mongoose = require('mongoose');

const paymentLogSchema = new mongoose.Schema({
  date: {
    type: String, // format YYYY-MM-DD
    required: true
  },
  memberName: {
    type: String,
    required: true
  },
  proofUrl: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('PaymentLog', paymentLogSchema);
