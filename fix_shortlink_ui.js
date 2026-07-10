const fs = require('fs');

// 1. Update index.html
let indexHtml = fs.readFileSync('public/index.html', 'utf8');

const oldHtml = `            <div class="form-group" style="text-align: left; margin: 1.25rem 0; width: 100%; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 1rem;">
              <label style="display: block; color: var(--text-secondary); margin-bottom: 0.35rem; font-size: 0.85rem; font-weight: 600;">LINK PENDEK (OPSIONAL):</label>
              <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <input type="text" id="shortlink-input" class="select-control" style="background: rgba(255, 255, 255, 0.05); padding: 0.6rem 0.85rem; font-size: 0.9rem; flex: 1;" placeholder="Misal: absen-hari-ini" onchange="handleShortlinkSave()">
                <button class="btn" style="background: var(--color-primary); border: none; margin: 0; padding: 0.6rem 1rem;" onclick="copyShortlink()">Copy Link</button>
              </div>
              <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.5rem;">Anggota dapat absen dengan membuka: <span id="shortlink-preview" style="color: var(--color-accent); font-weight: 600;">-</span></p>
            </div>`;

const newHtml = `            <div class="form-group" style="text-align: left; margin: 1.25rem 0; width: 100%; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 1rem;">
              <label style="display: block; color: var(--text-secondary); margin-bottom: 0.35rem; font-size: 0.85rem; font-weight: 600;">KATA KUNCI LINK (OPSIONAL):</label>
              <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.75rem;">
                <input type="text" id="shortlink-input" class="select-control" style="background: rgba(255, 255, 255, 0.05); padding: 0.6rem 0.85rem; font-size: 0.9rem; flex: 1;" placeholder="Misal: absen-hari-ini" onchange="handleShortlinkSave()" onkeyup="handleShortlinkSave()">
              </div>
              <label style="display: block; color: var(--text-secondary); margin-bottom: 0.35rem; font-size: 0.85rem; font-weight: 600;">LINK HASIL GENERATE:</label>
              <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; background: rgba(0,0,0,0.2); border-radius: 6px; padding: 0.5rem; border: 1px solid rgba(255,255,255,0.1); align-items: center;">
                <input type="text" id="shortlink-preview-input" readonly style="background: transparent; border: none; color: var(--color-accent); font-weight: 600; width: 100%; outline: none; flex: 1; font-size: 0.9rem;" value="-">
                <button id="copy-shortlink-btn" class="btn" style="background: var(--color-primary); border: none; margin: 0; padding: 0.4rem 0.8rem; font-size: 0.85rem; border-radius: 4px; font-weight: 600;" onclick="copyShortlink()">Copy</button>
              </div>
            </div>`;

if (indexHtml.includes('LINK PENDEK (OPSIONAL):')) {
  indexHtml = indexHtml.replace(oldHtml, newHtml);
  fs.writeFileSync('public/index.html', indexHtml);
}

// 2. Update app.js
let appJs = fs.readFileSync('public/app.js', 'utf8');

const oldPreviewFn = `function updateShortlinkPreview(val) {
  const preview = document.getElementById('shortlink-preview');
  if (preview) {
    if (!val) {
      preview.innerText = 'Belum diatur';
    } else {
      preview.innerText = window.location.origin + '/' + val;
    }
  }
}`;

const newPreviewFn = `function updateShortlinkPreview(val) {
  const previewInput = document.getElementById('shortlink-preview-input');
  if (previewInput) {
    if (!val) {
      previewInput.value = 'Belum diatur';
    } else {
      previewInput.value = window.location.origin + '/' + val;
    }
  }
}`;

const oldCopyFn = `window.copyShortlink = function() {
  const val = document.getElementById('shortlink-input').value.trim();
  if (!val) return alert('Link pendek belum diatur!');
  const fullUrl = window.location.origin + '/' + val;
  navigator.clipboard.writeText(fullUrl).then(() => {
    alert('Link berhasil disalin!\\n' + fullUrl);
  }).catch(() => alert('Gagal menyalin. Silakan copy manual: ' + fullUrl));
};`;

const newCopyFn = `window.copyShortlink = function() {
  const previewInput = document.getElementById('shortlink-preview-input');
  if (!previewInput || previewInput.value === 'Belum diatur' || previewInput.value === '-') {
    return;
  }
  const btn = document.getElementById('copy-shortlink-btn');
  navigator.clipboard.writeText(previewInput.value).then(() => {
    const originalText = btn.innerText;
    btn.innerText = 'Copied!';
    btn.style.background = 'var(--color-success)';
    setTimeout(() => {
      btn.innerText = originalText;
      btn.style.background = 'var(--color-primary)';
    }, 2000);
  }).catch(() => {
    // Silently fail or you could alert here if needed
  });
};`;

if (appJs.includes('function updateShortlinkPreview')) {
  appJs = appJs.replace(oldPreviewFn, newPreviewFn);
  appJs = appJs.replace(oldCopyFn, newCopyFn);
  fs.writeFileSync('public/app.js', appJs);
}

console.log('UI updated for shortlink copy button');
