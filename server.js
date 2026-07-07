require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./src/config/db');
const apiRoutes = require('./src/routes/api');
const rabRoutes = require('./src/routes/rab');

const app = express();

// Hubungkan ke MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Menyajikan file statis dari folder public
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api', apiRoutes);
app.use('/api/rab', rabRoutes);

// Route fallback untuk frontend (Single Page feel)
app.get('/absensi', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'absensi.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Jalankan Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`👉 http://localhost:${PORT}`);
});
