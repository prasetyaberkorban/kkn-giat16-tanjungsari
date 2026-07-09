const fs = require('fs');

// 1. Update index.html for flatpickr and cache buster
let indexHtml = fs.readFileSync('public/index.html', 'utf8');

// Add Flatpickr CSS if not there
if (!indexHtml.includes('flatpickr.min.css')) {
  indexHtml = indexHtml.replace('</head>', '  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">\n</head>');
}
// Add Flatpickr JS if not there
if (!indexHtml.includes('flatpickr"></script>')) {
  indexHtml = indexHtml.replace('</body>', '  <script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>\n</body>');
}
// Change input type="date" to type="text" for cashflow
if (indexHtml.includes('type="date" id="cashflow-form-tanggal"')) {
  indexHtml = indexHtml.replace('type="date" id="cashflow-form-tanggal"', 'type="text" id="cashflow-form-tanggal"');
}
// Update Cache buster
if (indexHtml.includes('src="/app.js?v=')) {
  indexHtml = indexHtml.replace(/src="\/app\.js\?v=\d+"/, 'src="/app.js?v=' + Date.now() + '"');
}

fs.writeFileSync('public/index.html', indexHtml);


// 2. Update app.js
let appJs = fs.readFileSync('public/app.js', 'utf8');

// a) Fix Cashflow Keterangan undefined -> [Kategori] Deskripsi
appJs = appJs.replace(/\$\{item\.keterangan\}/g, '[${item.kategori || \'-\'}] ${item.deskripsi || \'-\'}');

// b) Add Edit button to Cashflow
const deleteBtnRegex = /<button class="delete-btn" [^>]*onclick="deleteCashflowItem\('\$\{item\._id\}'\)"[^>]*>.*?<\/button>/;
const editBtnHtml = `<button class="edit-btn" style="background: none; border: none; color: var(--color-primary); cursor: pointer; font-size: 1.15rem; padding: 0.25rem;" onclick="editCashflowItem('\${item._id}')" title="Edit">✏️</button>`;

if (appJs.match(deleteBtnRegex)) {
  appJs = appJs.replace(deleteBtnRegex, match => editBtnHtml + '\n            ' + match);
}

// c) Add editCashflowItem function
const editCashflowItemFunc = `
window.editCashflowItem = function(id) {
  const item = cashflowData.find(c => c._id === id);
  if (!item) return;
  openCashflowModal(item.jenis);
  setTimeout(() => {
    document.getElementById('cashflow-form-id').value = item._id;
    if (window._cashflowDatePicker) {
      window._cashflowDatePicker.setDate(item.tanggal || new Date());
    }
    const katSelect = document.getElementById('cashflow-form-kategori');
    if(katSelect) katSelect.value = item.kategori || '';
    document.getElementById('cashflow-form-deskripsi').value = item.deskripsi || '';
    document.getElementById('cashflow-form-hargasatuan').value = item.hargaSatuan || 0;
    document.getElementById('cashflow-form-jumlahbarang').value = item.jumlahBarang || 0;
    document.getElementById('cashflow-form-nominal').value = item.nominal || 0;
  }, 100);
};
`;
if (!appJs.includes('window.editCashflowItem = function')) {
  appJs = appJs.replace('function openCashflowModal', editCashflowItemFunc + '\nfunction openCashflowModal');
}

// d) Update openCashflowModal to use Flatpickr
if (appJs.includes('document.getElementById(\'cashflow-form-tanggal\').value = `${yyyy}-${mm}-${dd}`;')) {
  const flatpickrInit = `
  if (!window._cashflowDatePicker) {
    window._cashflowDatePicker = flatpickr("#cashflow-form-tanggal", {
      dateFormat: "Y-m-d",
      altInput: true,
      altFormat: "d-m-Y",
      defaultDate: "today"
    });
  } else {
    window._cashflowDatePicker.setDate("today");
  }
`;
  appJs = appJs.replace(/const today = new Date\(\);\s*const yyyy = today\.getFullYear\(\);\s*const mm = String\(today\.getMonth\(\) \+ 1\)\.padStart\(2, '0'\);\s*const dd = String\(today\.getDate\(\)\)\.padStart\(2, '0'\);\s*document\.getElementById\('cashflow-form-tanggal'\)\.value = `\$\{yyyy\}-\$\{mm\}-\$\{dd\}`;/, flatpickrInit);
}

// e) Fix Uang Sisa
const uangSisaRegex = /<div style="display: flex; align-items: center; gap: 0\.5rem;">\s*<span style="color: var\(--text-secondary\);">Rp<\/span>\s*<input type="number" id="uang-sisa-\$\{currentRabType\}"[^>]*>\s*<\/div>/g;

const newUangSisaHtml = `<div style="display: flex; align-items: center; gap: 0.5rem;" id="uang-sisa-container-\${currentRabType}">
                  <span style="color: var(--color-warning); font-weight: bold; font-size: 1.1rem;">\${formatRupiah(rabSettingData[currentRabType] || 0)}</span>
                  <button onclick="editUangSisa('\${currentRabType}')" style="background: none; border: none; cursor: pointer; color: var(--color-primary);" title="Edit Uang Sisa">✏️</button>
                </div>`;

appJs = appJs.replace(uangSisaRegex, newUangSisaHtml);

const editUangSisaFunc = `
window.editUangSisa = function(type) {
  const container = document.getElementById(\`uang-sisa-container-\${type}\`);
  if (!container) return;
  const currentVal = rabSettingData[type] || 0;
  container.innerHTML = \`
    <span style="color: var(--text-secondary);">Rp</span>
    <input type="number" id="uang-sisa-\${type}" class="select-control" style="width: 120px; padding: 0.25rem; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); color: var(--color-warning); font-weight: bold; font-size: 1rem; text-align: right;" value="\${currentVal}">
    <button onclick="saveUangSisa('\${type}')" style="background: var(--color-success); border: none; border-radius: 4px; color: white; padding: 0.25rem 0.5rem; cursor: pointer; font-size: 0.9rem;">Simpan</button>
  \`;
};
`;

if (!appJs.includes('window.editUangSisa = function')) {
  appJs = appJs.replace('async function saveUangSisa', editUangSisaFunc + '\nasync function saveUangSisa');
}

// f) Update saveUangSisa to call renderRab
if (appJs.includes('rabSettingData[type] = uangSisa;')) {
  if (!appJs.includes('rabSettingData[type] = uangSisa;\n    renderRab();')) {
     appJs = appJs.replace('rabSettingData[type] = uangSisa;', 'rabSettingData[type] = uangSisa;\n    renderRab();');
  }
}


fs.writeFileSync('public/app.js', appJs);
console.log('UI updates complete!');
