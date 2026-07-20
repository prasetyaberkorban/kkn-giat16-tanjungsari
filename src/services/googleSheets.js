const { google } = require('googleapis');

function getGoogleSheetsClient() {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!spreadsheetId || !clientEmail || !privateKey || privateKey.trim() === '') {
    return null;
  }

  let formattedPrivateKey = privateKey.trim();
  if (formattedPrivateKey.startsWith('"') && formattedPrivateKey.endsWith('"')) {
    formattedPrivateKey = formattedPrivateKey.slice(1, -1);
  } else if (formattedPrivateKey.startsWith("'") && formattedPrivateKey.endsWith("'")) {
    formattedPrivateKey = formattedPrivateKey.slice(1, -1);
  }
  formattedPrivateKey = formattedPrivateKey.replace(/\\n/g, '\n');
  
  // Memastikan ada newline setelah BEGIN dan sebelum END jika mereka gabung dengan base64
  if (!formattedPrivateKey.includes('-----\n')) {
    formattedPrivateKey = formattedPrivateKey.replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n');
    formattedPrivateKey = formattedPrivateKey.replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----');
  }
  const auth = new google.auth.JWT(
    clientEmail,
    null,
    formattedPrivateKey,
    ['https://www.googleapis.com/auth/spreadsheets']
  );

  const sheets = google.sheets({ version: 'v4', auth });
  return { sheets, spreadsheetId };
}

/**
 * Mencatat data absensi ke Google Spreadsheet sebagai cadangan (legacy/realtime)
 */
const appendAttendanceToSheet = async (data) => {
  const client = getGoogleSheetsClient();
  if (!client) {
    console.warn('⚠️ Google Sheets integration is not configured. Skipping backup.');
    return null;
  }
  const { sheets, spreadsheetId } = client;

  try {
    const rowValues = [
      [
        data.date,
        data.dayName,
        data.name,
        data.division || '-',
        data.team,
        data.task,
        data.time,
        data.status
      ]
    ];

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'A:G', // Akan menulis ke sheet pertama by default
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: { values: rowValues }
    });

    console.log('✅ Success: Attendance data backed up to Google Sheets.');
    return response.data;
  } catch (error) {
    console.error('❌ Error writing to Google Sheets:', error.message);
    return null;
  }
};

/**
 * Sinkronisasi semua data ke tab/sheet masing-masing.
 * Jika sheet tidak ada, akan dibuat otomatis.
 */
