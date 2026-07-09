const fs = require('fs');
let content = fs.readFileSync('public/app.js', 'utf8');

// Fix 1: Change 'rab-type-filters' to 'rab-type-selector'
content = content.replace("document.getElementById('rab-type-filters')", "document.getElementById('rab-type-selector')");

// Fix 2: Change await fetchCashflow() to await fetchRab()
content = content.replace(/await fetchCashflow\(\);/g, "await fetchRab();");

// Fix 3: Remove the override fetchRab block at the end
const overrideBlock = `// Override initial load to fetch cashflow
const _originalFetchRab = fetchRab;
fetchRab = async function() {
  await _originalFetchRab();
  await fetchRab();
};`;

content = content.replace(overrideBlock, "");

fs.writeFileSync('public/app.js', content);
console.log('Fixed app.js successfully!');
