require('dotenv').config();
const mongoose = require('mongoose');
const ScheduleOverride = require('./src/models/ScheduleOverride');
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const r = await ScheduleOverride.find({});
  console.log('Overrides:', r);
  process.exit();
}).catch(console.error);
