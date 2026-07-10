const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

const startTarget = '<div class="qr-container" id="qrcode">';
const endTarget = '<!-- ================= TAB: DAFTAR HADIR ================= -->';

const startIndex = html.indexOf(startTarget);
const endIndex = html.indexOf(endTarget);

if (startIndex !== -1 && endIndex !== -1) {
  const replacement = `<div class="qr-container" id="qrcode">
              <!-- Render QR code di sini -->
            </div>
            <button id="download-qr-btn" class="submit-btn" style="margin-top: 1rem; width: auto; display: inline-block; padding: 0.5rem 1rem;" onclick="downloadQrCode()">Unduh QR Code</button>
            <p style="margin-top: 1rem;">Tampilkan QR ini ke anggota untuk memindai formulir absensi mobile.</p>
          </div>
        </div>

      </div>
    </div>

    `;
  
  html = html.substring(0, startIndex) + replacement + html.substring(endIndex);
  
  // Bump cache buster
  if (html.includes('v=')) {
    html = html.replace(/src="\/app\.js\?v=\d+"/, 'src="/app.js?v=' + Date.now() + '"');
  }

  fs.writeFileSync('public/index.html', html);
  console.log('Fixed malformed HTML in tab-dashboard!');
} else {
  console.log('Target not found for fixing HTML.');
}
