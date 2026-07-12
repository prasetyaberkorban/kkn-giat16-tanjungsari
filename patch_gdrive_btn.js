const fs = require('fs');

let indexHtml = fs.readFileSync('public/index.html', 'utf8');

const gdriveButton = `
      <a href="http://kkngiat16tanjungsari.foerta.tech:3000" target="_blank" class="menu-toggle-btn admin-only" title="Buka GDrive" style="margin-right: 0.5rem; display: flex; align-items: center; gap: 0.35rem; text-decoration: none; background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.3); color: #60a5fa;">
        📁 <span class="hide-mobile">GDrive</span>
      </a>`;

// Inject before the menu button
if (indexHtml.includes('<button class="menu-toggle-btn" id="menu-toggle-btn"')) {
    indexHtml = indexHtml.replace('<button class="menu-toggle-btn" id="menu-toggle-btn"', gdriveButton + '\n      <button class="menu-toggle-btn" id="menu-toggle-btn"');
}

// BUMP VERSION
const timestamp = Date.now();
indexHtml = indexHtml.replace(/v1\.5\.0/g, 'v1.6.0');
indexHtml = indexHtml.replace(/src="\/app\.js\?v=\d+"/g, `src="/app.js?v=${timestamp}"`);
indexHtml = indexHtml.replace(/href="\/style\.css\?v=\d+"/g, `href="/style.css?v=${timestamp}"`);

fs.writeFileSync('public/index.html', indexHtml);
console.log('GDrive button added!');
