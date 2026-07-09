const fs = require('fs');
let content = fs.readFileSync('public/app.js', 'utf8');

// Replace Aksi buttons
content = content.replace(/<button class="edit-btn"[^>]*onclick="openEditRabModal\('\$\{item\._id\}'\)".*?<\/button>/g, match => {
  return match + '\n              <button class="toggle-calc-btn" style="background: none; border: none; color: ${item.isAutoCalc === false ? \'#f59e0b\' : \'#10b981\'}; cursor: pointer; font-size: 1.15rem; padding: 0.25rem;" onclick="toggleRabAutoCalc(\'${item._id}\', ${item.isAutoCalc !== false})" title="Mode: ${item.isAutoCalc === false ? \'Manual\' : \'Otomatis\'}">🔄</button>';
});

// Insert Uang Sisa in tfoot
content = content.replace(/<\/tfoot>/g, match => {
  return `  <tr style="background: rgba(245, 158, 11, 0.1); font-weight: bold;">
            <td colspan="100%" style="text-align: right; color: #fff; font-size: 1rem; padding: 1rem;">
              <div style="display: flex; justify-content: flex-end; align-items: center; gap: 1rem;">
                Uang Sisa:
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <span style="color: var(--text-secondary);">Rp</span>
                  <input type="number" id="uang-sisa-\${currentRabType}" class="select-control" style="width: 150px; padding: 0.5rem; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); color: var(--color-warning); font-weight: bold; font-size: 1.1rem; text-align: right;" value="\${rabSettingData[currentRabType] || 0}" onchange="saveUangSisa('\${currentRabType}')">
                </div>
              </div>
            </td>
          </tr>
        ` + match;
});

fs.writeFileSync('public/app.js', content);
console.log('Updated app.js successfully');
