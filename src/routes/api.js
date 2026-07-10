const express = require('express');
const router = express.Router();
const { calculateSchedule, TEAMS } = require('../utils/scheduleCalculator');
const Attendance = require('../models/Attendance');
const TaskCompletion = require('../models/TaskCompletion');
const Goods = require('../models/Goods');
const ScheduleOverride = require('../models/ScheduleOverride');
const { appendAttendanceToSheet, exportAllDataToSheets } = require('../services/googleSheets');
const Joblist = require('../models/Joblist');
const ContentList = require('../models/ContentList');
const ProgramKerja = require('../models/ProgramKerja');
const Cashflow = require('../models/Cashflow');
const QrSetting = require('../models/QrSetting');
const Rab = require('../models/Rab');

// Pemetaan nama anggota ke divisi masing-masing
const memberDivisions = {
  'Tian': 'Ketua',
  'Naila': 'Sekretaris',
  'Valen': 'Bendahara',
  'Mey': 'Acara',
  'Fay': 'Acara',
  'Ananda': 'Humas',
  'Hani': 'Humas',
  'Firzan': 'Logistik',
  'Cio': 'Logistik',
  'Nanda': 'PDD',
  'Zii': 'PDD'
};

// Helper untuk mendapatkan jadwal piket dengan mempertimbangkan override kustom dari admin
async function getScheduleForDate(date) {
  let schedule = calculateSchedule(date);
  try {
    const override = await ScheduleOverride.findOne({ date });
    if (override) {
      if (override.dailySchedule) {
        for (const [teamName, task] of Object.entries(override.dailySchedule)) {
          if (schedule.dailySchedule[teamName]) {
            schedule.dailySchedule[teamName].task = task;
          }
        }
      }
      if (override.bathroomPiketTeam) {
        schedule.bathroomPiket.team = override.bathroomPiketTeam;
        schedule.bathroomPiket.members = TEAMS[override.bathroomPiketTeam] || [];
      }
    }
  } catch (err) {
    console.error('Error fetching schedule override:', err);
  }
  return schedule;
}

// Helper untuk mendapatkan tanggal hari ini dalam format YYYY-MM-DD (WIB)
function getTodayDateIndo() {
  const jktDate = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
  const d = new Date(jktDate);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

  return todayStr;
}

// Helper untuk mendapatkan jam saat ini dalam format HH:MM:SS (WIB)
function getNowTimeIndo() {
  const jktTime = new Date().toLocaleTimeString('en-US', { 
    timeZone: 'Asia/Jakarta', 
    hour12: false 
  });
  return jktTime;
}

/**
 * @route   GET /api/schedule
 * @desc    Mendapatkan jadwal piket harian dan mingguan
 */
