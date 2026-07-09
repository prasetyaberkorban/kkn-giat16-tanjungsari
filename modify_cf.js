const fs = require('fs');
let content = fs.readFileSync('public/app.js', 'utf8');

// Replace openCashflowModal
content = content.replace(/function openCashflowModal\(\) \{[\s\S]*?modal\.classList\.add\('active'\);\n\}/, `function calculateCashflowNominal() {
  const hargaSatuan = parseFloat(document.getElementById('cashflow-form-hargasatuan').value) || 0;
  const jumlahBarang = parseFloat(document.getElementById('cashflow-form-jumlahbarang').value) || 0;
  document.getElementById('cashflow-form-nominal').value = hargaSatuan * jumlahBarang;
}

function openCashflowModal(jenis = 'Pemasukan') {
  const modal = document.getElementById('cashflow-modal');
  if (!modal) return;

  document.getElementById('cashflow-form-id').value = '';
  document.getElementById('cashflow-form').reset();
  
  // Set default date to today
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  document.getElementById('cashflow-form-tanggal').value = \`\${yyyy}-\${mm}-\${dd}\`;

  document.getElementById('cashflow-form-jenis').value = jenis;
  document.getElementById('cashflow-modal-title').innerText = jenis === 'Pemasukan' ? '💸 Tambah Pemasukan' : '💸 Tambah Pengeluaran';

  const kategoriSelect = document.getElementById('cashflow-form-kategori');
  kategoriSelect.innerHTML = '';
  if (jenis === 'Pemasukan') {
    const opts = ['Kampus', 'Urunan', 'Denda', 'Lainnya'];
    opts.forEach(opt => kategoriSelect.innerHTML += \`<option value="\${opt}">\${opt}</option>\`);
  } else {
    const opts = ['Posko', 'Konsumsi', 'Transportasi', 'Proker', 'Lainnya'];
    opts.forEach(opt => kategoriSelect.innerHTML += \`<option value="\${opt}">\${opt}</option>\`);
  }

  modal.classList.add('active');
}`);

// Replace handleSaveCashflow
content = content.replace(/const id = document\.getElementById\('cashflow-form-id'\)\.value;[\s\S]*?const payload = \{ tanggal, keterangan, jenis, nominal \};/, `const id = document.getElementById('cashflow-form-id').value;
  const tanggal = document.getElementById('cashflow-form-tanggal').value;
  const jenis = document.getElementById('cashflow-form-jenis').value;
  const kategori = document.getElementById('cashflow-form-kategori').value;
  const deskripsi = document.getElementById('cashflow-form-deskripsi').value;
  const hargaSatuan = parseFloat(document.getElementById('cashflow-form-hargasatuan').value) || 0;
  const jumlahBarang = parseFloat(document.getElementById('cashflow-form-jumlahbarang').value) || 0;
  const nominal = parseFloat(document.getElementById('cashflow-form-nominal').value) || 0;

  const payload = { tanggal, jenis, kategori, deskripsi, hargaSatuan, jumlahBarang, nominal };`);

// Update renderCashflow to show [Kategori] Deskripsi
content = content.replace(/<td>\$\{item\.keterangan\}<\/td>/g, '<td><span style="background: rgba(255,255,255,0.1); padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.8rem; margin-right: 0.5rem; color: var(--color-accent);">${item.kategori}</span>${item.deskripsi}</td>');

// Update table header in renderCashflow if any, though it uses `<th>Keterangan / Sumber / Penggunaan</th>`
// That's fine.

fs.writeFileSync('public/app.js', content);
console.log('Updated Cashflow logic successfully');
