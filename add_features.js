const fs = require('fs');

// ===========================================
// 1. UPDATE index.html
// ===========================================
let indexHtml = fs.readFileSync('public/index.html', 'utf8');

// Add Download QR Button
const downloadQrBtn = `
            <div class="qr-container" id="qrcode">
              <!-- Render QR code di sini -->
            </div>
            <button id="download-qr-btn" class="submit-btn" style="margin-top: 1rem; width: auto; display: inline-block; padding: 0.5rem 1rem;" onclick="downloadQrCode()">Unduh QR Code</button>
`;
if (!indexHtml.includes('downloadQrCode()')) {
  indexHtml = indexHtml.replace(/<div class="qr-container" id="qrcode">[\s\S]*?<\/div>/, downloadQrBtn);
}

// Add Add Manual Attendance Button
const manualBtnContainer = `
          <div id="attendance-admin-actions" class="admin-only" style="display: none;">
            <button onclick="openManualAttendanceModal()" class="submit-btn" style="padding: 0.5rem 1rem; margin-bottom: 1rem; background: var(--color-accent); color: #fff;">+ Tambah Kehadiran Manual</button>
          </div>
          <div style="display: flex; align-items: center; gap: 1rem;">
`;
if (!indexHtml.includes('openManualAttendanceModal()')) {
  indexHtml = indexHtml.replace('<div style="display: flex; align-items: center; gap: 1rem;">', manualBtnContainer);
}

// Add Manual Attendance Modal
const manualModalHtml = `
  <!-- MODAL MANUAL ATTENDANCE -->
  <div class="modal-overlay" id="manual-attendance-modal">
    <div class="modal-content" style="max-width: 400px;">
      <div class="modal-header">
        <h2 class="modal-title">Kehadiran Manual</h2>
        <button class="modal-close" onclick="closeManualAttendanceModal()">✕</button>
      </div>
      <div class="modal-body">
        <form id="manual-attendance-form">
          <label style="display: block; color: var(--text-secondary); margin-bottom: 0.25rem;">Nama Anggota:</label>
          <select id="manual-attendance-name" class="input-control" required>
            <option value="" disabled selected>Pilih Anggota</option>
            <option value="Tian">Tian</option>
            <option value="Naila">Naila</option>
            <option value="Valen">Valen</option>
            <option value="Mey">Mey</option>
            <option value="Fay">Fay</option>
            <option value="Ananda">Ananda</option>
            <option value="Hani">Hani</option>
            <option value="Firzan">Firzan</option>
            <option value="Cio">Cio</option>
            <option value="Nanda">Nanda</option>
            <option value="Zii">Zii</option>
          </select>
          
          <label style="display: block; color: var(--text-secondary); margin-top: 1rem; margin-bottom: 0.25rem;">Status:</label>
          <select id="manual-attendance-status" class="input-control" required>
            <option value="Hadir">Hadir</option>
            <option value="Izin">Izin</option>
            <option value="Sakit">Sakit</option>
          </select>

          <button type="submit" class="submit-btn" style="margin-top: 1.5rem;">Simpan Kehadiran</button>
        </form>
      </div>
    </div>
  </div>
`;

if (!indexHtml.includes('id="manual-attendance-modal"')) {
  indexHtml = indexHtml.replace('</body>', manualModalHtml + '\n</body>');
}

// Cache Busting update
if (indexHtml.includes('v=')) {
  indexHtml = indexHtml.replace(/src="\/app\.js\?v=\d+"/, 'src="/app.js?v=' + Date.now() + '"');
}

fs.writeFileSync('public/index.html', indexHtml);


// ===========================================
// 2. UPDATE app.js
// ===========================================
let appJs = fs.readFileSync('public/app.js', 'utf8');

const jsAdditions = `
/* ================= MANUAL ATTENDANCE & QR DOWNLOAD ================= */
window.downloadQrCode = function() {
  const qrImg = document.querySelector('#qrcode img');
  if (qrImg && qrImg.src) {
    const a = document.createElement('a');
    a.href = qrImg.src;
    a.download = \`QR-Absensi-GIAT16.png\`;
    a.click();
  } else {
    const canvas = document.querySelector('#qrcode canvas');
    if (canvas) {
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = \`QR-Absensi-GIAT16.png\`;
      a.click();
    } else {
      alert('QR Code belum siap atau gagal dirender.');
    }
  }
};

window.openManualAttendanceModal = function() {
  const modal = document.getElementById('manual-attendance-modal');
  if(modal) modal.classList.add('active');
};

window.closeManualAttendanceModal = function() {
  const modal = document.getElementById('manual-attendance-modal');
  if(modal) modal.classList.remove('active');
};

// Handle submit manual attendance
const manualForm = document.getElementById('manual-attendance-form');
if (manualForm) {
  manualForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('manual-attendance-name').value;
    const status = document.getElementById('manual-attendance-status').value;
    
    try {
      const btn = manualForm.querySelector('button[type="submit"]');
      btn.innerHTML = 'Menyimpan...';
      btn.disabled = true;

      const res = await fetch('/api/attendance/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, status })
      });
      
      const data = await res.json();
      btn.innerHTML = 'Simpan Kehadiran';
      btn.disabled = false;

      if (res.ok) {
        alert('Kehadiran manual berhasil disimpan!');
        closeManualAttendanceModal();
        fetchAttendanceData(currentAttendanceFilter); // Refresh data
      } else {
        alert('Gagal: ' + data.error);
      }
    } catch (err) {
      alert('Terjadi kesalahan koneksi.');
      console.error(err);
    }
  });
}
`;

if (!appJs.includes('openManualAttendanceModal')) {
  appJs = appJs + '\n' + jsAdditions;
  fs.writeFileSync('public/app.js', appJs);
}

// ===========================================
// 3. UPDATE api.js
// ===========================================
let apiJs = fs.readFileSync('src/routes/api.js', 'utf8');

const apiAdditions = `
/**
 * @route   POST /api/attendance/manual
 * @desc    Admin menambah absensi manual
 */
router.post('/attendance/manual', async (req, res) => {
  const { name, status } = req.body;
  if (!name) return res.status(400).json({ error: 'Nama harus diisi.' });
  
  try {
    const date = getTodayDateIndo();
    const time = getNowTimeIndo();
    const schedule = await getScheduleForDate(date);
    
    // Temukan tim anggota ini
    let userTeam = '-';
    for (const [tName, members] of Object.entries(TEAMS)) {
      if (members.includes(name)) {
        userTeam = tName;
        break;
      }
    }

    const teamSchedule = schedule.dailySchedule[userTeam];
    const task = teamSchedule ? teamSchedule.task : 'Libur';

    const attendance = new Attendance({
      name,
      division: memberDivisions[name] || '-',
      team: userTeam,
      date,
      time,
      dayName: schedule.dayName,
      task,
      status: status || 'Hadir'
    });

    const savedAttendance = await attendance.save();
    appendAttendanceToSheet(savedAttendance);

    res.status(201).json({ message: 'Kehadiran manual berhasil disimpan!', data: savedAttendance });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Anggota tersebut sudah diabsen hari ini.' });
    }
    res.status(500).json({ error: error.message });
  }
});
`;

if (!apiJs.includes('/attendance/manual')) {
  // Sisipkan di bawah /attendance/today
  apiJs = apiJs.replace('router.post(\'/attendance\', async (req, res) => {', apiAdditions + '\nrouter.post(\'/attendance\', async (req, res) => {');
  fs.writeFileSync('src/routes/api.js', apiJs);
}

console.log('Update selesai.');
