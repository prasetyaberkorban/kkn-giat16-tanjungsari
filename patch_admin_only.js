const fs = require('fs');

let indexHtml = fs.readFileSync('public/index.html', 'utf8');

// Add admin-only class to the Theme toggle button
if (indexHtml.includes('<button class="menu-toggle-btn" onclick="toggleGlobalTheme()"')) {
  indexHtml = indexHtml.replace('<button class="menu-toggle-btn" onclick="toggleGlobalTheme()"', 
                                '<button class="menu-toggle-btn admin-only" onclick="toggleGlobalTheme()"');
}

// BUMP VERSION
const timestamp = Date.now();
indexHtml = indexHtml.replace(/v1\.2\.1/g, 'v1.2.2');
indexHtml = indexHtml.replace(/v1\.2\.0/g, 'v1.2.2');
indexHtml = indexHtml.replace(/src="\/app\.js\?v=\d+"/g, `src="/app.js?v=${timestamp}"`);
fs.writeFileSync('public/index.html', indexHtml);

console.log('Admin-only patched!');
