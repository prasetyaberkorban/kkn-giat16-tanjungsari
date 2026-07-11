const fs = require('fs');

// 1. UPDATE index.html
let indexHtml = fs.readFileSync('public/index.html', 'utf8');

const belumAbsenUI = `
        <!-- Belum Absen UI -->
        <div id="belum-absen-container" class="card" style="margin-bottom: 1.5rem; display: none;">
          <h2 class="card-title" style="margin-bottom: 0.5rem; color: var(--color-error); font-size: 1.1rem; display: flex; align-items: center; gap: 0.5rem;">
            ⚠️ Belum Absen Hari Ini
          </h2>
          <div id="belum-absen-list" style="display: flex; flex-wrap: wrap; gap: 0.5rem; background: rgba(239, 68, 68, 0.1); padding: 1rem; border-radius: 12px; border: 1px solid rgba(239, 68, 68, 0.3);">
            <!-- Nama akan muncul di sini -->
          </div>
        </div>
`;

// Remove from old location
const regexOldUI = /<!-- Belum Absen UI -->.*?<\/div>\s*<\/div>\s*<\/div>/s;
if (indexHtml.match(/<!-- Belum Absen UI -->.*?id="belum-absen-container".*?<!-- Nama akan muncul di sini -->\s*<\/div>\s*<\/div>/s)) {
    indexHtml = indexHtml.replace(/<!-- Belum Absen UI -->.*?id="belum-absen-container".*?<!-- Nama akan muncul di sini -->\s*<\/div>\s*<\/div>/s, '');
}

// Insert into new location
const dashboardTarget = '        <!-- Tugas Piket Harian & Kamar Mandi -->\n        <div class="dashboard-main-section">';
if (indexHtml.includes(dashboardTarget) && !indexHtml.includes('id="belum-absen-container"')) {
    indexHtml = indexHtml.replace(dashboardTarget, dashboardTarget + '\n' + belumAbsenUI);
}

// BUMP VERSION
const timestamp = Date.now();
indexHtml = indexHtml.replace(/v1\.2\.2/g, 'v1.3.0');
indexHtml = indexHtml.replace(/src="\/app\.js\?v=\d+"/g, `src="/app.js?v=${timestamp}"`);
fs.writeFileSync('public/index.html', indexHtml);

// 2. UPDATE app.js
let appJs = fs.readFileSync('public/app.js', 'utf8');

// Remove the filter check inside renderBelumAbsen
const filterCheck = `if (currentAttendanceFilter !== 'today') {
    container.style.display = 'none';
    return;
  }`;

if (appJs.includes(filterCheck)) {
    appJs = appJs.replace(filterCheck, '');
}

// Make sure renderBelumAbsen is called when data is fetched, independently of renderAttendanceTable
if (appJs.includes('allAttendanceData = await res.json();')) {
    // Inject renderBelumAbsen right after allAttendanceData is populated
    appJs = appJs.replace("allAttendanceData = await res.json();", "allAttendanceData = await res.json();\n    if (typeof renderBelumAbsen === 'function') renderBelumAbsen(allAttendanceData);");
}

fs.writeFileSync('public/app.js', appJs);
console.log('UI Moved to dashboard!');
