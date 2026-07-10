const fs = require('fs');

// 1. UPDATE index.html
let indexHtml = fs.readFileSync('public/index.html', 'utf8');

// Pindahkan tombol + Tambah Manual ke sebelah tombol Export
const oldManualBtnContainer = `          <div id="attendance-admin-actions" class="admin-only" style="display: none;">
            <button onclick="openManualAttendanceModal()" class="submit-btn" style="padding: 0.4rem 0.8rem; background: var(--color-accent); color: #fff; border: none; border-radius: 0.5rem; cursor: pointer; font-size: 0.85rem; font-weight: 500;">+ Tambah Kehadiran Manual</button>
          </div>`;

if (indexHtml.includes(oldManualBtnContainer)) {
  indexHtml = indexHtml.replace(oldManualBtnContainer, '');
}

const oldH2DaftarHadir = `        <h2 class="card-title" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
          <span>📋 Riwayat Kehadiran Anggota</span>
          <button class="btn export-tab-btn" onclick="exportTabToExcel('daftar-hadir')" style="display: none; padding: 0.35rem 0.75rem; font-size: 0.8rem; background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); margin: 0; width: auto;">
            📥 Export Tab Ini
          </button>
        </h2>`;

const newH2DaftarHadir = `        <h2 class="card-title" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
          <span>📋 Riwayat Kehadiran Anggota</span>
          <div style="display: flex; gap: 0.5rem;">
            <button onclick="openManualAttendanceModal()" class="admin-only" style="display: none; padding: 0.35rem 0.75rem; font-size: 0.8rem; background: var(--color-accent); color: #fff; border: none; border-radius: 6px; cursor: pointer;">
              + Tambah Manual
            </button>
            <button class="btn export-tab-btn" onclick="exportTabToExcel('daftar-hadir')" style="display: inline-block; padding: 0.35rem 0.75rem; font-size: 0.8rem; background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); margin: 0; width: auto;">
              📥 Export Tab Ini
            </button>
          </div>
        </h2>`;

if (indexHtml.includes(oldH2DaftarHadir)) {
  indexHtml = indexHtml.replace(oldH2DaftarHadir, newH2DaftarHadir);
} else {
  // Coba replace lebih fleksibel kalau spasinya beda
  indexHtml = indexHtml.replace(
    /<h2[^>]*>\s*<span>📋 Riwayat Kehadiran Anggota<\/span>\s*<button class="btn export-tab-btn" onclick="exportTabToExcel\('daftar-hadir'\)"[^>]*>\s*📥 Export Tab Ini\s*<\/button>\s*<\/h2>/g, 
    newH2DaftarHadir
  );
}

// Buat semua tombol export default tampil di HTML
indexHtml = indexHtml.replace(/style="display: none; padding: 0\.35rem 0\.75rem;/g, 'style="display: inline-block; padding: 0.35rem 0.75rem;');
indexHtml = indexHtml.replace(/id="sidebar-export-wrapper" style="display: none;/g, 'id="sidebar-export-wrapper" style="display: flex;');

// Bumb cache
if (indexHtml.includes('v=')) {
  indexHtml = indexHtml.replace(/src="\/app\.js\?v=\d+"/, 'src="/app.js?v=' + Date.now() + '"');
}

fs.writeFileSync('public/index.html', indexHtml);

// 2. UPDATE app.js
let appJs = fs.readFileSync('public/app.js', 'utf8');

// Ubah fungsi updateAdminUI agar tidak menyembunyikan tombol export
appJs = appJs.replace(/btn\.style\.display = isAdmin \? 'inline-block' : 'none';/g, "btn.style.display = 'inline-block';");
appJs = appJs.replace(/sidebarExport\.style\.display = isAdmin \? 'flex' : 'none';/g, "sidebarExport.style.display = 'flex';");

fs.writeFileSync('public/app.js', appJs);

console.log('Update layout tombol dan fitur export selesai.');
