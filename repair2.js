const fs = require('fs');
let content = fs.readFileSync('public/app.js', 'utf8');

const regex = /const response = await fetch\('\/api\/export-sheets', \{\s*method: 'POST'\s*\}\);\s*let pengeluaranStr = '-';/g;

const replacement = `const response = await fetch('/api/export-sheets', {
      method: 'POST'
    });
    
    const result = await response.json();
    
    if (response.ok) {
      alert('✅ Sukses: ' + result.message);
    } else {
      alert('❌ Gagal: ' + (result.error || 'Terjadi kesalahan'));
    }
  } catch (error) {
    console.error('Error syncing to sheets:', error);
    alert('❌ Terjadi kesalahan jaringan saat sync data.');
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

/* ================= CASHFLOW ================= */

function renderCashflow(container) {
  let tbodyHtml = '';
  let totalPemasukan = 0;
  let totalPengeluaran = 0;
  let saldo = 0;

  if (cashflowData.length === 0) {
    tbodyHtml = \`<tr><td colspan="7" style="text-align: center; color: var(--text-secondary); padding: 3rem;">🔍 Belum ada data arus kas.</td></tr>\`;
  } else {
    cashflowData.forEach((item, index) => {
      let pemasukanStr = '-';
      let pengeluaranStr = '-';`;

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync('public/app.js', content);
  console.log('Fixed app.js successfully!');
} else {
  console.log('Target not found with regex.');
}
