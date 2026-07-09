const fs = require('fs');

let appJs = fs.readFileSync('public/app.js', 'utf8');

const renderCashflowRegex = /function renderCashflow\(container\) \{[\s\S]*?container\.innerHTML = `\s*<table class="premium-table" id="cashflow-table">/;

const newRenderCashflow = `function renderCashflow(container) {
  window.currentCashflowFilter = window.currentCashflowFilter || 'Semua';

  let tbodyHtml = '';
  let totalPemasukan = 0;
  let totalPengeluaran = 0;
  let saldo = 0;

  const rowsHtml = [];

  cashflowData.forEach((item, index) => {
    let pemasukanStr = '-';
    let pengeluaranStr = '-';
    
    if (item.jenis === 'Pemasukan') {
      totalPemasukan += item.nominal;
      saldo += item.nominal;
      pemasukanStr = \`<span style="color: var(--color-success); font-weight: bold;">+ \${formatRupiah(item.nominal)}</span>\`;
    } else {
      totalPengeluaran += item.nominal;
      saldo -= item.nominal;
      pengeluaranStr = \`<span style="color: var(--color-error); font-weight: bold;">- \${formatRupiah(item.nominal)}</span>\`;
    }

    if (window.currentCashflowFilter === 'Semua' || item.jenis === window.currentCashflowFilter) {
      rowsHtml.push(\`
        <tr>
          <td style="font-weight: 600; color: #fff;">\${index + 1}</td>
          <td style="white-space: nowrap;">\${item.tanggal}</td>
          <td style="font-weight: 600; color: var(--color-primary);">[\${item.kategori || '-'}] \${item.deskripsi || '-'}</td>
          <td>\${pemasukanStr}</td>
          <td>\${pengeluaranStr}</td>
          <td style="font-weight: bold; color: #fff;">\${formatRupiah(saldo)}</td>
          <td style="text-align: center; white-space: nowrap;">
            <button class="edit-btn" style="background: none; border: none; color: var(--color-primary); cursor: pointer; font-size: 1.15rem; padding: 0.25rem;" onclick="editCashflowItem('\${item._id}')" title="Edit">✏️</button>
            <button class="delete-btn" style="background: none; border: none; color: var(--color-error); cursor: pointer; font-size: 1.15rem; padding: 0.25rem;" onclick="deleteCashflowItem('\${item._id}')" title="Hapus">🗑️</button>
          </td>
        </tr>
      \`);
    }
  });

  if (rowsHtml.length === 0) {
    tbodyHtml = \`<tr><td colspan="7" style="text-align: center; color: var(--text-secondary); padding: 3rem;">🔍 Belum ada data arus kas untuk filter ini.</td></tr>\`;
  } else {
    tbodyHtml = rowsHtml.join('');
  }

  const subTabsHtml = \`
    <div style="display: flex; gap: 0.5rem; justify-content: center; margin-bottom: 1.5rem;" id="cashflow-type-selector">
      <button class="week-btn \${window.currentCashflowFilter === 'Semua' ? 'active' : ''}" style="min-width: 150px; font-size: 0.95rem; padding: 0.6rem;" onclick="window.currentCashflowFilter='Semua'; renderRab();">Semua Cashflow</button>
      <button class="week-btn \${window.currentCashflowFilter === 'Pemasukan' ? 'active' : ''}" style="min-width: 150px; font-size: 0.95rem; padding: 0.6rem;" onclick="window.currentCashflowFilter='Pemasukan'; renderRab();">Pemasukan Saja</button>
      <button class="week-btn \${window.currentCashflowFilter === 'Pengeluaran' ? 'active' : ''}" style="min-width: 150px; font-size: 0.95rem; padding: 0.6rem;" onclick="window.currentCashflowFilter='Pengeluaran'; renderRab();">Pengeluaran Saja</button>
    </div>
  \`;

  container.innerHTML = subTabsHtml + \`
    <table class="premium-table" id="cashflow-table">\`;
`;

appJs = appJs.replace(renderCashflowRegex, newRenderCashflow);

fs.writeFileSync('public/app.js', appJs);
console.log('Updated renderCashflow with sub-tabs');
