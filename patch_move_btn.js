const fs = require('fs');

const indexPath = 'public/index.html';
let indexHtml = fs.readFileSync(indexPath, 'utf8');

// 1. Remove the GDrive button from the navbar
const gdriveBtnRegex = /\s*<a href="\/gdrive" class="menu-toggle-btn admin-only" title="Buka GDrive"[\s\S]*?<\/a>/g;
indexHtml = indexHtml.replace(gdriveBtnRegex, '');

// 2. Insert the new button below the subtitle
const subtitleText = '<p class="subtitle">Sistem Absensi Piket Harian & Monitoring Kinerja Posko</p>';
const newBtnHtml = `
    <div style="margin-top: 1rem; display: flex; justify-content: center;">
      <a href="/gdrive" class="btn" title="Buka GDrive" style="background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.3); color: #60a5fa; text-decoration: none; padding: 0.6rem 1.2rem; border-radius: 8px; font-weight: 600; display: inline-flex; align-items: center; gap: 0.5rem; width: auto; margin: 0; box-shadow: 0 4px 6px rgba(0,0,0,0.1); backdrop-filter: blur(4px);">
        📁 Buka Arsip GDrive
      </a>
    </div>`;

if (!indexHtml.includes('Buka Arsip GDrive')) {
    indexHtml = indexHtml.replace(subtitleText, subtitleText + newBtnHtml);
}

fs.writeFileSync(indexPath, indexHtml);
console.log('Moved GDrive button to header!');
