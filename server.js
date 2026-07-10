require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./src/config/db');
const apiRoutes = require('./src/routes/api');
const rabRoutes = require('./src/routes/rab');
const cashflowRoutes = require('./src/routes/cashflow');
const rabSettingRoutes = require('./src/routes/rabsetting');

const app = express();

// Hubungkan ke MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Menyajikan file statis dari folder public
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// API Routes
app.use('/api', apiRoutes);
app.use('/api/rab', rabRoutes);
app.use('/api/cashflow', cashflowRoutes);
app.use('/api/rabsetting', rabSettingRoutes);


// Intercept shortlink untuk absensi
app.get('/:short', async (req, res, next) => {
  const short = req.params.short;
  if (['api', 'absensi', 'css', 'js', 'favicon.ico', 'images'].includes(short)) return next();
  try {
    const QrSetting = require('./src/models/QrSetting');
    const linkSetting = await QrSetting.findOne({ key: 'active_shortlink' });
    if (linkSetting && linkSetting.stringValue && linkSetting.stringValue.trim() !== '') {
      if (linkSetting.stringValue === short) {
        const qrSetting = await QrSetting.findOne({ key: 'active_qr' });
        const qrVal = qrSetting ? (qrSetting.value || 1) : 1;
        return res.redirect(`/absensi.html?qr=${qrVal}`);
      }
    }
  } catch (err) {
    console.error(err);
  }
  next();
});

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

// Test auto-sync
