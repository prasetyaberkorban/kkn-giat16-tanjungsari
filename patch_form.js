const fs = require('fs');

// 1. UPDATE index.html UI
let indexHtml = fs.readFileSync('public/index.html', 'utf8');

// Fix the '?' close button to '&times;'
if (indexHtml.includes('<button class="modal-close" onclick="closeManualAttendanceModal()">?</button>')) {
    indexHtml = indexHtml.replace('<button class="modal-close" onclick="closeManualAttendanceModal()">?</button>', 
                                  '<button class="modal-close" onclick="closeManualAttendanceModal()">&times;</button>');
}

// Fix the input-control to select-control
indexHtml = indexHtml.replace(/<select id="manual-attendance-name" class="input-control"/g, '<select id="manual-attendance-name" class="select-control"');
indexHtml = indexHtml.replace(/<select id="manual-attendance-status" class="input-control"/g, '<select id="manual-attendance-status" class="select-control"');

// Fix the submit-btn style
// Currently it is: <button type="submit" class="submit-btn" style="margin-top: 1.5rem;">Simpan Kehadiran</button>
// To match the rest, we can change to: <button type="submit" class="btn submit-btn" style="width: 100%; padding: 1rem; border-radius: 16px; margin-top: 1.5rem; font-weight: 600;">Simpan Kehadiran</button>
indexHtml = indexHtml.replace(/<button type="submit" class="submit-btn" style="margin-top: 1.5rem;">Simpan Kehadiran<\/button>/g, 
                              '<button type="submit" class="btn submit-btn" style="width: 100%; padding: 1rem; border-radius: 16px; margin-top: 1.5rem; font-weight: 600; font-size: 1.1rem; box-shadow: var(--shadow-glow);">Simpan Kehadiran</button>');

// BUMP VERSION
const timestamp = Date.now();
indexHtml = indexHtml.replace(/v1\.3\.1/g, 'v1.4.0');
indexHtml = indexHtml.replace(/src="\/app\.js\?v=\d+"/g, `src="/app.js?v=${timestamp}"`);
fs.writeFileSync('public/index.html', indexHtml);

// 2. UPDATE app.js logic
let appJs = fs.readFileSync('public/app.js', 'utf8');

// The old logic starts with `const manualForm = document.getElementById('manual-attendance-form');`
// and ends with `});\n}` or `});\n}\n\n// Handle submit shortlink`

const oldLogic = `// Handle submit manual attendance
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
      const btn = manualForm.querySelector('button[type="submit"]');
      if (btn) {
        btn.innerHTML = 'Simpan Kehadiran';
        btn.disabled = false;
      }
    }
  });
}`;

const newLogic = `// Handle submit manual attendance
document.addEventListener('DOMContentLoaded', () => {
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
        const btn = manualForm.querySelector('button[type="submit"]');
        if (btn) {
          btn.innerHTML = 'Simpan Kehadiran';
          btn.disabled = false;
        }
      }
    });
  }
});`;

// Try to replace, if not exact, we will use regex to find and wrap it
if (appJs.includes("const manualForm = document.getElementById('manual-attendance-form');\nif (manualForm) {")) {
    // If it matches exactly
    appJs = appJs.replace(oldLogic, newLogic);
} else {
    // Wrap it using a regex or simple injection since it's at the global scope
    // We can just find `const manualForm = document.getElementById('manual-attendance-form');` and replace it
    appJs = appJs.replace("const manualForm = document.getElementById('manual-attendance-form');", 
                          "document.addEventListener('DOMContentLoaded', () => {\nconst manualForm = document.getElementById('manual-attendance-form');");
    
    // Then we need to add `});` at the end of the `if (manualForm)` block.
    // The easiest way is to append it at the very bottom of the file (or find the next block)
    appJs = appJs.replace("// Handle submit shortlink", "});\n\n// Handle submit shortlink");
}

fs.writeFileSync('public/app.js', appJs);

console.log('Fixed Form UI and Submission!');
