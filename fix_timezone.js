const fs = require('fs');
let scheduleCalc = fs.readFileSync('src/utils/scheduleCalculator.js', 'utf8');

// Replace targetDate.getDay() with a timezone-safe approach
const oldLogic = `  const daysIndonesian = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const targetDate = new Date(\`\${dateStr}T00:00:00+07:00\`);
  const dayNameIndo = daysIndonesian[targetDate.getDay()];`;

const newLogic = `  const daysIndonesian = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  // Gunakan getUTCDay() pada jam 12 siang UTC agar aman dari perbedaan zona waktu server (Heroku vs Lokal)
  const targetDate = new Date(\`\${dateStr}T12:00:00Z\`);
  const dayNameIndo = daysIndonesian[targetDate.getUTCDay()];`;

if (scheduleCalc.includes(oldLogic)) {
  scheduleCalc = scheduleCalc.replace(oldLogic, newLogic);
  fs.writeFileSync('src/utils/scheduleCalculator.js', scheduleCalc);
  console.log('Fixed timezone bug in scheduleCalculator.js');
} else {
  console.log('Could not find old logic in scheduleCalculator.js');
}