router.get('/schedule', async (req, res) => {
  try {
    const date = req.query.date || getTodayDateIndo();
    const schedule = await getScheduleForDate(date);

    // Dapatkan IP lokal komputer server untuk kemudahan pengetesan QR Code lokal
    const os = require('os');
    const networkInterfaces = os.networkInterfaces();
    let localIp = 'localhost';
    
    // Cari IP IPv4 non-internal (seperti 192.168.x.x atau 10.x.x.x)
    for (const interfaceName in networkInterfaces) {
      const interfaces = networkInterfaces[interfaceName];
      for (const iface of interfaces) {
        if ((iface.family === 'IPv4' || iface.family === 4) && !iface.internal) {
          localIp = iface.address;
          break;
        }
      }
    }
    
    schedule.localIp = localIp;
    res.json(schedule);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/attendance/today
 * @desc    Mendapatkan daftar kehadiran hari ini
 */
router.get('/attendance/today', async (req, res) => {
  try {
    const date = req.query.date || getTodayDateIndo();
    const attendances = await Attendance.find({ date });
    const formatted = attendances.map(item => {
      const doc = item.toObject();
      if (!doc.division) {
        doc.division = memberDivisions[doc.name] || '-';
      }
      return doc;
    });
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/attendance
 * @desc    Melakukan absensi kehadiran
 */

/**
 * @route   POST /api/attendance/manual
 * @desc    Admin menambah absensi manual
 */
router.post('/attendance/manual', async (req, res) => {
  const { name, status } = req.body;
  if (!name) return res.status(400).json({ error: 'Nama harus diisi.' });
  
  try {
    const date = getTodayDateIndo();
    const time = getNowTimeIndo();
    const schedule = await getScheduleForDate(date);
    
    // Temukan tim anggota ini
    let userTeam = '-';
    for (const [tName, members] of Object.entries(TEAMS)) {
      if (members.includes(name)) {
        userTeam = tName;
        break;
      }
    }

    const teamSchedule = schedule.dailySchedule[userTeam];
    const task = teamSchedule ? teamSchedule.task : 'Libur';

    const attendance = new Attendance({
      name,
      division: memberDivisions[name] || '-',
      team: userTeam,
      date,
      time,
      dayName: schedule.dayName,
      task,
      status: status || 'Hadir'
    });

    const savedAttendance = await attendance.save();
    appendAttendanceToSheet(savedAttendance);

    res.status(201).json({ message: 'Kehadiran manual berhasil disimpan!', data: savedAttendance });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Anggota tersebut sudah diabsen hari ini.' });
    }
    res.status(500).json({ error: error.message });
  }
});

router.post('/attendance', async (req, res) => {
  const { name } = req.body;
  const qrParam = req.body.qr || req.query.qr;
  const date = req.body.date || getTodayDateIndo();

  if (!name) {
    return res.status(400).json({ error: 'Nama harus diisi.' });
  }

  try {
    // 0. Validasi QR Code aktif
    let activeSetting = await QrSetting.findOne({ key: 'active_qr' });
    if (!activeSetting) {
      activeSetting = new QrSetting({ key: 'active_qr', value: 1 });
      await activeSetting.save();
    }

    const clientQr = parseInt(qrParam, 10);
    if (isNaN(clientQr) || clientQr !== activeSetting.value) {
      return res.status(400).json({ error: 'Kode QR sudah tidak aktif. Silakan scan kode QR terbaru di layar posko!' });
    }
    // 1. Cari tim dari anggota tersebut
    let userTeam = null;
    for (const [teamName, members] of Object.entries(TEAMS)) {
      if (members.includes(name)) {
        userTeam = teamName;
        break;
      }
    }

    if (!userTeam) {
      return res.status(404).json({ error: `Anggota dengan nama '${name}' tidak terdaftar dalam tim.` });
    }

    // 2. Cek apakah yang bersangkutan sudah absen hari ini
    const existingAttendance = await Attendance.findOne({ name, date });
    if (existingAttendance) {
      return res.status(400).json({ error: `Anda (${name}) sudah melakukan absensi hari ini.` });
    }

    // 3. Hitung jadwal hari ini untuk menentukan tugas
    const schedule = await getScheduleForDate(date);
    const dayName = schedule.dayName;
    
    // Dapatkan tugas spesifik untuk tim user hari ini
    // (Jika timnya tidak ada di jadwal harian hari ini, default ke 'Libur')
    const teamSchedule = schedule.dailySchedule[userTeam];
    const task = teamSchedule ? teamSchedule.task : 'Libur';

    // Dapatkan waktu absensi saat ini (WIB)
    const time = getNowTimeIndo();

    // 4. Simpan ke MongoDB
    const attendance = new Attendance({
      name,
      division: memberDivisions[name] || '-',
      team: userTeam,
      date,
      time,
      dayName,
      task,
      status: 'Hadir'
    });

    const savedAttendance = await attendance.save();

    // 5. Cadangkan ke Google Spreadsheet (Async, tidak memblokir response backend)
    // Menghindari delay response ke user
    appendAttendanceToSheet(savedAttendance);

    res.status(201).json({
      message: 'Absensi berhasil dikonfirmasi!',
      data: savedAttendance
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Anda sudah melakukan absensi hari ini.' });
    }
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/admin/login
 * @desc    Login Admin
 */
router.post('/admin/login', (req, res) => {
  const { password } = req.body;
  
  if (password === 'giat16tj') {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, error: 'Password salah!' });
  }
});

/**
 * @route   GET /api/attendance/all
 * @desc    Mengambil semua riwayat absensi
 */
router.get('/attendance/all', async (req, res) => {
  try {
    const attendances = await Attendance.find({}).sort({ date: -1, time: -1 });
    const formatted = attendances.map(item => {
      const doc = item.toObject();
      if (!doc.division) {
        doc.division = memberDivisions[doc.name] || '-';
      }
      return doc;
    });
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/tasks/completion
 * @desc    Mengambil status checklist penyelesaian tugas hari ini
 */
router.get('/tasks/completion', async (req, res) => {
  try {
    const date = req.query.date || getTodayDateIndo();
    const completions = await TaskCompletion.find({ date });
    res.json(completions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/tasks/completion
 * @desc    Menyimpan/Memperbarui status penyelesaian tugas (checklist harian)
 */
router.post('/tasks/completion', async (req, res) => {
  const { name, task, completed } = req.body;
  const date = req.body.date || getTodayDateIndo();

  if (!name || !task) {
    return res.status(400).json({ error: 'Nama dan tugas wajib diisi.' });
  }

  try {
    if (completed) {
      // Menyimpan atau memperbarui data penyelesaian tugas (jika belum ada, buat baru)
      const completion = await TaskCompletion.findOneAndUpdate(
        { name, task, date },
        { completed: true, completedAt: new Date() },
        { upsert: true, new: true }
      );
      res.json({ message: 'Tugas ditandai selesai!', data: completion });
    } else {
      // Hapus jika status completed = false (ditandai belum selesai)
      await TaskCompletion.findOneAndDelete({ name, task, date });
      res.json({ message: 'Tugas ditandai belum selesai!' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ================= ROUTE BARANG BAWAAN (INVENTARIS) =================

// Seed data jika database kosong
const DEFAULT_GOODS = [
  // Pribadi - Pakaian
  { type: 'pribadi', category: 'Pakaian', name: 'Baju/kaos harian', note: 'Jumlah disesuaikan dengan kebutuhan masing-masing' },
  { type: 'pribadi', category: 'Pakaian', name: 'Baju Formal', note: 'Jumlah disesuaikan dengan kebutuhan masing-masing' },
  { type: 'pribadi', category: 'Pakaian', name: 'Celana Panjang', note: 'Jumlah disesuaikan dengan kebutuhan masing-masing' },
  { type: 'pribadi', category: 'Pakaian', name: 'Celana Santai', note: 'Jumlah disesuaikan dengan kebutuhan masing-masing' },
  { type: 'pribadi', category: 'Pakaian', name: 'Jaket/Hoodie', note: '1 Pcs' },
  { type: 'pribadi', category: 'Pakaian', name: 'Pakaian dalam', note: 'Jumlah disesuaikan dengan kebutuhan masing-masing' },
  { type: 'pribadi', category: 'Pakaian', name: 'Kaos kaki', note: 'Jumlah disesuaikan dengan kebutuhan masing-masing' },
  { type: 'pribadi', category: 'Pakaian', name: 'Topi/Topi mahesa/Topi UNNES', note: 'Topi bebas' },
  { type: 'pribadi', category: 'Pakaian', name: 'Sandal & Sepatu', note: 'Jumlah disesuaikan dengan kebutuhan masing-masing' },
  { type: 'pribadi', category: 'Pakaian', name: 'Jas hujan', note: '1 Pcs' },
  { type: 'pribadi', category: 'Pakaian', name: 'Ikat pinggang (opsional)', note: 'Bila perlu' },
  { type: 'pribadi', category: 'Pakaian', name: 'Almet', note: 'WAJIB' },
  { type: 'pribadi', category: 'Pakaian', name: 'Vest + ID CARD', note: 'WAJIB' },

  // Pribadi - Mandi
  { type: 'pribadi', category: 'Mandi', name: 'Sikat gigi', note: 'Jumlah disesuaikan dengan kebutuhan masing-masing' },
  { type: 'pribadi', category: 'Mandi', name: 'Pasta gigi', note: 'Jumlah disesuaikan dengan kebutuhan masing-masing' },
  { type: 'pribadi', category: 'Mandi', name: 'Sampo', note: 'Jumlah disesuaikan dengan kebutuhan masing-masing' },
  { type: 'pribadi', category: 'Mandi', name: 'Handuk', note: 'Jumlah disesuaikan dengan kebutuhan masing-masing' },
  { type: 'pribadi', category: 'Mandi', name: 'Sabun Mandi', note: 'Jumlah disesuaikan dengan kebutuhan masing-masing' },
  { type: 'pribadi', category: 'Mandi', name: 'Sisir', note: 'Jumlah disesuaikan dengan kebutuhan masing-masing' },
  { type: 'pribadi', category: 'Mandi', name: 'Deodoran', note: 'Jumlah disesuaikan dengan kebutuhan masing-masing' },
  { type: 'pribadi', category: 'Mandi', name: 'Facial Wash', note: 'Jumlah disesuaikan dengan kebutuhan masing-masing' },
  { type: 'pribadi', category: 'Mandi', name: 'Skincare (Opsional)', note: 'Jumlah disesuaikan dengan kebutuhan masing-masing' },
  { type: 'pribadi', category: 'Mandi', name: 'Sunscreen (Opsional)', note: 'Jumlah disesuaikan dengan kebutuhan masing-masing' },
  { type: 'pribadi', category: 'Mandi', name: 'Tisu basah (Opsional)', note: 'Jumlah disesuaikan dengan kebutuhan masing-masing' },
  { type: 'pribadi', category: 'Mandi', name: 'Tisu kering', note: 'Jumlah disesuaikan dengan kebutuhan masing-masing' },

  // Pribadi - Kerja
  { type: 'pribadi', category: 'Kerja', name: 'Laptop', note: '1 Unit' },
  { type: 'pribadi', category: 'Kerja', name: 'Charger laptop', note: '1 Unit' },
  { type: 'pribadi', category: 'Kerja', name: 'Mouse (Opsional)', note: 'Bila perlu' },
  { type: 'pribadi', category: 'Kerja', name: 'Handphone (pasti bawa ini mah)', note: '1 Unit' },
  { type: 'pribadi', category: 'Kerja', name: 'Charger HP', note: '1 Unit' },
  { type: 'pribadi', category: 'Kerja', name: 'Power bank (Opsional)', note: 'Bila perlu' },
  { type: 'pribadi', category: 'Kerja', name: 'Buku catatan (Opsional)', note: 'Bila perlu' },
  { type: 'pribadi', category: 'Kerja', name: 'Stop kontak (Opsional)', note: 'Bila perlu' },
  { type: 'pribadi', category: 'Kerja', name: 'Earphone/TWS (Opsional)', note: 'Bila perlu' },

  // Pribadi - Tidur
  { type: 'pribadi', category: 'Tidur', name: 'Bantal & Guling', note: '1 aja/disesuaikan dengan kebutuhan' },
  { type: 'pribadi', category: 'Tidur', name: 'Selimut', note: '1 aja/disesuaikan dengan kebutuhan' },
  { type: 'pribadi', category: 'Tidur', name: 'Matras/alas tidur', note: '1 aja/disesuaikan dengan kebutuhan' },
  { type: 'pribadi', category: 'Tidur', name: 'Soffel anti nyamuk (Opsional)', note: 'Bila perlu' },

  // Pribadi - Lain-Lain
  { type: 'pribadi', category: 'Lain-Lain', name: 'Koper (Opsional)', note: 'Bila perlu' },
  { type: 'pribadi', category: 'Lain-Lain', name: 'Tas ransel', note: '1 Pcs' },
  { type: 'pribadi', category: 'Lain-Lain', name: 'Travel bag (Opsional)', note: 'Bila perlu' },
  { type: 'pribadi', category: 'Lain-Lain', name: 'Botol minum', note: '1 Pcs' },
  { type: 'pribadi', category: 'Lain-Lain', name: 'Payung (Opsional)', note: 'Bila perlu' },
  { type: 'pribadi', category: 'Lain-Lain', name: 'Totebag', note: '1 Pcs' },
  { type: 'pribadi', category: 'Lain-Lain', name: 'Alat makan pribadi', note: 'minimal bawa 1 ya, piring & sendok' },
  { type: 'pribadi', category: 'Lain-Lain', name: 'Kantong Plastik', note: 'plastik bekas gpp, nanti misal butuh buat tempat sampah' },
  { type: 'pribadi', category: 'Lain-Lain', name: 'Hanger', note: 'Disesuaikan dengan kebutuhan masing-masing' },
  { type: 'pribadi', category: 'Lain-Lain', name: 'Ember', note: 'Disesuaikan dengan kebutuhan masing-masing' },
  { type: 'pribadi', category: 'Lain-Lain', name: 'Detergen', note: 'Disesuaikan dengan kebutuhan masing-masing' },
  { type: 'pribadi', category: 'Lain-Lain', name: 'Pewangi pakaian', note: 'Disesuaikan dengan kebutuhan masing-masing' },
  { type: 'pribadi', category: 'Lain-Lain', name: 'Jam tangan (Opsional)', note: 'Bila perlu' },
  { type: 'pribadi', category: 'Lain-Lain', name: 'Obat Pribadi', note: 'Wajib ya INIII' },
  { type: 'pribadi', category: 'Lain-Lain', name: 'Dompet + UANG CASH', note: 'Cash penting ya mengingat disana agak jauh atmnya' },
  { type: 'pribadi', category: 'Lain-Lain', name: 'Identitas (KTP, KTM, dll)', note: 'Wajib ya INIII' },
  { type: 'pribadi', category: 'Lain-Lain', name: 'Masker', note: 'Bila perlu' },

  // Kelompok - Bersama
  { type: 'kelompok', category: 'Kelompok', name: 'Tikar', qty: '1+', note: '-', pj: '-' },
  { type: 'kelompok', category: 'Kelompok', name: 'Magicom', qty: '2/3', note: 'Disesuaikan kondisi di posko', pj: '-' },
  { type: 'kelompok', category: 'Kelompok', name: 'Beras', qty: '1 KG', note: 'Tiap anak bawa 1 KG ya nanti waktu berangkat', pj: '-' },
  { type: 'kelompok', category: 'Kelompok', name: 'Galon air', qty: '1+', note: '-', pj: '-' },
  { type: 'kelompok', category: 'Kelompok', name: 'Pompa air galon', qty: '1+', note: 'ang punya dibawab yaa, disesuaikan dengan kondisi posko', pj: '-' },
  { type: 'kelompok', category: 'Kelompok', name: 'Sapu', qty: '1', note: '-', pj: '-' },
  { type: 'kelompok', category: 'Kelompok', name: 'Ember', qty: '1', note: '-', pj: '-' },
  { type: 'kelompok', category: 'Kelompok', name: 'Pel lantai', qty: '1', note: '-', pj: '-' },
  { type: 'kelompok', category: 'Kelompok', name: 'Cairan Pembersih Lantai', qty: '1', note: '-', pj: 'Mei' },
  { type: 'kelompok', category: 'Kelompok', name: 'Sabun + spons cuci piring', qty: '1', note: '-', pj: 'Mei' },
  { type: 'kelompok', category: 'Kelompok', name: 'Kipas angin', qty: '1+', note: '-', pj: 'Naila (1) Mei(1)' },
  { type: 'kelompok', category: 'Kelompok', name: 'Terminal/kabel roll', qty: '1+', note: '-', pj: 'Ananda (1) Mei (1)' },
  { type: 'kelompok', category: 'Kelompok', name: 'Sound portable', qty: '1', note: 'yang punya dibawa yaa', pj: '-' },
  { type: 'kelompok', category: 'Kelompok', name: 'Mikrofon wireless/kabel', qty: '1', note: 'yang punya dibawa yaa', pj: '-' }
];

// GET: Ambil semua barang bawaan
router.get('/goods', async (req, res) => {
  try {
    let list = await Goods.find();
    if (list.length === 0) {
      // Seed default data
      await Goods.insertMany(DEFAULT_GOODS);
      list = await Goods.find();
    }
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST: Tambah barang baru
router.post('/goods', async (req, res) => {
  const { name, category, type, note, pj, qty } = req.body;
  if (!name || !category || !type) {
    return res.status(400).json({ error: 'Nama, kategori, dan tipe wajib diisi.' });
  }

  try {
    const item = new Goods({ name, category, type, note, pj, qty });
    await item.save();
    res.status(201).json({ message: 'Barang berhasil ditambahkan!', data: item });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT: Update barang berdasarkan ID
router.put('/goods/:id', async (req, res) => {
  const { id } = req.params;
  const { name, category, type, note, pj, qty } = req.body;

  try {
    const updated = await Goods.findByIdAndUpdate(
      id,
      { name, category, type, note, pj, qty },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ error: 'Barang tidak ditemukan.' });
    }

    res.json({ message: 'Barang berhasil diperbarui!', data: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE: Hapus barang berdasarkan ID
router.delete('/goods/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = await Goods.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Barang tidak ditemukan.' });
    }
    res.json({ message: 'Barang berhasil dihapus!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ================= OVERRIDES JADWAL (ADMIN ONLY) ================= */

// GET: Ambil override jadwal untuk tanggal tertentu (jika ada)
router.get('/schedule/override/:date', async (req, res) => {
  const { date } = req.params;
  try {
    const override = await ScheduleOverride.findOne({ date });
    res.json(override || { date, dailySchedule: {}, bathroomPiketTeam: '' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST: Simpan atau perbarui override jadwal
router.post('/schedule/override', async (req, res) => {
  const { date, dailySchedule, bathroomPiketTeam } = req.body;
  if (!date) {
    return res.status(400).json({ error: 'Tanggal wajib diisi.' });
  }

  try {
    const override = await ScheduleOverride.findOneAndUpdate(
      { date },
      { dailySchedule, bathroomPiketTeam },
      { upsert: true, new: true }
    );
    res.json({ message: 'Jadwal berhasil disesuaikan!', data: override });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE: Hapus override jadwal (reset ke default)
router.delete('/schedule/override/:date', async (req, res) => {
  const { date } = req.params;
  try {
    await ScheduleOverride.findOneAndDelete({ date });
    res.json({ message: 'Jadwal berhasil dikembalikan ke pengaturan default!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ================= MANAJEMEN RIWAYAT DAFTAR HADIR (ADMIN ONLY) ================= */

// PUT: Perbarui status atau data riwayat kehadiran anggota
router.put('/attendance/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const updated = await Attendance.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ error: 'Data absensi tidak ditemukan.' });
    }
    res.json({ message: 'Data absensi berhasil diperbarui!', data: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE: Hapus data absensi anggota
router.delete('/attendance/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = await Attendance.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Data absensi tidak ditemukan.' });
    }
    res.json({ message: 'Data absensi berhasil dihapus!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ================= ROUTE JOBLIST DIVISI (BISA DIAKSES SEMUA ORANG) ================= */

const DEFAULT_JOBLIST = [
  { division: 'Sekretaris', taskName: 'Membuat jadwal piket', note: '', dueDate: '2026-07-06', status: 'COMPLETED', progressInfo: '' },
  { division: 'Sekretaris', taskName: 'Membuat absensi', note: '', dueDate: '2026-07-08', status: 'IN PROGRES', progressInfo: '' },
  { division: 'Sekretaris', taskName: 'Administrasi', note: '', dueDate: '2026-07-10', status: 'IN PROGRES', progressInfo: '' },
  { division: 'Bendahara', taskName: 'Membuat RAB KKN', note: '', dueDate: '2026-07-07', status: 'IN PROGRES', progressInfo: '' },
  { division: 'Bendahara', taskName: 'Mencari vendor atribut KKN', note: '', dueDate: '2026-06-28', status: 'COMPLETED', progressInfo: '' },
  { division: 'Acara', taskName: 'Membuat rundown survey lokasi', note: 'survey lokasi KKN', dueDate: '2026-07-01', status: 'COMPLETED', progressInfo: '' },
  { division: 'Humas', taskName: 'Membuat Caption CS', note: '', dueDate: '2026-07-07', status: 'COMPLETED', progressInfo: '' },
  { division: 'Humas', taskName: 'Membuat Caption tentang Desa', note: '', dueDate: '2026-07-07', status: 'COMPLETED', progressInfo: '' },
  { division: 'Humas', taskName: 'Membuat Caption lokasi desa', note: '', dueDate: '2026-07-07', status: 'COMPLETED', progressInfo: '' },
  { division: 'Humas', taskName: 'Membuat rilis logo', note: '', dueDate: '2026-07-07', status: 'COMPLETED', progressInfo: '' },
  { division: 'Humas', taskName: 'Membuat caption organigram', note: '', dueDate: '2026-07-07', status: 'IN PROGRES', progressInfo: '' },
  { division: 'Logistik', taskName: 'Menyusun dan mendata Equipment list', note: '', dueDate: '2026-07-07', status: 'IN PROGRES', progressInfo: '' },
  { division: 'Logistik', taskName: 'Mencari Transportasi Pick', note: 'Untuk mengangkut barang', dueDate: '2026-07-08', status: 'COMPLETED', progressInfo: 'Sudah DP, ready tanggal 9 juli 2026' },
  { division: 'Logistik', taskName: 'Cetak MMT posko', note: '', dueDate: '2026-07-07', status: 'COMPLETED', progressInfo: 'Sudah dicetak' },
  { division: 'PDD', taskName: 'Membuat desain logo, vest, lanyard dll', note: '', dueDate: '2026-06-28', status: 'COMPLETED', progressInfo: '' },
  { division: 'PDD', taskName: 'Membuat desain banner KKN', note: '', dueDate: '2026-07-01', status: 'IN PROGRES', progressInfo: '' }
];

// GET: Ambil semua data joblist (auto seed jika kosong)
router.get('/joblist', async (req, res) => {
  try {
    let list = await Joblist.find({});
    if (list.length === 0) {
      await Joblist.insertMany(DEFAULT_JOBLIST);
      list = await Joblist.find({});
    }
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST: Tambah joblist baru
router.post('/joblist', async (req, res) => {
  const { division, taskName, note, dueDate, status, progressInfo } = req.body;
  if (!division || !taskName) {
    return res.status(400).json({ error: 'Divisi dan Nama Tugas wajib diisi.' });
  }
  try {
    const item = new Joblist({ division, taskName, note, dueDate, status, progressInfo });
    const saved = await item.save();
    res.status(201).json({ message: 'Joblist berhasil ditambahkan!', data: saved });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT: Update joblist
router.put('/joblist/:id', async (req, res) => {
  const { id } = req.params;
  const { division, taskName, note, dueDate, status, progressInfo } = req.body;
  if (!division || !taskName) {
    return res.status(400).json({ error: 'Divisi dan Nama Tugas wajib diisi.' });
  }
  try {
    const updated = await Joblist.findByIdAndUpdate(
      id,
      { division, taskName, note, dueDate, status, progressInfo },
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res.status(404).json({ error: 'Joblist tidak ditemukan.' });
    }
    res.json({ message: 'Joblist berhasil diperbarui!', data: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE: Hapus joblist
router.delete('/joblist/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = await Joblist.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Joblist tidak ditemukan.' });
    }
    res.json({ message: 'Joblist berhasil dihapus!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ================= ROUTE CONTENT LIST (BISA DIAKSES SEMUA ORANG) ================= */

const DEFAULT_CONTENT_LIST = [
  { name: 'Team Introduction', executionDate: '6 Juli', status: 'Not yet', refLink: '' },
  { name: 'Coming soon', executionDate: '30 Juni', status: 'Done', refLink: '' },
  { name: 'Rilis Logo', executionDate: '4 Juli', status: 'Not yet', refLink: '' },
  { name: 'Rilis Lokasi', executionDate: '4 Juli', status: 'Not yet', refLink: '' },
  { name: 'Tentang Desa', executionDate: '4 Juli', status: 'Not yet', refLink: '' }
];

// GET: Ambil semua data content list (auto seed jika kosong)
router.get('/contentlist', async (req, res) => {
  try {
    let list = await ContentList.find({});
    if (list.length === 0) {
      await ContentList.insertMany(DEFAULT_CONTENT_LIST);
      list = await ContentList.find({});
    }
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST: Tambah content list baru
router.post('/contentlist', async (req, res) => {
  const { name, executionDate, status, refLink } = req.body;
  if (!name || !executionDate) {
    return res.status(400).json({ error: 'Nama Konten dan Pelaksanaan wajib diisi.' });
  }
  try {
    const item = new ContentList({ name, executionDate, status, refLink });
    const saved = await item.save();
    res.status(201).json({ message: 'Konten berhasil ditambahkan!', data: saved });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT: Update content list
router.put('/contentlist/:id', async (req, res) => {
  const { id } = req.params;
  const { name, executionDate, status, refLink } = req.body;
  if (!name || !executionDate) {
    return res.status(400).json({ error: 'Nama Konten dan Pelaksanaan wajib diisi.' });
  }
  try {
    const updated = await ContentList.findByIdAndUpdate(
      id,
      { name, executionDate, status, refLink },
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res.status(404).json({ error: 'Konten tidak ditemukan.' });
    }
    res.json({ message: 'Konten berhasil diperbarui!', data: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE: Hapus content list
router.delete('/contentlist/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = await ContentList.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Konten tidak ditemukan.' });
    }
    res.json({ message: 'Konten berhasil dihapus!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ================= ROUTE PROGRAM KERJA (BISA DIAKSES SEMUA ORANG) ================= */

// GET: Ambil semua data program kerja
router.get('/programkerja', async (req, res) => {
  try {
    const list = await ProgramKerja.find({});
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST: Tambah program kerja baru
router.post('/programkerja', async (req, res) => {
  const { programKerja, type, bidang, rincian, pelaksanaan, pj } = req.body;
  if (!programKerja || !type || !bidang) {
    return res.status(400).json({ error: 'Program Kerja, Tipe, dan Bidang wajib diisi.' });
  }
  try {
    const item = new ProgramKerja({ programKerja, type, bidang, rincian, pelaksanaan, pj });
    const saved = await item.save();
    res.status(201).json({ message: 'Program Kerja berhasil ditambahkan!', data: saved });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT: Update program kerja
router.put('/programkerja/:id', async (req, res) => {
  const { id } = req.params;
  const { programKerja, type, bidang, rincian, pelaksanaan, pj } = req.body;
  if (!programKerja || !type || !bidang) {
    return res.status(400).json({ error: 'Program Kerja, Tipe, dan Bidang wajib diisi.' });
  }
  try {
    const updated = await ProgramKerja.findByIdAndUpdate(
      id,
      { programKerja, type, bidang, rincian, pelaksanaan, pj },
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res.status(404).json({ error: 'Program Kerja tidak ditemukan.' });
    }
    res.json({ message: 'Program Kerja berhasil diperbarui!', data: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE: Hapus program kerja
router.delete('/programkerja/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = await ProgramKerja.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Program Kerja tidak ditemukan.' });
    }
    res.json({ message: 'Program Kerja berhasil dihapus!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ================= ROUTE SETTING QR CODE (ADMIN ONLY FRONTEND) ================= */

// GET: Ambil setting QR code aktif
router.get('/qr-setting', async (req, res) => {
  try {
    let setting = await QrSetting.findOne({ key: 'active_qr' });
    if (!setting) {
      setting = new QrSetting({ key: 'active_qr', value: 1 });
      await setting.save();
    }
    res.json({ activeQr: setting.value });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST: Ubah setting QR code aktif
router.post('/qr-setting', async (req, res) => {
  const { value } = req.body;
  const qrVal = parseInt(value, 10);
  if (isNaN(qrVal) || qrVal < 1 || qrVal > 4) {
    return res.status(400).json({ error: 'Nilai QR Code tidak valid (harus 1, 2, 3, atau 4).' });
  }
  try {
    const updated = await QrSetting.findOneAndUpdate(
      { key: 'active_qr' },
      { value: qrVal },
      { new: true, upsert: true }
    );
    res.json({ message: 'QR Code aktif berhasil diperbarui!', activeQr: updated.value });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const DEFAULT_RAB = [
  // RAB Posko
  { type: 'Posko', kebutuhan: 'Vest + Lanyard KKN', volume: 11, harga: 1320000, anggota: 11 },
  { type: 'Posko', kebutuhan: 'Sewa Posko', volume: 1, harga: 3000000, anggota: 11 },
  { type: 'Posko', kebutuhan: 'Banner', volume: 1, harga: 43100, anggota: 11 },
  // RAB Konsumsi
  { type: 'Konsumsi', kebutuhan: 'Beras', satuan: 'KG', volume: 0, hargaSatuan: 0 },
  { type: 'Konsumsi', kebutuhan: 'Minyak', satuan: 'Liter', volume: 1, hargaSatuan: 25000 },
  { type: 'Konsumsi', kebutuhan: 'Telur', satuan: 'KG', volume: 1, hargaSatuan: 18000 },
  { type: 'Konsumsi', kebutuhan: 'Gula', satuan: 'KG', volume: 1, hargaSatuan: 20000 },
  { type: 'Konsumsi', kebutuhan: 'Bumbu Instan', satuan: 'Pcs', volume: 0, hargaSatuan: 0 },
  { type: 'Konsumsi', kebutuhan: 'Ayam', satuan: 'KG', volume: 0, hargaSatuan: 0 },
  { type: 'Konsumsi', kebutuhan: 'Ikan', satuan: 'KG', volume: 0, hargaSatuan: 0 },
  { type: 'Konsumsi', kebutuhan: 'Sayur', satuan: 'Ikat', volume: 0, hargaSatuan: 0 },
  { type: 'Konsumsi', kebutuhan: 'Tempe', satuan: 'Buah', volume: 0, hargaSatuan: 0 },
  { type: 'Konsumsi', kebutuhan: 'Indomie', satuan: 'Kardus', volume: 0, hargaSatuan: 0 },
  { type: 'Konsumsi', kebutuhan: 'Kopi', satuan: 'Pcs', volume: 0, hargaSatuan: 0 },
  { type: 'Konsumsi', kebutuhan: 'Air Galon', satuan: 'Buah', volume: 2, hargaSatuan: 10000 },
  { type: 'Konsumsi', kebutuhan: 'Gas LPG', satuan: 'Buah', volume: 1, hargaSatuan: 25000 },
  // RAB Transportasi
  { type: 'Transportasi', kebutuhan: 'pick up', satuan: 'Jasa', volume: 1, harga: 350000, anggota: 11 }
];

/* ================= ROUTE MANAJEMEN RAB (BISA DIAKSES SEMUA ORANG) ================= */

// GET: Ambil semua data RAB (Seed jika kosong)
router.get('/rab', async (req, res) => {
  try {
    let list = await Rab.find({});
    if (list.length === 0) {
      await Rab.insertMany(DEFAULT_RAB);
      list = await Rab.find({});
    }
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST: Tambah RAB baru
router.post('/rab', async (req, res) => {
  const { type, prokerName, kebutuhan, satuan, volume, harga, hargaSatuan, anggota } = req.body;
  if (!type || !kebutuhan) {
    return res.status(400).json({ error: 'Tipe RAB dan Kebutuhan wajib diisi.' });
  }
  try {
    const item = new Rab({ type, prokerName, kebutuhan, satuan, volume, harga, hargaSatuan, anggota });
    const saved = await item.save();
    res.status(201).json({ message: 'Item RAB berhasil ditambahkan!', data: saved });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT: Update RAB
router.put('/rab/:id', async (req, res) => {
  const { id } = req.params;
  const { type, prokerName, kebutuhan, satuan, volume, harga, hargaSatuan, anggota } = req.body;
  if (!type || !kebutuhan) {
    return res.status(400).json({ error: 'Tipe RAB dan Kebutuhan wajib diisi.' });
  }
  try {
    const updated = await Rab.findByIdAndUpdate(
      id,
      { type, prokerName, kebutuhan, satuan, volume, harga, hargaSatuan, anggota },
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res.status(404).json({ error: 'Item RAB tidak ditemukan.' });
    }
    res.json({ message: 'Item RAB berhasil diperbarui!', data: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE: Hapus RAB
router.delete('/rab/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = await Rab.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Item RAB tidak ditemukan.' });
    }
    res.json({ message: 'Item RAB berhasil dihapus!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// EXPORT TO GOOGLE SHEETS
// ==========================================
const performSheetsExport = async () => {
  try {
    const allData = {
      attendance: await Attendance.find({}).sort({ date: -1 }),
      rab: await Rab.find({}).sort({ createdAt: -1 }),
      goods: await Goods.find({}),
      joblist: await Joblist.find({}),
      contentlist: await ContentList.find({}),
      programkerja: await ProgramKerja.find({}),
      cashflow: await Cashflow.find({}).sort({ tanggal: 1 })
    };
    const result = await exportAllDataToSheets(allData);
    return result;
  } catch (error) {
    console.error('Error during Google Sheets export:', error);
    throw error;
  }
};

router.post('/export-sheets', async (req, res) => {
  try {
    const result = await performSheetsExport();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengekspor data', details: error.message });
  }
});

// ==========================================
// AUTOMATED CRON JOB (Sync every 06:00 and 18:00)
// ==========================================
const cron = require('node-cron');
// 0 6 * * * -> 06:00, 0 18 * * * -> 18:00
cron.schedule('0 6,18 * * *', async () => {
  console.log('⏰ Menjalankan auto-sync Google Sheets (Jadwal: 06:00 / 18:00)...');
  try {
    await performSheetsExport();
  } catch (e) {
    console.error('Cron auto-sync failed:', e.message);
  }
}, {
  timezone: "Asia/Jakarta"
});

module.exports = router;
