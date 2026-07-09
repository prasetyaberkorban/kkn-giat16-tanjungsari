const fs = require('fs');
let content = fs.readFileSync('public/app.js', 'utf8');

// Remove everything from // Override initial load to fetch cashflow to the end
content = content.replace(/\/\/ Override initial load to fetch cashflow[\s\S]+/, '');

fs.writeFileSync('public/app.js', content.trim() + '\n');
console.log('Successfully removed the override block!');
