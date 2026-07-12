const fs = require('fs');

const indexPath = 'public/index.html';
let indexHtml = fs.readFileSync(indexPath, 'utf8');

// Replace "Buka Arsip GDrive" with "GDrive"
indexHtml = indexHtml.replace('📁 Buka Arsip GDrive', '📁 GDrive');

fs.writeFileSync(indexPath, indexHtml);
console.log('Text changed!');
