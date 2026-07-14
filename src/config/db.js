const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const connStr = process.env.MONGODB_URI || 'mongodb://localhost:27017/piket_db';
    const conn = await mongoose.connect(connStr);
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Auto Migrate Libur -> Piket Balai Desa
    try {
      const Attendance = require('../models/Attendance');
      const TaskCompletion = require('../models/TaskCompletion');
      const ScheduleOverride = require('../models/ScheduleOverride');
      await Attendance.updateMany({ task: 'Libur' }, { $set: { task: 'Piket Balai Desa' } });
      await TaskCompletion.updateMany({ task: 'Libur' }, { $set: { task: 'Piket Balai Desa' } });
      await ScheduleOverride.updateMany(
        { overrides: { $elemMatch: { task: 'Libur' } } },
        { $set: { 'overrides.$[elem].task': 'Piket Balai Desa' } },
        { arrayFilters: [ { 'elem.task': 'Libur' } ] }
      );
      console.log('Migrasi Libur ke Piket Balai Desa DB selesai.');
      
      // Auto-trigger Google Sheets Sync after migration
      setTimeout(() => {
        const port = process.env.PORT || 3000;
        fetch('http://localhost:' + port + '/api/export-sheets', { method: 'POST' })
          .then(res => console.log('Auto-sync triggered post migration'))
          .catch(err => console.error('Auto-sync trigger failed'));
      }, 5000); // Tunggu 5 detik agar server siap
      
    } catch(err) {
      console.error('Migrasi DB gagal:', err);
    }
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
