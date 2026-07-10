const fs = require('fs');

// 1. UPDATE index.html (Theme Button & Belum Absen UI)
let indexHtml = fs.readFileSync('public/index.html', 'utf8');

// A. Change toggleTheme() onclick to toggleGlobalTheme() in index.html (if not already done)
indexHtml = indexHtml.replace('onclick="toggleTheme()"', 'onclick="toggleGlobalTheme()"');

// B. Inject 'Belum Absen' UI
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
if (!indexHtml.includes('id="belum-absen-container"')) {
  // Inject right after the premium-table inside tab-kehadiran
  indexHtml = indexHtml.replace('</table>\n      </div>', '</table>\n      </div>\n' + belumAbsenUI);
}

// C. Bump cache for app.js
const timestamp = Date.now();
indexHtml = indexHtml.replace(/src="\/app\.js\?v=\d+"/, `src="/app.js?v=${timestamp}"`);
fs.writeFileSync('public/index.html', indexHtml);


// 2. UPDATE absensi.html (Remove Theme Button completely)
if (fs.existsSync('public/absensi.html')) {
  let absensiHtml = fs.readFileSync('public/absensi.html', 'utf8');
  // Remove the button
  absensiHtml = absensiHtml.replace(/<button class="menu-toggle-btn" onclick="toggleTheme\(\)"[^>]*>.*?<\/button>/s, '');
  absensiHtml = absensiHtml.replace(/src="\/absensi\.js\?v=\d+"/, `src="/absensi.js?v=${timestamp}"`);
  fs.writeFileSync('public/absensi.html', absensiHtml);
}


// 3. UPDATE app.js (Theme Fetching & Belum Absen Logic)
let appJs = fs.readFileSync('public/app.js', 'utf8');

// A. Update Theme Initialization to use API
const oldThemeLogic = `(function() {
  const savedTheme = localStorage.getItem('app-theme') || 'theme-viens';
  if (savedTheme === 'theme-viens') {
    document.body.classList.add('theme-viens');
  } else {
    document.body.classList.remove('theme-viens');
  }
})();

window.toggleTheme = function() {
  if (document.body.classList.contains('theme-viens')) {
    document.body.classList.remove('theme-viens');
    localStorage.setItem('app-theme', 'theme-default');
  } else {
    document.body.classList.add('theme-viens');
    localStorage.setItem('app-theme', 'theme-viens');
  }
};`;

const newThemeLogic = `/* ================= THEME TOGGLE (GLOBAL) ================= */
async function initGlobalTheme() {
  try {
    const res = await fetch('/api/admin/theme');
    const data = await res.json();
    if (data.success) {
      if (data.theme === 'theme-viens') {
        document.body.classList.add('theme-viens');
      } else {
        document.body.classList.remove('theme-viens');
      }
    }
  } catch (err) {
    console.error('Failed to fetch global theme', err);
    // fallback
    if (localStorage.getItem('app-theme') === 'theme-viens') {
      document.body.classList.add('theme-viens');
    }
  }
}
initGlobalTheme();

window.toggleGlobalTheme = async function() {
  const isViens = document.body.classList.contains('theme-viens');
  const newTheme = isViens ? 'theme-default' : 'theme-viens';
  
  if (newTheme === 'theme-viens') {
    document.body.classList.add('theme-viens');
  } else {
    document.body.classList.remove('theme-viens');
  }
  
  // Save to DB
  try {
    await fetch('/api/admin/theme', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: newTheme })
    });
  } catch (err) {
    console.error('Failed to save global theme', err);
  }
};`;

if (appJs.includes('window.toggleTheme = function()')) {
  appJs = appJs.replace(oldThemeLogic, newThemeLogic);
} else if (!appJs.includes('initGlobalTheme')) {
  // If we couldn't replace, just prepend it
  appJs = newThemeLogic + '\n' + appJs;
}

// B. Inject 'Belum Absen' logic into loadKehadiran
const loadKehadiranBlock = `function renderBelumAbsen(logs) {
  const container = document.getElementById('belum-absen-container');
  const listEl = document.getElementById('belum-absen-list');
  if (!container || !listEl) return;
  
  // Collect all unique names from TEAMS
  const allNames = [];
  Object.values(TEAMS).forEach(members => {
    allNames.push(...members);
  });
  
  // Extract names who have attended today
  const attendedNames = logs.map(log => log.name.trim().toLowerCase());
  
  // Filter missing
  const missingNames = allNames.filter(name => !attendedNames.includes(name.trim().toLowerCase()));
  
  if (missingNames.length > 0) {
    container.style.display = 'block';
    listEl.innerHTML = missingNames.map(name => 
      \`<span style="background: rgba(255, 255, 255, 0.1); padding: 0.3rem 0.8rem; border-radius: 20px; font-weight: 500; font-size: 0.95rem; box-shadow: 0 2px 5px rgba(0,0,0,0.2); border: 1px solid rgba(239, 68, 68, 0.4);">\${name}</span>\`
    ).join('');
  } else {
    container.style.display = 'block';
    listEl.innerHTML = \`<span style="color: var(--color-success); font-weight: 600;">🎉 Semua anggota sudah absen hari ini!</span>\`;
  }
}`;

if (!appJs.includes('renderBelumAbsen')) {
  // Insert function before loadKehadiran
  appJs = appJs.replace('async function loadKehadiran', loadKehadiranBlock + '\n\nasync function loadKehadiran');
  
  // Call function inside loadKehadiran after rendering logs
  appJs = appJs.replace('document.getElementById(\'kehadiran-table-body\').innerHTML = tbodyHTML;', 
                        'document.getElementById(\'kehadiran-table-body\').innerHTML = tbodyHTML;\n    renderBelumAbsen(data.logs);');
}
fs.writeFileSync('public/app.js', appJs);


// 4. UPDATE absensi.js (Theme Fetching)
if (fs.existsSync('public/absensi.js')) {
  let absensiJs = fs.readFileSync('public/absensi.js', 'utf8');
  if (absensiJs.includes('window.toggleTheme = function()')) {
    absensiJs = absensiJs.replace(oldThemeLogic, newThemeLogic);
  } else if (!absensiJs.includes('initGlobalTheme')) {
    absensiJs = newThemeLogic + '\n' + absensiJs;
  }
  fs.writeFileSync('public/absensi.js', absensiJs);
}

console.log('Frontend patched successfully!');
