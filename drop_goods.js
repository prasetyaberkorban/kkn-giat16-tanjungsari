const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://foerta:SabrinaZD@foerta.bdkirjs.mongodb.net/piket_db?appName=foerta';

mongoose.connect(MONGO_URI).then(async () => {
  console.log('Connected to DB to drop Goods');
  try {
    await mongoose.connection.db.dropCollection('goods');
    console.log('Dropped goods collection successfully');
  } catch (err) {
    console.log('Goods collection does not exist or already dropped:', err.message);
  }
  process.exit(0);
}).catch(err => {
  console.error('Error connecting to MongoDB:', err);
  process.exit(1);
});
