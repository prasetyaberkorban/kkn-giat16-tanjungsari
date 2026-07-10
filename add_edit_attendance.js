const fs = require('fs');

// ==========================================
// 1. UPDATE index.html (Tambahkan Modal)
// ==========================================
let indexHtml = fs.readFileSync('public/index.html', 'utf8');

const editAttendanceModalHtml = `
  <!-- Modal Edit Kehadiran (Admin Only) -->
  <div class="modal-overlay" id="edit-attendance-modal">
    <div class="modal-card" onclick="event.stopPropagation()" style="max-width: 400px;">
      <div class="modal-header">
        <h3 id="edit-attendance-modal-title">✏️ Edit Kehadiran</h3>
        <button class="close-modal-btn" onclick="closeEditAttendanceModal()">&times;</button>
      </div>
      <form id="edit-attendance-form">
        <input type="hidden" id="edit-attendance-id" value="">
        
        <div class="form-group" style="text-align: left; margin-bottom: 1rem;">
          <label style="display: block; color: var(--text-secondary); margin-bottom: 0.25rem; font-size: 0.9rem;">Nama Anggota:</label>
          <input type="text" id="edit-attendance-name" class="select-control" style="background: rgba(255, 255, 255, 0.05); color: #aaa;" readonly>
        </div>
        
        <div class="form-group" style="text-align: left; margin-bottom: 1rem;">
          <label style="display: block; color: var(--text-secondary); margin-bottom: 0.25rem; font-size: 0.9rem;">Tanggal Hadir:</label>
          <input type="text" id="edit-attendance-date" class="select-control" style="background: rgba(255, 255, 255, 0.05);" required placeholder="Contoh: 10 Juli 2026">
        </div>

        <div class="form-group" style="text-align: left; margin-bottom: 1rem;">
          <label style="display: block; color: var(--text-secondary); margin-bottom: 0.25rem; font-size: 0.9rem;">Waktu (Jam):</label>
          <input type="time" step="1" id="edit-attendance-time" class="select-control" style="background: rgba(255, 255, 255, 0.05);" required>
        </div>

        <div class="form-group" style="text-align: left; margin-bottom: 1.5rem;">
          <label style="display: block; color: var(--text-secondary); margin-bottom: 0.25rem; font-size: 0.9rem;">Status Kehadiran:</label>
          <select id="edit-attendance-status" class="select-control" style="background: rgba(255, 255, 255, 0.05);" required>
            <option value="Hadir">Hadir</option>
            <option value="Izin">Izin</option>
            <option value="Sakit">Sakit</option>
          </select>
        </div>

        <button type="submit" class="btn" style="background: var(--color-success); border-color: var(--color-success);">Simpan Perubahan</button>
      </form>
    </div>
  </div>
`;

if (!indexHtml.includes('id="edit-attendance-modal"')) {
  // Tambahkan di bawah div id="admin-modal"
  indexHtml = indexHtml.replace('  <!-- Modal Tambah Barang Bawaan (Admin Only) -->', editAttendanceModalHtml + '\n  <!-- Modal Tambah Barang Bawaan (Admin Only) -->');
  
  if (indexHtml.includes('v=')) {
    indexHtml = indexHtml.replace(/src="\/app\.js\?v=\d+"/, 'src="/app.js?v=' + Date.now() + '"');
  }
  fs.writeFileSync('public/index.html', indexHtml);
}


// ==========================================
// 2. UPDATE app.js
// ==========================================
let appJs = fs.readFileSync('public/app.js', 'utf8');

const targetActionCell = 'actionCell = `<td style="text-align: center;"><button class="delete-btn" style="background: none; border: none; color: var(--color-error); cursor: pointer; font-size: 1.1rem; padding: 0.25rem;" onclick="deleteAttendanceItem(\'${item._id}\')" title="Hapus Absensi">🗑️</button></td>`;';

const replaceActionCell = `actionCell = \`<td style="text-align: center; white-space: nowrap;">
        <button class="edit-btn" style="background: none; border: none; color: var(--color-primary); cursor: pointer; font-size: 1.1rem; padding: 0.25rem;" onclick="openEditAttendanceModal('\${item._id}', '\${item.name}', '\${item.date}', '\${item.time}', '\${item.status}')" title="Edit Absensi">✏️</button>
        <button class="delete-btn" style="background: none; border: none; color: var(--color-error); cursor: pointer; font-size: 1.1rem; padding: 0.25rem;" onclick="deleteAttendanceItem('\${item._id}')" title="Hapus Absensi">🗑️</button>
      </td>\`;`;

if (appJs.includes(targetActionCell)) {
  appJs = appJs.replace(targetActionCell, replaceActionCell);
}

const jsFunctions = `
/* ================= EDIT ATTENDANCE ================= */
window.openEditAttendanceModal = function(id, name, date, time, status) {
  document.getElementById('edit-attendance-id').value = id;
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

const editAttendanceForm = document.getElementById('edit-attendance-form');
if (editAttendanceForm) {
  editAttendanceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-attendance-id').value;
    const date = document.getElementById('edit-attendance-date').value;
    const time = document.getElementById('edit-attendance-time').value;
    const status = document.getElementById('edit-attendance-status').value;
    
    try {
      const btn = editAttendanceForm.querySelector('button[type="submit"]');
      btn.innerHTML = 'Menyimpan...';
      btn.disabled = true;

      const res = await fetch(\`/api/attendance/\${id}\`, {
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

if (!appJs.includes('openEditAttendanceModal')) {
  appJs = appJs + '\n' + jsFunctions;
  fs.writeFileSync('public/app.js', appJs);
}

// ==========================================
// 3. UPDATE api.js
// ==========================================
let apiJs = fs.readFileSync('src/routes/api.js', 'utf8');

const targetApi = `router.put('/attendance/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const updated = await Attendance.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );`;

const replaceApi = `router.put('/attendance/:id', async (req, res) => {
  const { id } = req.params;
  const { status, date, time } = req.body;
  try {
    const updated = await Attendance.findByIdAndUpdate(
      id,
      { status, date, time },
      { new: true }
    );`;

if (apiJs.includes(targetApi)) {
  apiJs = apiJs.replace(targetApi, replaceApi);
  fs.writeFileSync('src/routes/api.js', apiJs);
}

console.log('Update Edit Absensi Selesai!');
