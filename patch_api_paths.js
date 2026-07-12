const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, 'gdrive', 'src', 'components', 'DriveDashboard.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

// Replace all /api/drive with /gdrive/api/drive
content = content.replace(/\/api\/drive/g, '/gdrive/api/drive');

fs.writeFileSync(targetPath, content);
console.log('API paths updated in DriveDashboard!');