const exportAllDataToSheets = async (allData) => {
  const client = getGoogleSheetsClient();
  if (!client) {
    throw new Error('Konfigurasi Google Sheets (ID / Token) belum lengkap di .env');
  }
  const { sheets, spreadsheetId } = client;

  const rabPoskoRows = allData.rab.filter(r => r.type === 'Posko').map(r => {
    const jumlah = r.harga;
    const iuran = jumlah / (r.anggota || 11);
    return [
      r._id.toString(), r.kebutuhan, r.volume, 
      r.harga || 0, iuran || 0, jumlah || 0, 
      new Date(r.createdAt).toLocaleString('id-ID')
    ];
  });
  const rabPoskoTotal = allData.rab.filter(r => r.type === 'Posko').reduce((sum, r) => sum + (r.harga || 0), 0);
  rabPoskoRows.push(['', '', '', '', 'TOTAL KESELURUHAN', rabPoskoTotal, '']);

  const rabKonsumsiRows = allData.rab.filter(r => r.type === 'Konsumsi').map(r => {
    const jumlah = (r.volume || 0) * (r.hargaSatuan || 0);
    return [
      r._id.toString(), r.kebutuhan, r.volume, r.satuan || '-', 
      r.hargaSatuan || 0, 0, jumlah || 0, 
      new Date(r.createdAt).toLocaleString('id-ID')
    ];
  });
  const rabKonsumsiTotal = allData.rab.filter(r => r.type === 'Konsumsi').reduce((sum, r) => sum + ((r.volume || 0) * (r.hargaSatuan || 0)), 0);
  const rabKonsumsiIuran = Math.ceil((rabKonsumsiTotal / 11) / 1000) * 1000;
  rabKonsumsiRows.push(['', '', '', '', 'TOTAL KESELURUHAN & IURAN/ORG', rabKonsumsiIuran, rabKonsumsiTotal, '']);

  const rabTransportRows = allData.rab.filter(r => r.type === 'Transportasi').map(r => {
    const jumlah = r.harga;
    const iuran = jumlah / (r.anggota || 11);
    return [
      r._id.toString(), r.kebutuhan, r.volume, r.satuan || '-', 
      r.harga || 0, iuran || 0, jumlah || 0, 
      new Date(r.createdAt).toLocaleString('id-ID')
    ];
  });
  const rabTransportTotal = allData.rab.filter(r => r.type === 'Transportasi').reduce((sum, r) => sum + (r.harga || 0), 0);
  rabTransportRows.push(['', '', '', '', '', 'TOTAL KESELURUHAN', rabTransportTotal, '']);

  const rabProkerRows = allData.rab.filter(r => r.type === 'Proker').map(r => {
    const jumlah = (r.volume || 0) * (r.hargaSatuan || 0);
    return [
      r._id.toString(), r.prokerName || '-', r.kebutuhan, r.volume, 
      r.hargaSatuan || 0, jumlah || 0, 
      new Date(r.createdAt).toLocaleString('id-ID')
    ];
  });
  const rabProkerTotal = allData.rab.filter(r => r.type === 'Proker').reduce((sum, r) => sum + ((r.volume || 0) * (r.hargaSatuan || 0)), 0);
  rabProkerRows.push(['', '', '', '', 'TOTAL KESELURUHAN', rabProkerTotal, '']);

  const prokerGroups = {};
  allData.rab.filter(r => r.type === 'Proker').forEach(r => {
    const pName = r.prokerName || 'Umum';
    if(!prokerGroups[pName]) prokerGroups[pName] = 0;
    const jumlah = (r.volume || 0) * (r.hargaSatuan || 0);
    prokerGroups[pName] += jumlah;
  });
  const ringkasanProkerRows = Object.keys(prokerGroups).map(k => [k, prokerGroups[k]]);

  // Pemetaan Data yang ingin di-export beserta judul Header-nya
  
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

  const exportsConfig = [
    {
      title: 'Cashflow',
      headers: ['ID', 'Tanggal', 'Jenis', 'Kategori', 'Deskripsi', 'Harga Satuan', 'Jumlah Barang', 'Pemasukan', 'Pengeluaran', 'Saldo', 'Tanggal Dibuat'],
      rows: cashflowRows
    },
    {
      title: 'Ringkasan RAB',
      headers: ['JENIS RAB / PROKER', 'TOTAL'],
      rows: [
        ['RAB Posko', rabPoskoTotal],
        ['RAB Konsumsi', rabKonsumsiTotal],
        ['RAB Transportasi', rabTransportTotal],
        ['TOTAL KESELURUHAN RAB UMUM', rabPoskoTotal + rabKonsumsiTotal + rabTransportTotal],
        ['', ''],
        ['RAB PROKER (Rincian per Program Kerja)', 'TOTAL'],
        ...ringkasanProkerRows,
        ['TOTAL KESELURUHAN RAB PROKER', rabProkerTotal],
        ['', ''],
        ['GRAND TOTAL SEMUA RAB', rabPoskoTotal + rabKonsumsiTotal + rabTransportTotal + rabProkerTotal]
      ]
    },
    {
      title: 'Daftar Hadir',
      headers: ['ID', 'Tanggal', 'Hari', 'Nama', 'Divisi', 'Tim', 'Tugas', 'Waktu', 'Status'],
      rows: allData.attendance.map(a => [a._id.toString(), a.date, a.dayName, a.name, a.division, a.team, a.task, a.time, a.status])
    },
    {
      title: 'RAB Posko',
      headers: ['ID', 'Kebutuhan', 'Volume', 'Harga', 'Iuran', 'Total', 'Tanggal Dibuat'],
      rows: rabPoskoRows
    },
    {
      title: 'RAB Konsumsi',
      headers: ['ID', 'Kebutuhan', 'Volume', 'Satuan', 'Harga Satuan', 'Iuran', 'Total', 'Tanggal Dibuat'],
      rows: rabKonsumsiRows
    },
    {
      title: 'RAB Transportasi',
      headers: ['ID', 'Kebutuhan', 'Volume', 'Satuan', 'Harga', 'Iuran', 'Total', 'Tanggal Dibuat'],
      rows: rabTransportRows
    },
    {
      title: 'RAB Proker',
      headers: ['ID', 'Nama Proker', 'Kebutuhan', 'Volume', 'Harga Satuan', 'Total', 'Tanggal Dibuat'],
      rows: rabProkerRows
    },
    {
      title: 'Barang Bawaan',
      headers: ['ID', 'Nama Barang', 'Kategori', 'Tipe', 'Qty/Jumlah', 'Keterangan/Note', 'Penanggung Jawab', 'Status Checklist'],
      rows: allData.goods.map(g => [g._id.toString(), g.name, g.category, g.type, g.qty || '-', g.note || '-', g.pj || '-', g.isChecked ? 'Bawa' : 'Belum'])
    },
    {
      title: 'Joblist',
      headers: ['ID', 'Divisi', 'Nama Tugas', 'Catatan', 'Due Date', 'Status'],
      rows: allData.joblist.map(j => [j._id.toString(), j.division, j.taskName, j.note || '-', j.dueDate || '-', j.status])
    },
    {
      title: 'Konten Publikasi',
      headers: ['ID', 'Nama Konten', 'Pelaksanaan', 'Status Checklist', 'Link Referensi'],
      rows: allData.contentlist.map(c => [
        c._id.toString(), c.name, c.executionDate || '-', c.status, c.refLink || '-'
      ])
    },
    {
      title: 'Program Kerja',
      headers: ['ID', 'Nama Proker', 'Bidang', 'Rincian', 'Pelaksanaan', 'Penanggung Jawab', 'Tipe'],
      rows: allData.programkerja.map(p => [
        p._id.toString(), p.programKerja, p.bidang, p.rincian || '-', p.pelaksanaan || '-', p.pj || '-', p.type
      ])
    }
  ];

  try {
    // 1. Dapatkan informasi spreadsheet saat ini (untuk mengecek sheet yang ada)
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const existingSheets = spreadsheet.data.sheets.map(s => s.properties.title);

    // 2. Buat sheet yang belum ada
    const batchUpdateRequests = [];
    for (const config of exportsConfig) {
      if (!existingSheets.includes(config.title)) {
        batchUpdateRequests.push({
          addSheet: { properties: { title: config.title } }
        });
      }
    }

    if (batchUpdateRequests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: { requests: batchUpdateRequests }
      });
      console.log(`✅ Created ${batchUpdateRequests.length} new sheets.`);
    }

    // 3. Clear data lama & Masukkan data baru per sheet
    for (const config of exportsConfig) {
      const range = `'${config.title}'!A:Z`;
      
      // Clear
      await sheets.spreadsheets.values.clear({ spreadsheetId, range });

      // Insert Header + Data
      const values = [config.headers, ...config.rows];
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${config.title}'!A1`,
        valueInputOption: 'USER_ENTERED',
        resource: { values }
      });
    }

    console.log('✅ Success: All data exported to Google Sheets.');
    return { success: true, message: 'Berhasil melakukan export data' };
  } catch (error) {
    console.error('❌ Error exporting to Google Sheets:', error);
    throw new Error('Gagal mengekspor data ke Google Sheets: ' + error.message);
  }
};

module.exports = {
  appendAttendanceToSheet,
  exportAllDataToSheets
};
