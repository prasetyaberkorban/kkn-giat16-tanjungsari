const fs = require('fs');

// 1. Update api.js
let apiJs = fs.readFileSync('src/routes/api.js', 'utf8');

if (!apiJs.includes("const Cashflow = require('../models/Cashflow')")) {
  apiJs = apiJs.replace(
    "const ProgramKerja = require('../models/ProgramKerja');",
    "const ProgramKerja = require('../models/ProgramKerja');\nconst Cashflow = require('../models/Cashflow');"
  );
}

if (!apiJs.includes("cashflow: await Cashflow.find({}).sort({ tanggal: 1 })")) {
  apiJs = apiJs.replace(
    "programkerja: await ProgramKerja.find({})",
    "programkerja: await ProgramKerja.find({}),\n      cashflow: await Cashflow.find({}).sort({ tanggal: 1 })"
  );
}
fs.writeFileSync('src/routes/api.js', apiJs);

// 2. Update googleSheets.js
let sheetsJs = fs.readFileSync('src/services/googleSheets.js', 'utf8');

if (!sheetsJs.includes("const cashflowRows =")) {
  const cashflowLogic = `
  let totalSaldoCashflow = 0;
  const cashflowRows = (allData.cashflow || []).map(c => {
    let pemasukan = '';
    let pengeluaran = '';
    if (c.jenis === 'Pemasukan') {
      pemasukan = c.nominal || 0;
      totalSaldoCashflow += c.nominal || 0;
    } else {
      pengeluaran = c.nominal || 0;
      totalSaldoCashflow -= c.nominal || 0;
    }
    return [
      c._id.toString(),
      c.tanggal || '-',
      c.jenis || '-',
      c.kategori || '-',
      c.deskripsi || '-',
      c.hargaSatuan || 0,
      c.jumlahBarang || 0,
      pemasukan,
      pengeluaran,
      totalSaldoCashflow,
      new Date(c.createdAt).toLocaleString('id-ID')
    ];
  });
  cashflowRows.push(['', '', '', '', '', '', 'TOTAL SALDO AKHIR', '', '', totalSaldoCashflow, '']);
`;

  sheetsJs = sheetsJs.replace(
    "const exportsConfig = [",
    cashflowLogic + "\n  const exportsConfig = ["
  );
  
  const cashflowConfig = `
    {
      title: 'Cashflow',
      headers: ['ID', 'Tanggal', 'Jenis', 'Kategori', 'Deskripsi', 'Harga Satuan', 'Jumlah Barang', 'Pemasukan', 'Pengeluaran', 'Saldo', 'Tanggal Dibuat'],
      rows: cashflowRows
    },`;

  sheetsJs = sheetsJs.replace(
    "const exportsConfig = [",
    "const exportsConfig = [" + cashflowConfig
  );
}
fs.writeFileSync('src/services/googleSheets.js', sheetsJs);
console.log("Updated both files!");
