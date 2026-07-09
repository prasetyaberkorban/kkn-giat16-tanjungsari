const fs = require('fs');

let indexHtml = fs.readFileSync('public/index.html', 'utf8');

// Add Cache-Control Meta Tags to Head
const metaTags = `
  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
  <meta http-equiv="Pragma" content="no-cache" />
  <meta http-equiv="Expires" content="0" />
`;

if (!indexHtml.includes('http-equiv="Cache-Control"')) {
  indexHtml = indexHtml.replace('</head>', metaTags + '</head>');
}

// Update the cache buster timestamp for app.js
if (indexHtml.includes('src="/app.js?v=')) {
  indexHtml = indexHtml.replace(/src="\/app\.js\?v=\d+"/, 'src="/app.js?v=' + Date.now() + '"');
} else {
  indexHtml = indexHtml.replace('src="/app.js"', 'src="/app.js?v=' + Date.now() + '"');
}

fs.writeFileSync('public/index.html', indexHtml);
console.log('Successfully added force-cache bust to index.html!');
