// Data Anggota dan Tim
const TEAMS = {
  'TIM A': ['Zii', 'Mey', 'Hani'],
  'TIM B': ['Tian', 'Ananda', 'Firzan'],
  'TIM C': ['Cio', 'Naila', 'Valen'],
  'TIM D': ['Fay', 'Nanda']
};

const TASKS = [
  'Masak & Belanja',  // Indeks 0
  'Cuci Piring',      // Indeks 1
  'Bersih-Bersih Posko', // Indeks 2
  'Libur'             // Indeks 3
];

// Offset untuk masing-masing tim agar mencocokkan jadwal hari Kamis, 9 Juli 2026 (d = 0)
// Di mana: TIM D = Masak (0), TIM A = Cuci Piring (1), TIM B = Bersih-bersih (2), TIM C = Libur (3)
const TEAM_OFFSETS = {
  'TIM D': 0,
  'TIM A': 1,
  'TIM B': 2,
  'TIM C': 3
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

  // 1. Hitung Tugas Harian Tim
  const dailySchedule = {};
  Object.keys(TEAMS).forEach(teamName => {
    const offset = TEAM_OFFSETS[teamName];
    // Formula rotasi: (offset - daysSinceEpoch) % 4
    let taskIndex = (offset - daysSinceEpoch) % 4;
    if (taskIndex < 0) {
      taskIndex += 4;
    }
    
    dailySchedule[teamName] = {
      task: TASKS[taskIndex],
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

  // Dapatkan nama hari dalam bahasa Indonesia
  const daysIndonesian = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const targetDate = new Date(`${dateStr}T00:00:00+07:00`);
  const dayNameIndo = daysIndonesian[targetDate.getDay()];

  return {
    date: dateStr,
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
