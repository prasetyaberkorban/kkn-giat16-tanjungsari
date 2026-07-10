const fs = require('fs');

const file1 = 'src/utils/scheduleCalculator.js';
let content1 = fs.readFileSync(file1, 'utf8');
content1 = content1.replace(/Cuci Piring/g, 'Cuci Alat Alat Masak');
fs.writeFileSync(file1, content1);

const file2 = 'public/app.js';
let content2 = fs.readFileSync(file2, 'utf8');
content2 = content2.replace(/Cuci Piring/g, 'Cuci Alat Alat Masak');
// Also cache bust
if (content2.includes('v=')) {
  const indexFile = 'public/index.html';
  let indexContent = fs.readFileSync(indexFile, 'utf8');
  indexContent = indexContent.replace(/src="\/app\.js\?v=\d+"/, 'src="/app.js?v=' + Date.now() + '"');
  fs.writeFileSync(indexFile, indexContent);
}

fs.writeFileSync(file2, content2);
console.log('Renamed Cuci Piring to Cuci Alat Alat Masak');
