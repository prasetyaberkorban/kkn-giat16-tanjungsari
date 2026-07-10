const { calculateSchedule } = require('./src/utils/scheduleCalculator');
console.log(JSON.stringify(calculateSchedule('2026-07-10'), null, 2));
