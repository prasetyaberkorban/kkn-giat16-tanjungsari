const fs = require('fs');
let indexHtml = fs.readFileSync('public/index.html', 'utf8');
const timestamp = Date.now();
if (indexHtml.includes('app.js?v=')) {
  indexHtml = indexHtml.replace(/src="\/app\.js\?v=\d+"/, `src="/app.js?v=${timestamp}"`);
} else {
  indexHtml = indexHtml.replace(/src="\/app\.js"/, `src="/app.js?v=${timestamp}"`);
}
fs.writeFileSync('public/index.html', indexHtml);
console.log('Bumped cache');
