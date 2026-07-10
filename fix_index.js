const fs = require('fs');

const indexHtmlPath = 'public/index.html';
let content = fs.readFileSync(indexHtmlPath, 'utf8');

const missingBlock = `
    <!-- ================= TAB: DAFTAR HADIR ================= -->
    <div id="tab-daftar-hadir" class="tab-content">
      <div class="card">
        <h2 class="card-title" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
          <span>📋 Riwayat Kehadiran Anggota</span>
          <button class="btn export-tab-btn" onclick="exportTabToExcel('daftar-hadir')" style="display: none; padding: 0.35rem 0.75rem; font-size: 0.8rem; background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); margin: 0; width: auto;">
            📥 Export Tab Ini
          </button>
        </h2>

        <!-- Filter Absensi: Hari Ini / Riwayat Lengkap -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem;">
          <div class="goods-categories" id="attendance-filter-tabs" style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0;">
            <button class="week-btn active" onclick="filterAttendanceView('today')">Hari Ini</button>
            <button class="week-btn" onclick="filterAttendanceView('all')">Semua Riwayat</button>
          </div>
          <div id="attendance-admin-actions" class="admin-only" style="display: none;">
            <button onclick="openManualAttendanceModal()" class="submit-btn" style="padding: 0.4rem 0.8rem; background: var(--color-accent); color: #fff; border: none; border-radius: 0.5rem; cursor: pointer; font-size: 0.85rem; font-weight: 500;">+ Tambah Kehadiran Manual</button>
          </div>
        </div>

        <div class="table-container">
          <table class="premium-table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Divisi</th>
                <th>Tim</th>
                <th>Tanggal</th>
                <th>Jam</th>
                <th>Tugas Hari Itu</th>
                <th>Status</th>
                <th id="attendance-action-header" style="display: none; width: 80px; text-align: center;">Aksi</th>
              </tr>
            </thead>
            <tbody id="full-attendance-table-body">
              <tr>
                <td colspan="8" style="text-align: center; color: var(--text-secondary); padding: 2rem;">
                  Mengambil riwayat absensi...
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
`;

// Insert the missing block right before the TAB: JADWAL MINGGUAN
if (!content.includes('id="tab-daftar-hadir"')) {
  content = content.replace('    <!-- ================= TAB: JADWAL MINGGUAN ================= -->', missingBlock + '\n    <!-- ================= TAB: JADWAL MINGGUAN ================= -->');
  
  // Also bump cache buster
  if (content.includes('v=')) {
    content = content.replace(/src="\/app\.js\?v=\d+"/, 'src="/app.js?v=' + Date.now() + '"');
  }

  fs.writeFileSync(indexHtmlPath, content);
  console.log('Restored tab-daftar-hadir with Manual Add button.');
} else {
  console.log('tab-daftar-hadir already exists.');
}
