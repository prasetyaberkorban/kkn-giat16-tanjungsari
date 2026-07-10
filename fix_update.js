const fs = require('fs');

// 1. UPDATE index.html (tambah versi dan pastikan tidak ter-cache)
let indexHtml = fs.readFileSync('public/index.html', 'utf8');

const footerRegex = /© 2026 UNNES GIAT 16 Desa Tanjung Sari\. Sistem Piket & Absensi Posko\.( <span style="opacity: 0\.7;">v[\d\.]+<\/span>)?/;
indexHtml = indexHtml.replace(footerRegex, '© 2026 UNNES GIAT 16 Desa Tanjung Sari. Sistem Piket & Absensi Posko. <span style="opacity: 0.7;">v1.0.1</span>');

// Ubah parameter v di script JS agar me-reset cache browser semua user
const timestamp = Date.now();
if (indexHtml.includes('app.js?v=')) {
  indexHtml = indexHtml.replace(/src="\/app\.js\?v=\d+"/, `src="/app.js?v=${timestamp}"`);
} else {
  indexHtml = indexHtml.replace(/src="\/app\.js"/, `src="/app.js?v=${timestamp}"`);
}
fs.writeFileSync('public/index.html', indexHtml);

// 2. UPDATE app.js (tambahkan fungsi Edit yang hilang)
let appJs = fs.readFileSync('public/app.js', 'utf8');

const jsFunctions = `
/* ================= EDIT ATTENDANCE ================= */
window.openEditAttendanceModal = function(id, name, date, time, status) {
  const idEl = document.getElementById('edit-attendance-id');
  if (!idEl) {
    console.error('Modal edit attendance tidak ditemukan di DOM!');
    alert('Maaf, modal edit tidak ditemukan. Silakan refresh halaman.');
    return;
  }
  
  idEl.value = id;
  document.getElementById('edit-attendance-name').value = name;
  document.getElementById('edit-attendance-date').value = date;
  document.getElementById('edit-attendance-time').value = time;
  document.getElementById('edit-attendance-status').value = status;
  
  const modal = document.getElementById('edit-attendance-modal');
  if (modal) modal.classList.add('active');
};

window.closeEditAttendanceModal = function() {
  const modal = document.getElementById('edit-attendance-modal');
  if (modal) modal.classList.remove('active');
};

// Bind form submission for edit
setTimeout(() => {
  const editAttendanceForm = document.getElementById('edit-attendance-form');
  if (editAttendanceForm) {
    // Hindari duplicate listener dengan mengganti clone
    const newForm = editAttendanceForm.cloneNode(true);
    editAttendanceForm.parentNode.replaceChild(newForm, editAttendanceForm);
    
    newForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('edit-attendance-id').value;
      const date = document.getElementById('edit-attendance-date').value;
      const time = document.getElementById('edit-attendance-time').value;
      const status = document.getElementById('edit-attendance-status').value;
      
      try {
        const btn = newForm.querySelector('button[type="submit"]');
        btn.innerHTML = 'Menyimpan...';
        btn.disabled = true;

        const res = await fetch('/api/attendance/' + id, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, time, status })
        });
        
        const data = await res.json();
        btn.innerHTML = 'Simpan Perubahan';
        btn.disabled = false;

        if (res.ok) {
          alert('Data kehadiran berhasil diperbarui!');
          closeEditAttendanceModal();
          if (typeof fetchFullAttendance === 'function') fetchFullAttendance();
          if (typeof fetchAttendanceData === 'function' && typeof currentAttendanceFilter !== 'undefined') fetchAttendanceData(currentAttendanceFilter);
        } else {
          alert('Gagal: ' + data.error);
        }
      } catch (err) {
        alert('Terjadi kesalahan koneksi.');
        console.error(err);
      }
    });
  }
}, 1000);
`;

if (!appJs.includes('window.openEditAttendanceModal')) {
  appJs += '\n' + jsFunctions;
  fs.writeFileSync('public/app.js', appJs);
}

// 3. UPDATE server.js (tambahkan header no-cache untuk file static html)
let serverJs = fs.readFileSync('server.js', 'utf8');
if (!serverJs.includes('setHeaders: (res, path)')) {
  const target = `app.use(express.static(path.join(__dirname, 'public')));`;
  const replacement = `app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));`;
  serverJs = serverJs.replace(target, replacement);
  fs.writeFileSync('server.js', serverJs);
}

console.log('Fix script done.');
