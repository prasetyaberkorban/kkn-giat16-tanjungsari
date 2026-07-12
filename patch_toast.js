const fs = require('fs');

// 1. UPDATE style.css
let styleCss = fs.readFileSync('public/style.css', 'utf8');
if (!styleCss.includes('#toast-container')) {
  const toastCss = `
/* ================= TOAST NOTIFICATION ================= */
#toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 99999;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
}
.toast {
  background: rgba(17, 24, 39, 0.95);
  backdrop-filter: blur(15px);
  border-left: 4px solid var(--color-primary);
  border-right: 1px solid rgba(255,255,255,0.1);
  border-top: 1px solid rgba(255,255,255,0.1);
  border-bottom: 1px solid rgba(255,255,255,0.1);
  color: #f3f4f6;
  padding: 1rem 1.5rem;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 12px;
  opacity: 0;
  transform: translateX(110%);
  animation: slideInToast 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards, fadeOutToast 0.4s 4.6s forwards;
  pointer-events: auto;
}
@keyframes slideInToast {
  to { opacity: 1; transform: translateX(0); }
}
@keyframes fadeOutToast {
  to { opacity: 0; transform: translateX(110%); }
}
`;
  styleCss += '\n' + toastCss;
  fs.writeFileSync('public/style.css', styleCss);
}

// 2. UPDATE app.js
let appJs = fs.readFileSync('public/app.js', 'utf8');

const toastJs = `
window.showToast = function(message) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = 'toast';
  
  // Deteksi error/gagal dari teks
  const msgLower = message.toLowerCase();
  const isError = msgLower.includes('gagal') || msgLower.includes('kesalahan') || msgLower.includes('putus') || msgLower.includes('error');
  
  toast.style.borderLeftColor = isError ? 'var(--color-error)' : 'var(--color-success)';
  
  // Icon simpel
  const icon = isError ? '❌ ' : '✅ ';
  toast.innerText = icon + message;
  
  container.appendChild(toast);
  
  // Cleanup DOM
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 5000); // Tepat 5 detik
};
`;

if (!appJs.includes('window.showToast = function')) {
  appJs = toastJs + '\n' + appJs;
}

// Replace all alert( dengan showToast(
appJs = appJs.replace(/alert\(/g, 'showToast(');
fs.writeFileSync('public/app.js', appJs);

// 3. BUMP VERSION in index.html
let indexHtml = fs.readFileSync('public/index.html', 'utf8');
const timestamp = Date.now();
indexHtml = indexHtml.replace(/v1\.4\.1/g, 'v1.5.0');
indexHtml = indexHtml.replace(/src="\/app\.js\?v=\d+"/g, `src="/app.js?v=${timestamp}"`);
indexHtml = indexHtml.replace(/href="\/style\.css\?v=\d+"/g, `href="/style.css?v=${timestamp}"`);
fs.writeFileSync('public/index.html', indexHtml);

console.log('Toast injected and applied globally!');
