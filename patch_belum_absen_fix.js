const fs = require('fs');

let appJs = fs.readFileSync('public/app.js', 'utf8');

// 1. Fix the function call
appJs = appJs.replace('if (typeof attendanceData !== "undefined") renderBelumAbsen(attendanceData);', 
                      'if (typeof allAttendanceData !== "undefined") renderBelumAbsen(allAttendanceData);');

// 2. Fix the date logic inside renderBelumAbsen
const oldDateLogic = `const todayDateStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });`;

const newDateLogic = `// Gunakan format yang sama dengan backend/tabel (YYYY-MM-DD)
  const todayDateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });`;

if (appJs.includes(oldDateLogic)) {
  appJs = appJs.replace(oldDateLogic, newDateLogic);
} else {
  // If we couldn't find the exact block, try a simpler replace
  appJs = appJs.replace(/const todayDateStr = new Date\(\)\.toLocaleDateString\('id-ID', \{[^}]+\}\);/s, newDateLogic);
}

fs.writeFileSync('public/app.js', appJs);

// BUMP VERSION IN INDEX.HTML
let indexHtml = fs.readFileSync('public/index.html', 'utf8');
const timestamp = Date.now();
indexHtml = indexHtml.replace(/src="\/app\.js\?v=\d+"/g, `src="/app.js?v=${timestamp}"`);
indexHtml = indexHtml.replace(/v1\.2\.0/g, 'v1.2.1');
fs.writeFileSync('public/index.html', indexHtml);

console.log('Fixed Belum Absen logic!');
