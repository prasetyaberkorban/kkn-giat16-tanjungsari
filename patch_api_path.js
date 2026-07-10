const fs = require('fs');

const fixFetch = (filePath) => {
  if (!fs.existsSync(filePath)) return;
  let code = fs.readFileSync(filePath, 'utf8');
  if (code.includes("fetch('/api/admin/theme')")) {
    code = code.replace(/fetch\('\/api\/admin\/theme'\)/g, "fetch('/api/theme')");
    fs.writeFileSync(filePath, code);
  }
};

fixFetch('public/app.js');
fixFetch('public/absensi.js');

// Bump HTML cache versions again
const updateHtmlCssVersion = (filePath) => {
  if (!fs.existsSync(filePath)) return;
  let html = fs.readFileSync(filePath, 'utf8');
  const timestamp = Date.now();
  html = html.replace(/src="\/app\.js\?v=\d+"/g, `src="/app.js?v=${timestamp}"`);
  html = html.replace(/src="\/absensi\.js\?v=\d+"/g, `src="/absensi.js?v=${timestamp}"`);
  fs.writeFileSync(filePath, html);
};

updateHtmlCssVersion('public/index.html');
updateHtmlCssVersion('public/absensi.html');

console.log('API Endpoint fixed!');
