const fs = require('fs');

// 1. Fix app.js duplicate function
let appJs = fs.readFileSync('public/app.js', 'utf8');

// The old function starts around line 3091
// I will find the exact string and remove it
const oldFunc = `function openCashflowModal() {
  const modal = document.getElementById('cashflow-modal');
  if (!modal) return;

  document.getElementById('cashflow-form-id').value = '';
  document.getElementById('cashflow-form').reset();
  
  // Set default date to today
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  document.getElementById('cashflow-form-tanggal').value = \`\${yyyy}-\${mm}-\${dd}\`;

  modal.classList.add('active');
}`;

if (appJs.includes(oldFunc)) {
  appJs = appJs.replace(oldFunc, '');
  fs.writeFileSync('public/app.js', appJs);
  console.log('Removed old openCashflowModal in app.js');
} else {
  console.log('Could not find old openCashflowModal in app.js');
}

// 2. Add cache buster to index.html
let indexHtml = fs.readFileSync('public/index.html', 'utf8');
if (indexHtml.includes('src="/app.js"')) {
  indexHtml = indexHtml.replace('src="/app.js"', 'src="/app.js?v=' + Date.now() + '"');
  fs.writeFileSync('public/index.html', indexHtml);
  console.log('Added cache buster to index.html');
} else if (indexHtml.includes('src="/app.js?v=')) {
  indexHtml = indexHtml.replace(/src="\/app\.js\?v=\d+"/, 'src="/app.js?v=' + Date.now() + '"');
  fs.writeFileSync('public/index.html', indexHtml);
  console.log('Updated cache buster in index.html');
} else {
  console.log('Could not find app.js script tag in index.html');
}
