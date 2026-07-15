// Data Anggota dan Tim
const TEAMS = {
  'TIM A': ['Zii', 'Mey', 'Hani'],
  'TIM B': ['Tian', 'Ananda', 'Firzan'],
  'TIM C': ['Cio', 'Naila', 'Valen'],
  'TIM D': ['Fay', 'Nanda']
};

const TASKS = [
  'Masak & Belanja',  // Indeks 0
  'Cuci Alat Alat Masak',      // Indeks 1
  'Bersih-Bersih Posko', // Indeks 2
  'Piket Balai Desa'             // Indeks 3
];

// Jadwal tetap berdasarkan hari
const FIXED_SCHEDULE_BY_DAY = {
  'Senin':  { 'Masak & Belanja': 'TIM A', 'Cuci Alat Alat Masak': 'TIM B', 'Bersih-Bersih Posko': 'TIM C', 'Piket Balai Desa': 'TIM D' },
  'Selasa': { 'Masak & Belanja': 'TIM B', 'Cuci Alat Alat Masak': 'TIM C', 'Bersih-Bersih Posko': 'TIM D', 'Piket Balai Desa': 'TIM A' },
  'Rabu':   { 'Masak & Belanja': 'TIM C', 'Cuci Alat Alat Masak': 'TIM D', 'Bersih-Bersih Posko': 'TIM A', 'Piket Balai Desa': 'TIM B' },
  'Kamis':  { 'Masak & Belanja': 'TIM D', 'Cuci Alat Alat Masak': 'TIM A', 'Bersih-Bersih Posko': 'TIM B', 'Piket Balai Desa': 'TIM C' },
  'Jumat':  { 'Masak & Belanja': 'TIM A', 'Cuci Alat Alat Masak': 'TIM B', 'Bersih-Bersih Posko': 'TIM C', 'Piket Balai Desa': 'TIM D' },
  'Sabtu':  { 'Masak & Belanja': 'TIM B', 'Cuci Alat Alat Masak': 'TIM C', 'Bersih-Bersih Posko': 'TIM D', 'Piket Balai Desa': 'TIM A' },
  'Minggu': { 'Masak & Belanja': 'TIM C', 'Cuci Alat Alat Masak': 'TIM D', 'Bersih-Bersih Posko': 'TIM A', 'Piket Balai Desa': 'TIM B' }
};

// Epoch tanggal acuan: Kamis, 9 Juli 2026 (WIB / GMT+7)
const EPOCH_DATE_STR = '2026-07-09';

/**
 * Mendapatkan selisih hari dari Epoch (9 Juli 2026) dalam WIB
 * @param {string} dateStr Format YYYY-MM-DD
 * @returns {number} Selisih hari
 */
function getDaysSinceEpoch(dateStr) {
  const epoch = new Date(`${EPOCH_DATE_STR}T00:00:00+07:00`);
  const target = new Date(`${dateStr}T00:00:00+07:00`);
  
  const diffTime = target.getTime() - epoch.getTime();
  // Bulatkan untuk menghindari masalah presisi milidetik
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Menghitung jadwal piket harian dan mingguan untuk tanggal tertentu
 * @param {string} dateStr Format YYYY-MM-DD (Default: Hari ini dalam WIB)
 */
function calculateSchedule(dateStr) {
  // Jika tidak diberikan dateStr, gunakan tanggal hari ini dalam timezone Asia/Jakarta (WIB)
  if (!dateStr) {
    const jktDate = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
    const d = new Date(jktDate);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    dateStr = `${yyyy}-${mm}-${dd}`;
  }

  let daysSinceEpoch = getDaysSinceEpoch(dateStr);

  // Jika tanggal sebelum 9 Juli (Hari Ke-0), paksa gunakan jadwal hari pertama (9 Juli)
  if (daysSinceEpoch < 0) {
    daysSinceEpoch = 0;
  }

  // Dapatkan nama hari dalam bahasa Indonesia
  const daysIndonesian = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  // Gunakan getUTCDay() pada jam 12 siang UTC agar aman dari perbedaan zona waktu server (Heroku vs Lokal)
  const targetDate = new Date(`${dateStr}T12:00:00Z`);
  const dayNameIndo = daysIndonesian[targetDate.getUTCDay()];

  // 1. Hitung Tugas Harian Tim (Fix per Hari)
  const dailySchedule = {};
  const daySchedule = FIXED_SCHEDULE_BY_DAY[dayNameIndo];
  
  // Reverse mapping: from task->Team to Team->Task
  const teamToTask = {};
  if (daySchedule) {
    for (const [task, team] of Object.entries(daySchedule)) {
      teamToTask[team] = task;
    }
  }

  Object.keys(TEAMS).forEach(teamName => {
    dailySchedule[teamName] = {
      task: teamToTask[teamName] || 'Piket Balai Desa',
      members: TEAMS[teamName]
    };
  });

  // 2. Hitung Piket Kamar Mandi (Rotasi Mingguan)
  // 1 Minggu = 7 Hari
  const weeksSinceEpoch = Math.floor(daysSinceEpoch / 7);

  let weekIndex = weeksSinceEpoch % 4;
  if (weekIndex < 0) {
    weekIndex += 4;
  }
  
  const bathroomTeamList = ['TIM A', 'TIM B', 'TIM C', 'TIM D'];
  const bathroomPiketTeam = bathroomTeamList[weekIndex];

  // 3. Hitung Jadwal Piket TPQ (Dinamis)
  const tpqEpoch = new Date('2026-07-06T00:00:00+07:00');
  const targetDateTpq = new Date(`${dateStr}T00:00:00+07:00`);
  const diffTimeTpq = targetDateTpq.getTime() - tpqEpoch.getTime();
  const diffDaysTpq = Math.round(diffTimeTpq / (1000 * 60 * 60 * 24));
  const tpqWeekIndex = Math.floor(diffDaysTpq / 7); 
  const mod = (n, m) => ((n % m) + m) % m;

  const groups = [
    'Mey, Fay, Zii',
    'Naila, Cio, Valen',
    'Ananda, Tian, Hani'
  ];
  // Firzan and Zahra backwards rotation
  const fz_seq = ['Firzan', 'Zahra', ''];

  const tpqSchedule = {};
  const days = ['Senin', 'Selasa', 'Rabu'];
  
  for (let i = 0; i < 3; i++) {
    const mainGroupIndex = mod(i - mod(tpqWeekIndex, 3), 3);
    const fzIndex = mod(i + mod(tpqWeekIndex, 3), 3);
    
    let members = groups[mainGroupIndex];
    if (fz_seq[fzIndex]) {
      members += ', ' + fz_seq[fzIndex];
    }
    tpqSchedule[days[i]] = members;
  }
  tpqSchedule['Kamis'] = 'Semuanya';

  return {
    date: dateStr,
    tpqSchedule,
    dayName: dayNameIndo,
    daysSinceEpoch,
    weeksSinceEpoch: weeksSinceEpoch + 1, // Agar mulai dari minggu ke-1
    dailySchedule,
    bathroomPiket: {
      team: bathroomPiketTeam,
      members: TEAMS[bathroomPiketTeam]
    }
  };
}

module.exports = {
  calculateSchedule,
  TEAMS,
  TASKS
};
