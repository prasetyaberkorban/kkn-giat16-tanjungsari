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

// ================= GDRIVE NEXT.JS INTEGRATION =================
const { createProxyMiddleware, fixRequestBody } = require('http-proxy-middleware');
const { spawn } = require('child_process');
const multer = require('multer');
const os = require('os');
const fsModule = require('fs');
const { google } = require('googleapis');


// 1. Spawn Next.js server on port 3001
const isProd = process.env.NODE_ENV === 'production';
const nextCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const nextArgs = ['run', isProd ? 'start' : 'dev', '--', '-p', '3001'];

console.log('Starting Next.js GDrive on port 3001...');
const nextProcess = spawn(nextCmd, nextArgs, { 
  cwd: path.join(__dirname, 'gdrive'),
  env: { ...process.env, PORT: '3001' },
  shell: true,
  stdio: 'pipe'
});

nextProcess.stdout.on('data', (data) => console.log('[Next.js]:', data.toString().trim()));
nextProcess.stderr.on('data', (data) => console.error('[Next.js Error]:', data.toString().trim()));


// ================= GDRIVE UPLOAD INTERCEPTOR (BYPASS NEXT.JS RAM LIMIT) =================
const upload = multer({ dest: os.tmpdir() });
app.post('/gdrive/api/drive/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' });
  const folderId = req.body.folderId;
  if (!folderId) return res.status(400).json({ error: 'Folder ID is required' });

  try {
    const oauth2Client = new google.auth.OAuth2(
      (process.env.GOOGLE_CLIENT_ID || '').trim(),
      (process.env.GOOGLE_CLIENT_SECRET || '').trim(),
      "https://developers.google.com/oauthplayground"
    );
    oauth2Client.setCredentials({ refresh_token: (process.env.GOOGLE_REFRESH_TOKEN || '').trim() });
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    const fileMetadata = { name: req.file.originalname, parents: [folderId] };
    const media = {
      mimeType: req.file.mimetype,
      body: fsModule.createReadStream(req.file.path)
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: "id, name",
    });

    // Cleanup temp file immediately
    fsModule.unlinkSync(req.file.path);
    return res.json({ success: true, file: response.data });
  } catch (err) {
    console.error("Express Drive Upload Error:", err);
    if (fsModule.existsSync(req.file.path)) fsModule.unlinkSync(req.file.path);
    return res.status(500).json({ error: err.message });
  }
});
// ========================================================================================

// 2. Setup Proxy Middleware
// Menggunakan app.all dengan wildcard agar Express TIDAK memotong req.url (stripping path)
app.all('/gdrive*', createProxyMiddleware({ 
  target: 'http://localhost:3001', 
  changeOrigin: true,
  ws: true,
  on: {
    proxyReq: fixRequestBody
  }
}));
app.all('/_next*', createProxyMiddleware({ 
  target: 'http://localhost:3001', 
  changeOrigin: true,
  ws: true,
  on: {
    proxyReq: fixRequestBody
  }
}));
// ==============================================================


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
