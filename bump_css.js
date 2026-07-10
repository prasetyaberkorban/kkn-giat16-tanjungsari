const fs = require('fs');

const updateHtmlCssVersion = (filePath) => {
  if (!fs.existsSync(filePath)) return;
  let html = fs.readFileSync(filePath, 'utf8');
  const timestamp = Date.now();
  
  if (html.includes('href="/style.css?v=')) {
    html = html.replace(/href="\/style\.css\?v=\d+"/, `href="/style.css?v=${timestamp}"`);
  } else {
    html = html.replace(/href="\/style\.css"/, `href="/style.css?v=${timestamp}"`);
  }
  
  fs.writeFileSync(filePath, html);
};

updateHtmlCssVersion('public/index.html');
updateHtmlCssVersion('public/absensi.html');
console.log('CSS Cache busted!');
