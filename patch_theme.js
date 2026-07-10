const fs = require('fs');

// 1. UPDATE CSS
let css = fs.readFileSync('public/style.css', 'utf8');
const viensTheme = `
/* ================= TEMA VIENS ================= */
body.theme-viens {
  --bg-color: #090514;
  --panel-bg: rgba(20, 10, 30, 0.65);
  --border-color: rgba(255, 255, 255, 0.12);
  
  --primary-glow: radial-gradient(circle at 0% 0%, rgba(217, 38, 169, 0.45) 0%, rgba(0, 0, 0, 0) 60%);
  --secondary-glow: radial-gradient(circle at 100% 100%, rgba(139, 43, 226, 0.35) 0%, rgba(0, 0, 0, 0) 60%);
  
  --color-primary: #d926a9; /* Magenta */
  --color-primary-hover: #b81c8e;
  --color-secondary: #8b2be2; /* Blue violet */
  --color-accent: #ff4785; 
  
  --shadow-glow: 0 0 35px rgba(217, 38, 169, 0.5);
  --shadow-success: 0 0 25px rgba(16, 185, 129, 0.4);
}
body.theme-viens::before, body.theme-viens::after {
  width: 80%;
  height: 80%;
}
`;
if (!css.includes('body.theme-viens')) {
  css = css.replace('}', '}\n' + viensTheme);
  fs.writeFileSync('public/style.css', css);
}

// 2. UPDATE HTML FILES
const updateHtml = (filePath) => {
  let html = fs.readFileSync(filePath, 'utf8');
  
  // Theme Toggle Button
  const toggleBtn = `<button class="menu-toggle-btn" onclick="toggleTheme()" title="Ubah Tema" style="margin-right: 0.5rem; display: flex; align-items: center; gap: 0.35rem;">🎨 <span class="hide-mobile">Tema</span></button>`;
  
  if (!html.includes('toggleTheme()')) {
    html = html.replace('<div class="top-bar-actions">', '<div class="top-bar-actions">\n      ' + toggleBtn);
  }
  
  // Footer Version Update
  html = html.replace(/<span style="opacity: 0\.7;">v[\d\.]+<\/span>/, '<span style="opacity: 0.7;">v1.1.0</span>');
  if (!html.includes('v1.1.0')) {
    // Fallback if regex didn't catch it
    html = html.replace('Sistem Piket & Absensi Posko.</p>', 'Sistem Piket & Absensi Posko. <span style="opacity: 0.7;">v1.1.0</span></p>');
  }
  
  // Cache Buster
  const timestamp = Date.now();
  if (html.includes('app.js')) {
    html = html.replace(/src="\/app\.js\?v=\d+"/, `src="/app.js?v=${timestamp}"`);
    if (!html.includes(`src="/app.js?v=${timestamp}"`)) html = html.replace(/src="\/app\.js"/, `src="/app.js?v=${timestamp}"`);
  }
  if (html.includes('absensi.js')) {
    html = html.replace(/src="\/absensi\.js\?v=\d+"/, `src="/absensi.js?v=${timestamp}"`);
    if (!html.includes(`src="/absensi.js?v=${timestamp}"`)) html = html.replace(/src="\/absensi\.js"/, `src="/absensi.js?v=${timestamp}"`);
  }
  
  fs.writeFileSync(filePath, html);
};

if (fs.existsSync('public/index.html')) updateHtml('public/index.html');
if (fs.existsSync('public/absensi.html')) updateHtml('public/absensi.html');

// 3. UPDATE JS FILES
const themeLogic = `
/* ================= THEME TOGGLE ================= */
(function() {
  const savedTheme = localStorage.getItem('app-theme') || 'theme-viens';
  if (savedTheme === 'theme-viens') {
    document.body.classList.add('theme-viens');
  } else {
    document.body.classList.remove('theme-viens');
  }
})();

window.toggleTheme = function() {
  if (document.body.classList.contains('theme-viens')) {
    document.body.classList.remove('theme-viens');
    localStorage.setItem('app-theme', 'theme-default');
  } else {
    document.body.classList.add('theme-viens');
    localStorage.setItem('app-theme', 'theme-viens');
  }
};
`;

const updateJs = (filePath) => {
  let js = fs.readFileSync(filePath, 'utf8');
  if (!js.includes('window.toggleTheme')) {
    js = themeLogic + '\n' + js;
    fs.writeFileSync(filePath, js);
  }
};

if (fs.existsSync('public/app.js')) updateJs('public/app.js');
if (fs.existsSync('public/absensi.js')) updateJs('public/absensi.js');

console.log('Theme update complete!');
