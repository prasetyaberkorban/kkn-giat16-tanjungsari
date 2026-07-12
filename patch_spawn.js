const fs = require('fs');

let serverJs = fs.readFileSync('server.js', 'utf8');
serverJs = serverJs.replace(
  "env: { ...process.env, PORT: '3001' },",
  "env: { ...process.env, PORT: '3001' },\n  shell: true,"
);
fs.writeFileSync('server.js', serverJs);
console.log('Fixed shell: true for Windows testing.');
