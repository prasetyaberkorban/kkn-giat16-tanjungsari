const fs = require('fs');

// 1. UPDATE QrSetting.js
let model = fs.readFileSync('src/models/QrSetting.js', 'utf8');
if (!model.includes('stringValue')) {
  model = model.replace('value: {', "stringValue: { type: String, default: '' },\n  value: {");
  fs.writeFileSync('src/models/QrSetting.js', model);
}

// 2. UPDATE api.js
let api = fs.readFileSync('src/routes/api.js', 'utf8');
const shortlinkRoutes = `
// GET: Ambil setting shortlink
router.get('/shortlink', async (req, res) => {
  try {
    let setting = await QrSetting.findOne({ key: 'active_shortlink' });
    if (!setting) {
      setting = new QrSetting({ key: 'active_shortlink', stringValue: '' });
      await setting.save();
    }
    res.json({ shortlink: setting.stringValue || '' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST: Ubah setting shortlink
router.post('/shortlink', async (req, res) => {
  const { shortlink } = req.body;
  try {
    const updated = await QrSetting.findOneAndUpdate(
      { key: 'active_shortlink' },
      { stringValue: shortlink },
      { new: true, upsert: true }
    );
    res.json({ message: 'Shortlink berhasil diperbarui!', shortlink: updated.stringValue });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
`;
if (!api.includes('router.get(\'/shortlink\'')) {
  api = api.replace("const DEFAULT_RAB = [", shortlinkRoutes + "\nconst DEFAULT_RAB = [");
  fs.writeFileSync('src/routes/api.js', api);
}

// 3. UPDATE server.js
let server = fs.readFileSync('server.js', 'utf8');
const redirectHandler = `
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
        return res.redirect(\`/absensi.html?qr=\${qrVal}\`);
      }
    }
  } catch (err) {
    console.error(err);
  }
  next();
});
`;
if (!server.includes('Intercept shortlink untuk absensi')) {
  server = server.replace("// Route fallback untuk frontend (Single Page feel)", redirectHandler + "\n// Route fallback untuk frontend (Single Page feel)");
  fs.writeFileSync('server.js', server);
}

// 4. UPDATE index.html
let index = fs.readFileSync('public/index.html', 'utf8');
const shortlinkUI = `
            <div class="form-group" style="text-align: left; margin: 1.25rem 0; width: 100%; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 1rem;">
              <label style="display: block; color: var(--text-secondary); margin-bottom: 0.35rem; font-size: 0.85rem; font-weight: 600;">LINK PENDEK (OPSIONAL):</label>
              <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <input type="text" id="shortlink-input" class="select-control" style="background: rgba(255, 255, 255, 0.05); padding: 0.6rem 0.85rem; font-size: 0.9rem; flex: 1;" placeholder="Misal: absen-hari-ini" onchange="handleShortlinkSave()">
                <button class="btn" style="background: var(--color-primary); border: none; margin: 0; padding: 0.6rem 1rem;" onclick="copyShortlink()">Copy Link</button>
              </div>
              <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.5rem;">Anggota dapat absen dengan membuka: <span id="shortlink-preview" style="color: var(--color-accent); font-weight: 600;">-</span></p>
            </div>
`;
if (!index.includes('LINK PENDEK (OPSIONAL):')) {
  index = index.replace('<p style="margin-top: 1rem;">Tampilkan QR ini ke anggota untuk memindai formulir absensi mobile.</p>', shortlinkUI + '\n            <p style="margin-top: 1rem;">Tampilkan QR ini ke anggota untuk memindai formulir absensi mobile.</p>');
  fs.writeFileSync('public/index.html', index);
}

// 5. UPDATE app.js
let app = fs.readFileSync('public/app.js', 'utf8');
const appShortlinkFns = `
/* ================= SHORTLINK ================= */
async function loadShortlink() {
  try {
    const res = await fetch('/api/shortlink');
    const data = await res.json();
    const input = document.getElementById('shortlink-input');
    const preview = document.getElementById('shortlink-preview');
    if (input) {
      input.value = data.shortlink || '';
      updateShortlinkPreview(data.shortlink);
    }
  } catch (err) {
    console.error(err);
  }
}

function updateShortlinkPreview(val) {
  const preview = document.getElementById('shortlink-preview');
  if (preview) {
    if (!val) {
      preview.innerText = 'Belum diatur';
    } else {
      preview.innerText = window.location.origin + '/' + val;
    }
  }
}

window.handleShortlinkSave = async function() {
  const val = document.getElementById('shortlink-input').value.trim().replace(/[^a-zA-Z0-9-]/g, '');
  document.getElementById('shortlink-input').value = val;
  try {
    const res = await fetch('/api/shortlink', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shortlink: val })
    });
    if (res.ok) {
      updateShortlinkPreview(val);
    } else {
      alert('Gagal menyimpan shortlink');
    }
  } catch (err) {
    console.error(err);
  }
};

window.copyShortlink = function() {
  const val = document.getElementById('shortlink-input').value.trim();
  if (!val) return alert('Link pendek belum diatur!');
  const fullUrl = window.location.origin + '/' + val;
  navigator.clipboard.writeText(fullUrl).then(() => {
    alert('Link berhasil disalin!\\n' + fullUrl);
  }).catch(() => alert('Gagal menyalin. Silakan copy manual: ' + fullUrl));
};
`;

if (!app.includes('function loadShortlink')) {
  app += '\n' + appShortlinkFns;
  
  // Panggil loadShortlink() dari dalam updateAdminUI
  const adminUiMatch = "      activeQrCodeType = data.activeQr || 1;\n      if (qrSelect) qrSelect.value = activeQrCodeType;";
  if (app.includes(adminUiMatch)) {
    app = app.replace(adminUiMatch, adminUiMatch + "\n      loadShortlink();");
  } else {
    // Alternatif jika match tidak persis
    app = app.replace("if (qrSelect) qrSelect.value = activeQrCodeType;", "if (qrSelect) qrSelect.value = activeQrCodeType;\n      loadShortlink();");
  }
  
  fs.writeFileSync('public/app.js', app);
}

console.log('Shortlink feature added!');
