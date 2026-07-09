const fs = require('fs');
let appJs = fs.readFileSync('public/app.js', 'utf8');

const regex = /function openCashflowModal\(\) \{\s*const modal = document\.getElementById\('cashflow-modal'\);\s*if \(!modal\) return;\s*document\.getElementById\('cashflow-form-id'\)\.value = '';\s*document\.getElementById\('cashflow-form'\)\.reset\(\);\s*\/\/ Set default date to today\s*const today = new Date\(\);\s*const yyyy = today\.getFullYear\(\);\s*const mm = String\(today\.getMonth\(\) \+ 1\)\.padStart\(2, '0'\);\s*const dd = String\(today\.getDate\(\)\)\.padStart\(2, '0'\);\s*document\.getElementById\('cashflow-form-tanggal'\)\.value = `\$\{yyyy\}-\$\{mm\}-\$\{dd\}`;\s*modal\.classList\.add\('active'\);\s*\}/;

if (regex.test(appJs)) {
  appJs = appJs.replace(regex, '');
  fs.writeFileSync('public/app.js', appJs);
  console.log('Removed old openCashflowModal in app.js using regex');
} else {
  console.log('Regex also failed');
}
