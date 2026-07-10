const fs = require('fs');

// 1. UPDATE index.html for Belum Absen UI
let indexHtml = fs.readFileSync('public/index.html', 'utf8');

const belumAbsenUI = `
        <!-- Belum Absen UI -->
        <div id="belum-absen-container" style="margin-top: 1.5rem; display: none;">
          <h3 style="margin-bottom: 0.5rem; color: var(--color-error); font-size: 1.1rem; display: flex; align-items: center; gap: 0.5rem;">
            ⚠️ Belum Absen Hari Ini
          </h3>
          <div id="belum-absen-list" style="display: flex; flex-wrap: wrap; gap: 0.5rem; background: rgba(239, 68, 68, 0.1); padding: 1rem; border-radius: 12px; border: 1px solid rgba(239, 68, 68, 0.3);">
            <!-- Nama akan muncul di sini -->
          </div>
        </div>
`;

// Find where to insert in index.html (after the premium-table in tab-daftar-hadir)
const targetPattern = '          </table>\n        </div>';
if (indexHtml.includes(targetPattern) && !indexHtml.includes('id="belum-absen-container"')) {
  // Let's replace the FIRST occurrence in tab-daftar-hadir.
  // Wait, tab-daftar-hadir has <table class="premium-table"> ... </table> </div>
  const splitIndex = indexHtml.indexOf('<div id="tab-daftar-hadir"');
  if (splitIndex !== -1) {
    const targetIdx = indexHtml.indexOf(targetPattern, splitIndex);
    if (targetIdx !== -1) {
      indexHtml = indexHtml.substring(0, targetIdx + targetPattern.length) + '\n' + belumAbsenUI + indexHtml.substring(targetIdx + targetPattern.length);
    }
  }
}

// BUMP VERSION & CACHE in index.html
const timestamp = Date.now();
indexHtml = indexHtml.replace(/v1\.1\.0/g, 'v1.2.0');
indexHtml = indexHtml.replace(/v1\.0\.1/g, 'v1.2.0');
indexHtml = indexHtml.replace(/src="\/app\.js\?v=\d+"/g, `src="/app.js?v=${timestamp}"`);
fs.writeFileSync('public/index.html', indexHtml);

// 2. UPDATE app.js for Belum Absen Logic
let appJs = fs.readFileSync('public/app.js', 'utf8');

const renderBelumAbsenLogic = `
function renderBelumAbsen(logs) {
  const container = document.getElementById('belum-absen-container');
  const listEl = document.getElementById('belum-absen-list');
  if (!container || !listEl) return;
  
  if (currentAttendanceFilter !== 'today') {
    container.style.display = 'none';
    return;
  }
  
  const todayDateStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
  
  // Collect all unique names from TEAMS
  const allNames = [];
  Object.values(TEAMS).forEach(members => {
    allNames.push(...members);
  });
  
  // Extract names who have attended today
  const attendedNames = logs
    .filter(log => log.date === todayDateStr)
    .map(log => log.name.trim().toLowerCase());
  
  // Filter missing
  const missingNames = allNames.filter(name => !attendedNames.includes(name.trim().toLowerCase()));
  
  container.style.display = 'block';
  if (missingNames.length > 0) {
    listEl.innerHTML = missingNames.map(name => 
      \`<span style="background: rgba(255, 255, 255, 0.1); padding: 0.3rem 0.8rem; border-radius: 20px; font-weight: 500; font-size: 0.95rem; box-shadow: 0 2px 5px rgba(0,0,0,0.2); border: 1px solid rgba(239, 68, 68, 0.4);">\${name}</span>\`
    ).join('');
  } else {
    listEl.innerHTML = \`<span style="color: var(--color-success); font-weight: 600;">🎉 Semua anggota sudah absen hari ini!</span>\`;
  }
}
`;

if (!appJs.includes('function renderBelumAbsen')) {
  appJs = renderBelumAbsenLogic + '\n' + appJs;
}

// Inject call to renderBelumAbsen at the end of renderAttendanceTable
if (appJs.includes('function renderAttendanceTable()') && !appJs.includes('renderBelumAbsen(attendanceData);')) {
  // We need to inject it right before the function ends.
  // The function updates full-attendance-table-body.
  // Let's just do a string replace on a known line in that function.
  // Find where it appends rows or finishes.
  // It has a loop `attendanceData.forEach(...)`.
  // At the end of the function, let's append it.
  
  // To be safe, let's inject it into `renderAttendanceTable` just by replacing the function definition.
  const oldFuncSignature = 'function renderAttendanceTable() {';
  const newFuncSignature = 'function renderAttendanceTable() {\n  if (typeof attendanceData !== "undefined") renderBelumAbsen(attendanceData);';
  
  appJs = appJs.replace(oldFuncSignature, newFuncSignature);
}

fs.writeFileSync('public/app.js', appJs);

console.log('Belum absen patched!');
