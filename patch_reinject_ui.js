const fs = require('fs');

// 1. UPDATE index.html
let indexHtml = fs.readFileSync('public/index.html', 'utf8');

const belumAbsenUI = `
        <!-- Belum Absen UI -->
        <div id="belum-absen-container" class="card" style="margin-bottom: 1.5rem; display: none; background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.2);">
          <h2 class="card-title" style="margin-bottom: 0.5rem; color: var(--color-error); font-size: 1.1rem; display: flex; align-items: center; gap: 0.5rem; border-bottom: none; padding-bottom: 0;">
            ⚠️ Belum Absen Hari Ini
          </h2>
          <div id="belum-absen-list" style="display: flex; flex-wrap: wrap; gap: 0.5rem; padding-top: 0.5rem;">
            <!-- Nama akan muncul di sini -->
          </div>
        </div>
`;

if (!indexHtml.includes('id="belum-absen-container"')) {
    // Inject using a safer approach
    indexHtml = indexHtml.replace('<div class="dashboard-main-section">', '<div class="dashboard-main-section">\n' + belumAbsenUI);
}

// BUMP VERSION
const timestamp = Date.now();
indexHtml = indexHtml.replace(/v1\.3\.0/g, 'v1.3.1');
indexHtml = indexHtml.replace(/src="\/app\.js\?v=\d+"/g, `src="/app.js?v=${timestamp}"`);
fs.writeFileSync('public/index.html', indexHtml);

// 2. MAKE SURE APP.JS SHOWS IT
// In my last patch, I removed the `currentAttendanceFilter !== 'today'` check, 
// and I called `renderBelumAbsen(allAttendanceData)` after fetching data.
// But wait, when the dashboard loads, it doesn't fetch `allAttendanceData` unless the user clicks "Daftar Hadir" tab!
// Wait! The dashboard fetches `todayScheduleData` and `dashboardData`! It DOES NOT fetch `allAttendanceData` on startup!
// The user has to click "Daftar Hadir" for `fetch('/api/attendance/all')` to trigger!
// Let's check `app.js` to see if `allAttendanceData` is fetched automatically.

let appJs = fs.readFileSync('public/app.js', 'utf8');
if (!appJs.includes("fetch('/api/attendance/all')") || !appJs.includes("renderBelumAbsen(")) {
    // Safety check just in case, but let's see if we can trigger fetch when dashboard is active.
}

// I need to add a call to fetch and render missing attendees on startup!
const initBelumAbsenLogic = `
async function fetchAndRenderBelumAbsen() {
  try {
    const res = await fetch('/api/attendance/all');
    allAttendanceData = await res.json();
    if (typeof renderBelumAbsen === 'function') renderBelumAbsen(allAttendanceData);
  } catch (err) {
    console.error("Gagal load absensi untuk dashboard", err);
  }
}
document.addEventListener('DOMContentLoaded', fetchAndRenderBelumAbsen);
`;

if (!appJs.includes('fetchAndRenderBelumAbsen')) {
    appJs = appJs + '\n' + initBelumAbsenLogic;
    fs.writeFileSync('public/app.js', appJs);
}

console.log('UI Re-injected securely!');
