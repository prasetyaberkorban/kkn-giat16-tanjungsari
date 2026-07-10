const fs = require('fs');

let css = fs.readFileSync('public/style.css', 'utf8');

const oldViensTheme = css.substring(css.indexOf('/* ================= TEMA VIENS ================= */'));

const newViensTheme = `/* ================= TEMA VIENS ================= */
body.theme-viens {
  --bg-color: #090514;
  --panel-bg: rgba(20, 10, 35, 0.65);
  --border-color: rgba(255, 255, 255, 0.08);
  
  --primary-glow: radial-gradient(circle at 20% 20%, rgba(217, 38, 169, 0.35) 0%, rgba(0, 0, 0, 0) 50%);
  --secondary-glow: radial-gradient(circle at 80% 80%, rgba(139, 43, 226, 0.25) 0%, rgba(0, 0, 0, 0) 50%);
  
  --color-primary: #d926a9; /* Magenta */
  --color-primary-hover: #b81c8e;
  --color-secondary: #8b2be2; /* Blue violet */
  --color-accent: #ff4785; 
  
  --shadow-glow: 0 0 35px rgba(217, 38, 169, 0.5);
  --shadow-success: 0 0 25px rgba(16, 185, 129, 0.4);
  
  /* Background Lines for Viens Aesthetic */
  background-image: 
    url("data:image/svg+xml,%3Csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M-100,200 Q250,50 600,300 T1300,100' stroke='rgba(255,255,255,0.03)' stroke-width='2' fill='none'/%3E%3Cpath d='M-100,600 Q350,450 700,700 T1400,500' stroke='rgba(255,255,255,0.02)' stroke-width='1.5' fill='none'/%3E%3C/svg%3E");
  background-attachment: fixed;
  background-size: cover;
}

body.theme-viens::before {
  width: 100vw;
  height: 100vh;
  top: 0; left: 0;
  position: fixed;
  background: radial-gradient(ellipse at 10% 20%, rgba(217, 38, 169, 0.3) 0%, transparent 60%);
}

body.theme-viens::after {
  width: 100vw;
  height: 100vh;
  bottom: 0; right: 0;
  top: auto; left: auto;
  position: fixed;
  background: radial-gradient(ellipse at 90% 80%, rgba(139, 43, 226, 0.25) 0%, transparent 60%);
}

/* Card Overrides for Viens Theme */
body.theme-viens .card {
  background: linear-gradient(145deg, rgba(25, 12, 35, 0.75) 0%, rgba(15, 8, 25, 0.85) 100%);
  border: 1px solid rgba(217, 38, 169, 0.15);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7), inset 0 1px 1px rgba(255, 255, 255, 0.1);
  border-radius: 20px;
}

body.theme-viens .top-bar {
  background: rgba(10, 5, 20, 0.6);
  border-bottom: 1px solid rgba(217, 38, 169, 0.1);
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.3);
}

body.theme-viens h1 {
  background: linear-gradient(135deg, #ffffff 30%, #ffa3e5 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

body.theme-viens .unnes-title {
  background: linear-gradient(135deg, #ffffff 40%, #ffa3e5 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

body.theme-viens .submit-btn, body.theme-viens .btn {
  background: linear-gradient(90deg, var(--color-primary) 0%, var(--color-secondary) 100%);
  border-radius: 30px;
  border: none;
  box-shadow: 0 4px 15px rgba(217, 38, 169, 0.3);
}

body.theme-viens .submit-btn:hover, body.theme-viens .btn:hover {
  box-shadow: 0 6px 20px rgba(217, 38, 169, 0.5);
  transform: translateY(-2px);
}

body.theme-viens .admin-login-btn {
  background: #ffffff;
  color: #000000;
  border-radius: 30px;
  box-shadow: 0 4px 15px rgba(255, 255, 255, 0.2);
}

body.theme-viens .admin-login-btn:hover {
  box-shadow: 0 6px 20px rgba(255, 255, 255, 0.3);
}
`;

if (css.includes('/* ================= TEMA VIENS ================= */')) {
  css = css.replace(oldViensTheme, newViensTheme);
} else {
  css = css + '\n' + newViensTheme;
}
fs.writeFileSync('public/style.css', css);

// BUMP CSS CACHE
const updateHtmlCssVersion = (filePath) => {
  if (!fs.existsSync(filePath)) return;
  let html = fs.readFileSync(filePath, 'utf8');
  const timestamp = Date.now();
  if (html.includes('href="/style.css?v=')) {
    html = html.replace(/href="\/style\.css\?v=\d+"/, \`href="/style.css?v=\${timestamp}"\`);
  } else {
    html = html.replace(/href="\/style\.css"/, \`href="/style.css?v=\${timestamp}"\`);
  }
  fs.writeFileSync(filePath, html);
};

updateHtmlCssVersion('public/index.html');
updateHtmlCssVersion('public/absensi.html');
console.log('Advanced Viens theme overrides applied!');
