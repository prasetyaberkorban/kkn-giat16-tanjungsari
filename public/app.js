// Data Anggota & Tim
const TEAMS = {
  'TIM A': ['Zii', 'Mey', 'Hani'],
  'TIM B': ['Tian', 'Ananda', 'Firzan'],
  'TIM C': ['Cio', 'Naila', 'Valen'],
  'TIM D': ['Fay', 'Nanda']
};

const TASKS = [
  'Masak & Belanja',
  'Cuci Piring',
  'Bersih-Bersih Posko',
  'Libur'
];

// Offset tim untuk rotasi 4-harian (Kamis, 9 Juli 2026 = Day 0)
const TEAM_OFFSETS = {
  'TIM D': 0,
  'TIM A': 1,
  'TIM B': 2,
  'TIM C': 3
};

let currentTab = 'dashboard';
let todayScheduleData = null;
let currentViewingWeek = 1;
let activeQrCodeType = 1;
let currentAttendanceFilter = 'today';
let allAttendanceData = [];

document.addEventListener('DOMContentLoaded', () => {
  // 1. Cek Sesi Admin
  updateAdminUI();

  // 2. Load data awal
  fetchDashboardData();

  // 3. Setup real-time update untuk dashboard
  setInterval(() => {
    if (currentTab === 'dashboard') {
      fetchDashboardData();
    }
  }, 7000);
});

/* ================= NAVIGASI & SIDEBAR ================= */

function toggleSidebar() {
  const drawer = document.getElementById('sidebar-drawer');
  const overlay = document.getElementById('sidebar-overlay');
  drawer.classList.toggle('active');
  overlay.classList.toggle('active');
}

function switchTab(tabId) {
  // Set tab active di menu drawer
  const menuItems = document.querySelectorAll('.menu-item');
  menuItems.forEach(item => {
    if (item.innerText.toLowerCase().includes(tabId.replace('-', ' '))) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Ganti tab content
  const tabs = document.querySelectorAll('.tab-content');
  tabs.forEach(tab => {
    if (tab.id === `tab-${tabId}`) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  currentTab = tabId;
  toggleSidebar(); // Tutup drawer

  // Load data spesifik tab
  if (tabId === 'dashboard') {
    fetchDashboardData();
  } else if (tabId === 'daftar-hadir') {
    fetchFullAttendance();
  } else if (tabId === 'jadwal-mingguan') {
    // Gunakan minggu aktif dari database hari ini jika tersedia, jika tidak default ke 1
    const activeWeek = (todayScheduleData && todayScheduleData.weeksSinceEpoch) ? todayScheduleData.weeksSinceEpoch : 1;
    currentViewingWeek = activeWeek;
    
    const weekDisplay = document.getElementById('current-week-display');
    if (weekDisplay) weekDisplay.innerText = `Minggu ${currentViewingWeek}`;
    switchWeek(currentViewingWeek);
  } else if (tabId === 'checklist-tugas') {
    fetchChecklistTugas();
  } else if (tabId === 'barang-bawaan') {
    fetchGoods().then(() => renderGoods());
  } else if (tabId === 'joblist') {
    fetchJoblist().then(() => renderJoblist());
  } else if (tabId === 'contentlist') {
    fetchContentList().then(() => renderContentList());
  } else if (tabId === 'programkerja') {
    fetchProgramKerja().then(() => renderProgramKerja());
  } else if (tabId === 'rab') {
    fetchRab().then(() => renderRab());
  }
}

/* ================= OTENTIKASI ADMIN ================= */

function openAdminModal() {
  const isAdmin = localStorage.getItem('isAdmin') === 'true';
  if (isAdmin) {
    // Jika sudah login, klik tombol ini akan Logout
    localStorage.removeItem('isAdmin');
    updateAdminUI();
    fetchDashboardData();
  } else {
    document.getElementById('admin-modal').classList.add('active');
    document.getElementById('admin-password').value = '';
    document.getElementById('login-error-msg').style.display = 'none';
  }
}

function closeAdminModal() {
  document.getElementById('admin-modal').classList.remove('active');
}

async function handleAdminLogin(e) {
  e.preventDefault();
  const password = document.getElementById('admin-password').value;
  const errorMsg = document.getElementById('login-error-msg');

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    const data = await res.json();

    if (res.ok && data.success) {
      localStorage.setItem('isAdmin', 'true');
      updateAdminUI();
      closeAdminModal();
      fetchDashboardData(); // Refresh untuk load QR Code
    } else {
      errorMsg.innerText = data.error || 'Password salah!';
      errorMsg.style.display = 'block';
    }
  } catch (err) {
    errorMsg.innerText = 'Gagal memvalidasi password ke server.';
    errorMsg.style.display = 'block';
  }
}

function updateAdminUI() {
  const isAdmin = localStorage.getItem('isAdmin') === 'true';
  const triggerBtn = document.getElementById('admin-login-trigger');
  const qrSection = document.getElementById('admin-qr-section');
  const adminInfo = document.getElementById('sidebar-admin-info');

  if (isAdmin) {
    triggerBtn.innerText = '🔓 Logout Admin';
    triggerBtn.classList.add('logged-in');
    qrSection.style.display = 'block';
    adminInfo.innerHTML = `
      <span style="font-size: 0.85rem; color: var(--color-success); font-weight: bold;">Role: Administrator</span>
      <span style="font-size: 0.75rem; color: var(--text-secondary);">Akses QR Code & Fitur Aktif</span>
    `;
    fetchActiveQrSetting();
  } else {
    triggerBtn.innerText = '🔐 Login Admin';
    triggerBtn.classList.remove('logged-in');
    qrSection.style.display = 'none';
    adminInfo.innerHTML = `
      <span style="font-size: 0.85rem; color: var(--text-secondary);">Role: Tamu</span>
    `;
  }

  // Centered Dashboard Layout jika bukan admin
  const layout = document.querySelector('.dashboard-layout');
  if (layout) {
    if (isAdmin) {
      layout.classList.remove('admin-hidden');
    } else {
      layout.classList.add('admin-hidden');
    }
  }

  // Tampilkan/sembunyikan tombol export untuk admin saja
  const sidebarExport = document.getElementById('sidebar-export-wrapper');
  if (sidebarExport) {
    sidebarExport.style.display = isAdmin ? 'block' : 'none';
  }

  const exportButtons = document.querySelectorAll('.export-tab-btn');
  exportButtons.forEach(btn => {
    btn.style.display = isAdmin ? 'inline-block' : 'none';
  });

  // Tampilkan/sembunyikan tombol tambah barang
  const goodsAdminActions = document.getElementById('goods-admin-actions');
  if (goodsAdminActions) {
    goodsAdminActions.style.display = (isAdmin || currentGoodsType === 'kelompok') ? 'block' : 'none';
  }

  // Tampilkan/sembunyikan tombol sesuaikan jadwal
  const scheduleAdjustBtn = document.getElementById('admin-schedule-adjust-btn');
  if (scheduleAdjustBtn) {
    scheduleAdjustBtn.style.display = isAdmin ? 'block' : 'none';
  }

  // Tampilkan/sembunyikan header kolom Aksi di tabel absensi
  const attendanceActionHeader = document.getElementById('attendance-action-header');
  if (attendanceActionHeader) {
    attendanceActionHeader.style.display = isAdmin ? 'table-cell' : 'none';
  }

  // Jika sedang membuka tab daftar hadir, muat ulang
  if (currentTab === 'daftar-hadir') {
    fetchFullAttendance();
  }

  // Jika sedang membuka tab jadwal mingguan, muat ulang
  if (currentTab === 'jadwal-mingguan') {
    switchWeek(currentViewingWeek);
  }

  // Jika sedang membuka tab barang bawaan, render ulang agar tombol delete muncul/hilang
  if (currentTab === 'barang-bawaan') {
    renderGoods();
  }
}

/* ================= TAB 1: DASHBOARD ================= */

async function fetchDashboardData() {
  try {
    const res = await fetch('/api/schedule');
    const data = await res.json();

    if (data.error) {
      showDashboardError(data.error);
      return;
    }

    todayScheduleData = data;

    // Update tanggal di header
    const dateBadge = document.getElementById('current-date-badge');
    dateBadge.innerHTML = `<span>📅</span> ${data.dayName}, ${formatDateIndo(data.date)}`;

    // Render tugas harian
    const container = document.getElementById('duty-grid-container');
    container.innerHTML = '';

    Object.entries(data.dailySchedule).forEach(([teamName, info]) => {
      const card = document.createElement('div');
      let taskClass = 'libur';
      const taskLower = info.task.toLowerCase();

      if (taskLower.includes('masak')) taskClass = 'masak';
      else if (taskLower.includes('piring')) taskClass = 'cucian';
      else if (taskLower.includes('bersih')) taskClass = 'bersih';

      card.className = `duty-item ${taskClass}`;
      card.innerHTML = `
        <span class="duty-task">${info.task}</span>
        <span class="duty-team">${teamName}</span>
        <span class="duty-members">${info.members.join(', ')}</span>
      `;
      container.appendChild(card);
    });

    // Update piket kamar mandi
    const bathroomBadge = document.getElementById('bathroom-team-badge');
    bathroomBadge.innerText = data.bathroomPiket.team;
    bathroomBadge.title = `Anggota: ${data.bathroomPiket.members.join(', ')}`;

    // Render QR Code (jika Admin login)
    if (localStorage.getItem('isAdmin') === 'true') {
      generateQrCode(data.localIp);
    }

  } catch (err) {
    console.error('Error fetching dashboard:', err);
    showDashboardError('Gagal terhubung ke server posko.');
  }
}

function showDashboardError(msg) {
  const container = document.getElementById('duty-grid-container');
  container.innerHTML = `
    <div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--color-error); font-weight: 500;">
      ❌ ${msg}
    </div>
  `;
}

function generateQrCode(localIp) {
  const qrContainer = document.getElementById('qrcode');
  if (!qrContainer) return;
  qrContainer.innerHTML = ''; // Bersihkan

  let checkinUrl = window.location.origin + '/absensi.html';

  const hostname = window.location.hostname;
  if ((hostname === 'localhost' || hostname === '127.0.0.1') && localIp && localIp !== 'localhost') {
    const port = window.location.port ? `:${window.location.port}` : '';
    checkinUrl = `http://${localIp}${port}/absensi.html`;
  }

  checkinUrl += `?qr=${activeQrCodeType}`;

  try {
    if (typeof QRCode !== 'undefined') {
      new QRCode(qrContainer, {
        text: checkinUrl,
        width: 170,
        height: 170,
        colorDark: '#0b0f19',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
      });
    } else {
      qrContainer.innerHTML = '<div style="color:var(--color-error); font-size: 0.8rem; padding: 1rem;">QR Library error</div>';
    }
  } catch (err) {
    qrContainer.innerHTML = '<div style="color:var(--color-error); font-size: 0.8rem; padding: 1rem;">Gagal membuat QR</div>';
  }
}

async function fetchActiveQrSetting() {
  try {
    const res = await fetch('/api/qr-setting');
    const data = await res.json();
    if (data.activeQr) {
      activeQrCodeType = data.activeQr;
      const select = document.getElementById('active-qr-select');
      if (select) {
        select.value = data.activeQr.toString();
      }
      generateQrCode(todayScheduleData ? todayScheduleData.localIp : null);
    }
  } catch (err) {
    console.error('Gagal memuat setting QR Code aktif:', err);
  }
}

async function handleActiveQrChange(val) {
  try {
    const res = await fetch('/api/qr-setting', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ value: val })
    });
    const data = await res.json();
    if (res.ok && data.activeQr) {
      activeQrCodeType = data.activeQr;
      generateQrCode(todayScheduleData ? todayScheduleData.localIp : null);
    } else {
      alert(data.error || 'Gagal mengubah QR Code aktif.');
    }
  } catch (err) {
    console.error('Gagal memperbarui QR Code aktif:', err);
    alert('Terjadi kesalahan koneksi.');
  }
}

/* ================= TAB 2: DAFTAR HADIR ================= */

async function fetchFullAttendance() {
  const tbody = document.getElementById('full-attendance-table-body');
  const isAdmin = localStorage.getItem('isAdmin') === 'true';
  tbody.innerHTML = `<tr><td colspan="${isAdmin ? 8 : 7}" style="text-align: center; padding: 2rem;">Mengambil riwayat absensi...</td></tr>`;

  try {
    const res = await fetch('/api/attendance/all');
    allAttendanceData = await res.json();
    renderAttendanceTable();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="${isAdmin ? 8 : 7}" style="text-align: center; color: var(--color-error); padding: 2rem;">Gagal mengambil riwayat absensi dari server.</td></tr>`;
  }
}

function filterAttendanceView(mode) {
  currentAttendanceFilter = mode;
  
  // Set active class on filter buttons
  const container = document.getElementById('attendance-filter-tabs');
  if (container) {
    const buttons = container.querySelectorAll('.week-btn');
    buttons.forEach(btn => {
      if ((mode === 'today' && btn.innerText === 'Hari Ini') || (mode === 'all' && btn.innerText === 'Semua Riwayat')) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }
  
  renderAttendanceTable();
}

function renderAttendanceTable() {
  const tbody = document.getElementById('full-attendance-table-body');
  if (!tbody) return;

  const isAdmin = localStorage.getItem('isAdmin') === 'true';
  tbody.innerHTML = '';

  // Dapatkan tanggal hari ini (WIB)
  const todayDate = todayScheduleData ? todayScheduleData.date : new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });

  const filtered = currentAttendanceFilter === 'today'
    ? allAttendanceData.filter(item => item.date === todayDate)
    : allAttendanceData;

  if (filtered.length === 0) {
    const emptyMsg = currentAttendanceFilter === 'today'
      ? 'Belum ada anggota yang absen hari ini.'
      : 'Belum ada riwayat absensi yang tersimpan.';
    tbody.innerHTML = `<tr><td colspan="${isAdmin ? 8 : 7}" style="text-align: center; color: var(--text-secondary); padding: 2rem;">${emptyMsg}</td></tr>`;
    return;
  }

  filtered.forEach(item => {
    const row = document.createElement('tr');
    
    let statusCell = '';
    if (isAdmin) {
      statusCell = `
        <select class="select-control" style="padding: 0.2rem 0.4rem; font-size: 0.85rem; border-radius: 6px; width: 100px; background: rgba(255,255,255,0.05); color: #fff; border: 1px solid var(--border-color);" onchange="updateAttendanceStatus('${item._id}', this.value)">
          <option value="Hadir" ${item.status === 'Hadir' ? 'selected' : ''}>Hadir</option>
          <option value="Sakit" ${item.status === 'Sakit' ? 'selected' : ''}>Sakit</option>
          <option value="Izin" ${item.status === 'Izin' ? 'selected' : ''}>Izin</option>
          <option value="Alfa" ${item.status === 'Alfa' ? 'selected' : ''}>Alfa</option>
        </select>
      `;
    } else {
      let statusColor = 'var(--color-success)';
      if (item.status === 'Sakit' || item.status === 'Izin') statusColor = 'var(--color-warning)';
      else if (item.status === 'Alfa') statusColor = 'var(--color-error)';
      statusCell = `<span style="color: ${statusColor}; font-weight: bold;">${item.status}</span>`;
    }

    let actionCell = '';
    if (isAdmin) {
      actionCell = `<td style="text-align: center;"><button class="delete-btn" style="background: none; border: none; color: var(--color-error); cursor: pointer; font-size: 1.1rem; padding: 0.25rem;" onclick="deleteAttendanceItem('${item._id}')" title="Hapus Absensi">🗑️</button></td>`;
    }

    row.innerHTML = `
      <td style="font-weight: 600; color: #fff;">${item.name}</td>
      <td style="font-weight: 500; color: var(--color-primary);">${item.division || '-'}</td>
      <td>${item.team}</td>
      <td>${formatDateIndo(item.date)}</td>
      <td>${item.time}</td>
      <td>${item.task}</td>
      <td>${statusCell}</td>
      ${actionCell}
    `;
    tbody.appendChild(row);
  });
}

/* ================= TAB 3: JADWAL MINGGUAN ================= */

function adjustWeek(amount) {
  currentViewingWeek += amount;
  if (currentViewingWeek < 1) currentViewingWeek = 1;
  
  const display = document.getElementById('current-week-display');
  if (display) {
    display.innerText = `Minggu ${currentViewingWeek}`;
  }
  switchWeek(currentViewingWeek);
}

async function switchWeek(weekNum) {
  // Tampilkan data piket kamar mandi minggu ini
  const bathroomTeams = ['TIM A', 'TIM B', 'TIM C', 'TIM D'];
  let activeBathroomTeam = bathroomTeams[(weekNum - 1) % 4];
  
  // Kalkulasi jadwal harian untuk seminggu penuh (Senin s/d Minggu)
  const dayOffsets = {
    'Senin': -3,
    'Selasa': -2,
    'Rabu': -1,
    'Kamis': 0,
    'Jumat': 1,
    'Sabtu': 2,
    'Minggu': 3
  };

  const tbody = document.getElementById('rotation-table-body');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem;">Memuat jadwal...</td></tr>';

  try {
    const promises = Object.entries(dayOffsets).map(async ([dayName, offset]) => {
      const daysSinceEpoch = (weekNum - 1) * 7 + offset;
      const epochDate = new Date('2026-07-09T00:00:00+07:00');
      epochDate.setDate(epochDate.getDate() + daysSinceEpoch);
      const yyyy = epochDate.getFullYear();
      const mm = String(epochDate.getMonth() + 1).padStart(2, '0');
      const dd = String(epochDate.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      const res = await fetch(`/api/schedule?date=${dateStr}`);
      const schedule = await res.json();
      return { dayName, schedule, dateStr };
    });

    const results = await Promise.all(promises);

    // Dapatkan bathroom team dari Kamis (index 3)
    const kamisResult = results.find(r => r.dayName === 'Kamis');
    if (kamisResult && kamisResult.schedule.bathroomPiket) {
      activeBathroomTeam = kamisResult.schedule.bathroomPiket.team;
    }

    const bathroomTeamEl = document.getElementById('weekly-bathroom-team');
    const bathroomMembersEl = document.getElementById('weekly-bathroom-members');
    if (bathroomTeamEl) bathroomTeamEl.innerText = activeBathroomTeam;
    if (bathroomMembersEl) bathroomMembersEl.innerText = TEAMS[activeBathroomTeam].join(', ');

    tbody.innerHTML = '';
    results.forEach(({ dayName, schedule }) => {
      // Map tasks to teams
      const tasksMap = {};
      Object.entries(schedule.dailySchedule).forEach(([teamName, info]) => {
        tasksMap[info.task] = teamName;
      });

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${dayName}</td>
        <td style="color: var(--color-accent);">${tasksMap['Masak & Belanja'] || '-'}</td>
        <td style="color: var(--color-primary);">${tasksMap['Cuci Piring'] || '-'}</td>
        <td style="color: var(--color-secondary);">${tasksMap['Bersih-Bersih Posko'] || '-'}</td>
        <td style="color: var(--text-secondary);">${tasksMap['Libur'] || '-'}</td>
      `;
      tbody.appendChild(row);
    });
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--color-error); padding: 2rem;">Gagal memuat jadwal dari server.</td></tr>';
  }
}

/* ================= TAB 4: CHECKLIST TUGAS ================= */

async function fetchChecklistTugas() {
  const container = document.getElementById('checklist-container');
  container.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-secondary);"><div class="spinner" style="margin:0 auto 1rem auto;"></div>Mengambil data checklist tugas...</div>';

  if (!todayScheduleData) {
    container.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--color-error);">Jadwal hari ini belum siap. Silakan buka Dashboard terlebih dahulu.</div>';
    return;
  }

  try {
    // Ambil data checklist yang sudah diselesaikan dari API
    const res = await fetch(`/api/tasks/completion?date=${todayScheduleData.date}`);
    const completions = await res.json();
    
    // Simpan kecocokan tugas yang sudah diselesaikan dalam Set (format: "Nama_Tugas")
    const completedSet = new Set();
    completions.forEach(c => {
      if (c.completed) {
        completedSet.add(`${c.name}_${c.task}`);
      }
    });

    container.innerHTML = '';

    // Gabungkan daftar orang yang punya tugas hari ini
    const activeTasks = []; // berisi array object: { name, task, team, isBathroom }

    // 1. Tugas Harian
    Object.entries(todayScheduleData.dailySchedule).forEach(([teamName, info]) => {
      // Lewati tim yang hari ini libur
      if (info.task !== 'Libur') {
        info.members.forEach(name => {
          activeTasks.push({
            name,
            task: info.task,
            team: teamName,
            isBathroom: false
          });
        });
      }
    });

    // 2. Tugas Kamar Mandi Minggu ini (dianggap tugas harian tambahan untuk tim tersebut)
    const bathroomTeam = todayScheduleData.bathroomPiket.team;
    const bathroomMembers = todayScheduleData.bathroomPiket.members;
    bathroomMembers.forEach(name => {
      activeTasks.push({
        name,
        task: 'Piket Kamar Mandi',
        team: bathroomTeam,
        isBathroom: true
      });
    });

    if (activeTasks.length === 0) {
      container.innerHTML = '<div class="empty-attendance">Tidak ada tugas piket aktif hari ini.</div>';
      return;
    }

    // Kelompokkan tugas aktif berdasarkan nama tugasnya
    const groupedTasks = {};
    activeTasks.forEach(item => {
      if (!groupedTasks[item.task]) {
        groupedTasks[item.task] = [];
      }
      groupedTasks[item.task].push(item);
    });

    const taskGroups = Object.entries(groupedTasks);
    taskGroups.forEach(([taskName, items], groupIdx) => {
      // 1. Tambahkan Header untuk Kelompok Tugas
      const groupHeader = document.createElement('div');
      groupHeader.className = 'checklist-group-header';
      groupHeader.innerHTML = `<h4>${taskName}</h4>`;
      container.appendChild(groupHeader);

      // 2. Tambahkan setiap Anggota di Kelompok Tugas ini
      items.forEach((item, index) => {
        const isCompleted = completedSet.has(`${item.name}_${item.task}`);
        const checkboxId = `chk-task-${groupIdx}-${index}`;

        const checklistItem = document.createElement('div');
        checklistItem.className = 'checklist-item';
        
        checklistItem.innerHTML = `
          <div class="checklist-user-info">
            <span class="checklist-name">${item.name}</span>
            <span class="checklist-task-badge" style="color: ${item.isBathroom ? 'var(--color-secondary)' : 'var(--text-secondary)'};">
              ${item.team}
            </span>
          </div>
          <div class="premium-checkbox-wrapper">
            <input type="checkbox" id="${checkboxId}" ${isCompleted ? 'checked' : ''} onchange="toggleTaskCompletion('${item.name}', '${item.task}', this)">
            <label class="checkbox-checkmark" for="${checkboxId}"></label>
          </div>
        `;
        container.appendChild(checklistItem);
      });

      // 3. Tambahkan Garis Pemisah (Separator) jika bukan kelompok terakhir
      if (groupIdx < taskGroups.length - 1) {
        const separator = document.createElement('div');
        separator.className = 'checklist-group-separator';
        container.appendChild(separator);
      }
    });

  } catch (err) {
    container.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--color-error);">Gagal mengambil data checklist dari server.</div>';
  }
}

async function toggleTaskCompletion(name, task, checkboxElement) {
  const completed = checkboxElement.checked;
  const date = todayScheduleData ? todayScheduleData.date : null;

  try {
    const res = await fetch('/api/tasks/completion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, task, completed, date })
    });
    
    if (!res.ok) {
      // Jika gagal, kembalikan posisi checklist ke semula di UI
      checkboxElement.checked = !completed;
      alert('Gagal menyinkronkan status tugas ke server.');
    }
  } catch (err) {
    checkboxElement.checked = !completed;
    alert('Koneksi terputus. Gagal menyinkronkan status tugas.');
  }
}

/* ================= UTILITY ================= */

function formatDateIndo(dateStr) {
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  
  const day = parseInt(parts[2], 10);
  const month = months[parseInt(parts[1], 10) - 1];
  const year = parts[0];
  
  return `${day} ${month} ${year}`;
}

/* ================= TAB 5: BARANG BAWAAN (DINAMIS & INTERAKTIF) ================= */
let selectedGoodsCategory = 'Semua';
let currentGoodsType = 'pribadi'; // 'pribadi' atau 'kelompok'
let goodsList = []; // Diambil dari MongoDB Atlas

async function fetchGoods() {
  try {
    const res = await fetch('/api/goods');
    goodsList = await res.json();
  } catch (err) {
    console.error('Gagal mengambil data inventaris:', err);
  }
}

function switchGoodsType(type) {
  currentGoodsType = type;
  
  const pribadiBtn = document.getElementById('type-pribadi-btn');
  const kelompokBtn = document.getElementById('type-kelompok-btn');
  const categoryContainer = document.getElementById('goods-category-container');
  
  if (type === 'pribadi') {
    if (pribadiBtn) pribadiBtn.classList.add('active');
    if (kelompokBtn) kelompokBtn.classList.remove('active');
    if (categoryContainer) categoryContainer.style.display = 'flex';
  } else {
    if (pribadiBtn) pribadiBtn.classList.remove('active');
    if (kelompokBtn) kelompokBtn.classList.add('active');
    if (categoryContainer) categoryContainer.style.display = 'none';
  }

  // Tampilkan/sembunyikan tombol tambah barang berdasarkan tipe & role admin
  const isAdmin = localStorage.getItem('isAdmin') === 'true';
  const goodsAdminActions = document.getElementById('goods-admin-actions');
  if (goodsAdminActions) {
    goodsAdminActions.style.display = (isAdmin || type === 'kelompok') ? 'block' : 'none';
  }
  
  // Reset pencarian & category
  const searchInput = document.getElementById('goods-search-input');
  if (searchInput) searchInput.value = '';
  selectedGoodsCategory = 'Semua';
  filterGoodsByCategory('Semua');
}

function renderGoods() {
  const tbody = document.getElementById('goods-table-body');
  if (!tbody) return;

  const searchInput = document.getElementById('goods-search-input');
  const searchVal = searchInput ? searchInput.value.toLowerCase() : '';
  const isAdmin = localStorage.getItem('isAdmin') === 'true';

  // 1. Ubah Table Header secara Dinamis berdasarkan Tipe Barang
  const thead = document.querySelector('#tab-barang-bawaan .premium-table thead');
  if (thead) {
    if (currentGoodsType === 'pribadi') {
      thead.innerHTML = `
        <tr>
          <th style="width: 70px;">No</th>
          <th style="width: 140px;">Kategori</th>
          <th>Nama Barang</th>
          <th>Catatan / Jumlah</th>
          <th id="goods-action-header" style="${isAdmin ? 'display: table-cell;' : 'display: none;'} width: 80px; text-align: center;">Aksi</th>
        </tr>
      `;
    } else {
      // Untuk barang kelompok, kolom Aksi selalu ditampilkan karena non-admin bisa mengedit
      thead.innerHTML = `
        <tr>
          <th style="width: 70px;">No</th>
          <th>Nama Barang</th>
          <th style="width: 100px;">Jumlah</th>
          <th>Catatan</th>
          <th style="width: 200px;">Penanggung Jawab (PJ)</th>
          <th id="goods-action-header" style="display: table-cell; width: 100px; text-align: center;">Aksi</th>
        </tr>
      `;
    }
  }

  tbody.innerHTML = '';

  // Filter list barang berdasarkan tipe (pribadi / kelompok)
  const typeFiltered = goodsList.filter(item => item.type === currentGoodsType);

  if (currentGoodsType === 'pribadi') {
    // Filter barang pribadi berdasarkan kategori dan teks pencarian
    const filtered = typeFiltered.filter(item => {
      const matchesCategory = selectedGoodsCategory === 'Semua' || item.category === selectedGoodsCategory;
      const matchesSearch = item.name.toLowerCase().includes(searchVal) || (item.note && item.note.toLowerCase().includes(searchVal));
      return matchesCategory && matchesSearch;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="${isAdmin ? 5 : 4}" style="text-align: center; color: var(--text-secondary); padding: 3rem;">
            🔍 Tidak ada barang bawaan pribadi yang cocok.
          </td>
        </tr>
      `;
      return;
    }

    filtered.forEach((item, index) => {
      // Tentukan warna/gaya badge kategori
      let badgeStyle = '';
      if (item.category === 'Pakaian') badgeStyle = 'background: rgba(99, 102, 241, 0.15); color: #818cf8;';
      else if (item.category === 'Mandi') badgeStyle = 'background: rgba(20, 184, 166, 0.15); color: #2dd4bf;';
      else if (item.category === 'Kerja') badgeStyle = 'background: rgba(234, 179, 8, 0.15); color: #fde047;';
      else if (item.category === 'Tidur') badgeStyle = 'background: rgba(59, 130, 246, 0.15); color: #60a5fa;';
      else badgeStyle = 'background: rgba(168, 85, 247, 0.15); color: #c084fc;';

      // Highlight WAJIB
      let noteContent = item.note || '-';
      if (item.note && item.note.toUpperCase().includes('WAJIB')) {
        noteContent = `<span style="background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); padding: 0.25rem 0.65rem; font-weight: 700; border-radius: 6px; display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.85rem; box-shadow: 0 0 8px rgba(239, 68, 68, 0.2);">⚠️ ${item.note}</span>`;
      }

      // Tombol edit & delete untuk admin
      let actionCell = '';
      if (isAdmin) {
        actionCell = `
          <td style="text-align: center; white-space: nowrap;">
            <button class="edit-btn" style="background: none; border: none; color: var(--color-primary); cursor: pointer; font-size: 1.15rem; padding: 0.25rem;" onclick="openEditGoodsModal('${item._id}')" title="Edit Barang">✏️</button>
            <button class="delete-btn" style="background: none; border: none; color: var(--color-error); cursor: pointer; font-size: 1.15rem; padding: 0.25rem;" onclick="deleteGoodsItem('${item._id}')" title="Hapus Barang">🗑️</button>
          </td>
        `;
      }

      const row = document.createElement('tr');
      row.innerHTML = `
        <td style="font-weight: 600; color: #fff;">${index + 1}</td>
        <td><span class="date-badge" style="padding: 0.3rem 0.6rem; font-size: 0.8rem; border-radius: 8px; font-weight: 600; ${badgeStyle}">${item.category}</span></td>
        <td style="font-weight: 500; color: #fff;">${item.name}</td>
        <td style="color: var(--text-secondary); font-size: 0.95rem;">${noteContent}</td>
        ${actionCell}
      `;
      tbody.appendChild(row);
    });
  } else {
    // Filter barang kelompok berdasarkan teks pencarian
    const filtered = typeFiltered.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchVal) || (item.note && item.note.toLowerCase().includes(searchVal)) || (item.pj && item.pj.toLowerCase().includes(searchVal)) || (item.qty && item.qty.toLowerCase().includes(searchVal));
      return matchesSearch;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; color: var(--text-secondary); padding: 3rem;">
            🔍 Tidak ada barang kelompok yang cocok.
          </td>
        </tr>
      `;
      return;
    }

    filtered.forEach((item, index) => {
      // Highlight WAJIB
      let noteContent = item.note || '-';
      if (item.note && item.note.toUpperCase().includes('WAJIB')) {
        noteContent = `<span style="background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); padding: 0.25rem 0.65rem; font-weight: 700; border-radius: 6px; display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.85rem; box-shadow: 0 0 8px rgba(239, 68, 68, 0.2);">⚠️ ${item.note}</span>`;
      }

      // Penanggung jawab & jumlah
      const pjContent = item.pj || '-';
      const qtyContent = item.qty || '-';

      // Tombol aksi barang kelompok (admin bisa edit & hapus, non-admin HANYA bisa edit)
      let actionCell = '';
      if (isAdmin) {
        actionCell = `
          <td style="text-align: center; white-space: nowrap;">
            <button class="edit-btn" style="background: none; border: none; color: var(--color-primary); cursor: pointer; font-size: 1.15rem; padding: 0.25rem;" onclick="openEditGoodsModal('${item._id}')" title="Edit Barang">✏️</button>
            <button class="delete-btn" style="background: none; border: none; color: var(--color-error); cursor: pointer; font-size: 1.15rem; padding: 0.25rem;" onclick="deleteGoodsItem('${item._id}')" title="Hapus Barang">🗑️</button>
          </td>
        `;
      } else {
        actionCell = `
          <td style="text-align: center; white-space: nowrap;">
            <button class="edit-btn" style="background: none; border: none; color: var(--color-primary); cursor: pointer; font-size: 1.15rem; padding: 0.25rem;" onclick="openEditGoodsModal('${item._id}')" title="Edit Barang">✏️</button>
          </td>
        `;
      }

      const row = document.createElement('tr');
      row.innerHTML = `
        <td style="font-weight: 600; color: #fff;">${index + 1}</td>
        <td style="font-weight: 500; color: #fff;">${item.name}</td>
        <td style="color: var(--color-primary); font-weight: 600; font-size: 0.95rem;">${qtyContent}</td>
        <td style="color: var(--text-secondary); font-size: 0.95rem;">${noteContent}</td>
        <td style="color: var(--color-secondary); font-weight: 600; font-size: 0.95rem;">${pjContent}</td>
        ${actionCell}
      `;
      tbody.appendChild(row);
    });
  }
}

function filterGoods() {
  renderGoods();
}

function filterGoodsByCategory(category) {
  selectedGoodsCategory = category;

  const container = document.getElementById('goods-category-container');
  if (container) {
    const buttons = container.querySelectorAll('.week-btn');
    buttons.forEach(btn => {
      if (btn.innerText.includes(category) || 
          (category === 'Lain-Lain' && btn.innerText.includes('Lainnya')) || 
          (category === 'Semua' && btn.innerText === 'Semua')) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  renderGoods();
}

/* ================= ACTIONS TAMBAH / HAPUS / EDIT BARANG (ADMIN) ================= */

function openAddGoodsModal() {
  const modal = document.getElementById('add-goods-modal');
  if (!modal) return;
  
  // Reset form
  document.getElementById('add-goods-form').reset();
  document.getElementById('goods-form-id').value = '';
  document.getElementById('goods-modal-title').innerText = '📦 Tambah Barang Bawaan Baru';
  
  // Set default visibility
  toggleFormCategoryVisibility('pribadi');
  
  modal.classList.add('active');
}

function openEditGoodsModal(id) {
  const item = goodsList.find(g => g._id === id);
  if (!item) return;

  const modal = document.getElementById('add-goods-modal');
  if (!modal) return;

  // Set form values
  document.getElementById('goods-form-id').value = item._id;
  document.getElementById('goods-form-type').value = item.type;
  document.getElementById('goods-form-name').value = item.name;
  document.getElementById('goods-form-note').value = item.note || '';
  
  if (item.type === 'pribadi') {
    document.getElementById('goods-form-category').value = item.category;
  } else {
    document.getElementById('goods-form-qty').value = item.qty || '';
    document.getElementById('goods-form-pj').value = item.pj || '';
  }

  // Set title
  document.getElementById('goods-modal-title').innerText = '✏️ Edit Barang Bawaan';

  // Toggle visibility
  toggleFormCategoryVisibility(item.type);

  modal.classList.add('active');
}

function closeAddGoodsModal() {
  const modal = document.getElementById('add-goods-modal');
  if (modal) modal.classList.remove('active');
}

function toggleFormCategoryVisibility(type) {
  const wrapper = document.getElementById('goods-form-category-wrapper');
  const pjWrapper = document.getElementById('goods-form-pj-wrapper');
  const qtyWrapper = document.getElementById('goods-form-qty-wrapper');
  const noteLabel = document.getElementById('goods-form-note-label');
  if (wrapper) {
    wrapper.style.display = type === 'pribadi' ? 'block' : 'none';
  }
  if (pjWrapper) {
    pjWrapper.style.display = type === 'kelompok' ? 'block' : 'none';
  }
  if (qtyWrapper) {
    qtyWrapper.style.display = type === 'kelompok' ? 'block' : 'none';
  }
  if (noteLabel) {
    noteLabel.innerText = type === 'pribadi' ? 'Catatan / Jumlah:' : 'Catatan (Note):';
  }
}

async function handleAddGoods(e) {
  e.preventDefault();
  
  const id = document.getElementById('goods-form-id').value;
  const type = document.getElementById('goods-form-type').value;
  const name = document.getElementById('goods-form-name').value;
  const note = document.getElementById('goods-form-note').value;
  const pj = type === 'kelompok' ? document.getElementById('goods-form-pj').value : '-';
  const qty = type === 'kelompok' ? document.getElementById('goods-form-qty').value : '-';
  
  // Jika kelompok, kategori diisi 'Kelompok'
  const category = type === 'pribadi' ? document.getElementById('goods-form-category').value : 'Kelompok';
  
  const payload = { type, name, category, note, pj, qty };
  
  try {
    let res;
    if (id) {
      // Edit mode: PUT
      res = await fetch(`/api/goods/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
    } else {
      // Add mode: POST
      res = await fetch('/api/goods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
    }
    
    const data = await res.json();
    
    if (res.ok) {
      closeAddGoodsModal();
      document.getElementById('add-goods-form').reset();
      toggleFormCategoryVisibility('pribadi');
      
      await fetchGoods();
      renderGoods();
    } else {
      alert(data.error || 'Gagal menyimpan barang.');
    }
  } catch (err) {
    alert('Terjadi kesalahan koneksi.');
  }
}

async function deleteGoodsItem(id) {
  if (!confirm('Apakah Anda yakin ingin menghapus barang bawaan ini?')) return;
  
  try {
    const res = await fetch(`/api/goods/${id}`, {
      method: 'DELETE'
    });
    
    const data = await res.json();
    
    if (res.ok) {
      await fetchGoods();
      renderGoods();
    } else {
      alert(data.error || 'Gagal menghapus barang.');
    }
  } catch (err) {
    alert('Terjadi kesalahan koneksi.');
  }
}

/* ================= ACTIONS PENYESUAIAN JADWAL & ABSENSI (ADMIN) ================= */

function openScheduleOverrideModal() {
  const modal = document.getElementById('override-schedule-modal');
  if (!modal) return;

  // Set default date to today or epoch
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

  const dateInput = document.getElementById('override-date');
  dateInput.value = todayStr < '2026-07-09' ? '2026-07-09' : todayStr;

  loadOverrideDataForDate(dateInput.value);
  modal.classList.add('active');
}

function closeScheduleModal() {
  const modal = document.getElementById('override-schedule-modal');
  if (modal) modal.classList.remove('active');
}

async function loadOverrideDataForDate(date) {
  try {
    // Ambil data override dari backend
    const res = await fetch(`/api/schedule/override/${date}`);
    const data = await res.json();

    // Jika belum ada override, ambil default jadwal untuk tanggal itu
    const scheduleRes = await fetch(`/api/schedule?date=${date}`);
    const defaultSchedule = await scheduleRes.json();

    const daily = data.dailySchedule || {};
    
    // Set daily tasks
    document.getElementById('override-task-team-a').value = daily['TIM A'] || defaultSchedule.dailySchedule['TIM A'].task;
    document.getElementById('override-task-team-b').value = daily['TIM B'] || defaultSchedule.dailySchedule['TIM B'].task;
    document.getElementById('override-task-team-c').value = daily['TIM C'] || defaultSchedule.dailySchedule['TIM C'].task;
    document.getElementById('override-task-team-d').value = daily['TIM D'] || defaultSchedule.dailySchedule['TIM D'].task;

    // Set bathroom piket
    document.getElementById('override-bathroom-team').value = data.bathroomPiketTeam || '';
  } catch (err) {
    console.error('Gagal mengambil data jadwal override:', err);
  }
}

async function handleSaveScheduleOverride(e) {
  e.preventDefault();
  const date = document.getElementById('override-date').value;
  
  const dailySchedule = {
    'TIM A': document.getElementById('override-task-team-a').value,
    'TIM B': document.getElementById('override-task-team-b').value,
    'TIM C': document.getElementById('override-task-team-c').value,
    'TIM D': document.getElementById('override-task-team-d').value
  };

  const bathroomPiketTeam = document.getElementById('override-bathroom-team').value;

  try {
    const res = await fetch('/api/schedule/override', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, dailySchedule, bathroomPiketTeam })
    });

    if (res.ok) {
      alert('Jadwal berhasil disesuaikan!');
      closeScheduleModal();
      // Segarkan tampilan
      fetchDashboardData();
      switchWeek(currentViewingWeek);
    } else {
      const err = await res.json();
      alert(err.error || 'Gagal menyimpan penyesuaian jadwal.');
    }
  } catch (err) {
    alert('Terjadi kesalahan koneksi.');
  }
}

async function handleResetScheduleOverride() {
  const date = document.getElementById('override-date').value;
  if (!confirm(`Apakah Anda yakin ingin mengembalikan jadwal tanggal ${date} ke pengaturan default?`)) return;

  try {
    const res = await fetch(`/api/schedule/override/${date}`, {
      method: 'DELETE'
    });

    if (res.ok) {
      alert('Jadwal dikembalikan ke pengaturan default!');
      closeScheduleModal();
      // Segarkan tampilan
      fetchDashboardData();
      switchWeek(currentViewingWeek);
    } else {
      alert('Gagal mereset jadwal.');
    }
  } catch (err) {
    alert('Terjadi kesalahan koneksi.');
  }
}

async function updateAttendanceStatus(id, newStatus) {
  try {
    const res = await fetch(`/api/attendance/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });

    if (!res.ok) {
      const data = await res.json();
      alert(data.error || 'Gagal memperbarui status absensi.');
      fetchFullAttendance(); // reload to reset dropdown
    }
  } catch (err) {
    alert('Terjadi kesalahan koneksi.');
    fetchFullAttendance();
  }
}

async function deleteAttendanceItem(id) {
  if (!confirm('Apakah Anda yakin ingin menghapus data kehadiran ini secara permanen?')) return;

  try {
    const res = await fetch(`/api/attendance/${id}`, {
      method: 'DELETE'
    });

    if (res.ok) {
      fetchFullAttendance();
    } else {
      alert('Gagal menghapus data absensi.');
    }
  } catch (err) {
    alert('Terjadi kesalahan koneksi.');
  }
}

/* ================= TAB: JOBLIST DIVISI (BISA DIAKSES SEMUA ORANG) ================= */

let selectedJoblistDivision = 'Semua';
let joblistData = [];

async function fetchJoblist() {
  try {
    const res = await fetch('/api/joblist');
    joblistData = await res.json();
  } catch (err) {
    console.error('Gagal mengambil data joblist:', err);
  }
}

function filterJoblistByDivision(divName) {
  selectedJoblistDivision = divName;
  
  // Set active class on division filter buttons
  const container = document.getElementById('joblist-division-filters');
  if (container) {
    const buttons = container.querySelectorAll('.week-btn');
    buttons.forEach(btn => {
      if (btn.innerText === divName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }
  
  renderJoblist();
}

function calculateDaysLeft(dueDateStr) {
  if (!dueDateStr) return 0;
  
  // Set due date to local midnight
  const due = new Date(dueDateStr);
  due.setHours(0, 0, 0, 0);
  
  // Set today date to local midnight
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const diffTime = due.getTime() - today.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

function formatDateIndoShort(dateStr) {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    // YYYY-MM-DD to DD/MM/YY
    return `${parts[2]}/${parts[1]}/${parts[0].substring(2)}`;
  }
  return dateStr;
}

function renderJoblist() {
  const tbody = document.getElementById('joblist-table-body');
  if (!tbody) return;

  tbody.innerHTML = '';

  const filtered = selectedJoblistDivision === 'Semua' 
    ? joblistData 
    : joblistData.filter(item => item.division === selectedJoblistDivision);

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; color: var(--text-secondary); padding: 3rem;">
          🔍 Belum ada pekerjaan di divisi ini.
        </td>
      </tr>
    `;
    return;
  }

  filtered.forEach((item, index) => {
    // Hitung sisa hari
    const daysLeft = calculateDaysLeft(item.dueDate);
    
    // Warnai sisa hari (merah jika terlambat/0, oranye jika sisa 1-2 hari, hijau jika masih lama)
    let daysLeftStyle = 'color: var(--text-primary); font-weight: 600;';
    if (daysLeft < 0) {
      daysLeftStyle = 'color: var(--color-error); font-weight: 700;';
    } else if (daysLeft === 0) {
      daysLeftStyle = 'color: var(--color-accent); font-weight: 700;';
    } else if (daysLeft > 0) {
      daysLeftStyle = 'color: var(--color-success); font-weight: 700;';
    }

    // Set background color dropdown status berdasarkan valuenya
    let selectBg = 'background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3);'; // NOT STARTED
    if (item.status === 'COMPLETED') {
      selectBg = 'background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3);';
    } else if (item.status === 'IN PROGRES') {
      selectBg = 'background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3);';
    }

    const statusSelect = `
      <select class="select-control" style="padding: 0.25rem 0.5rem; font-size: 0.85rem; font-weight: 700; border-radius: 8px; width: 130px; ${selectBg}" onchange="updateJoblistStatus('${item._id}', this.value)">
        <option value="NOT STARTED" style="background:#0b0f19; color:#f87171;" ${item.status === 'NOT STARTED' ? 'selected' : ''}>NOT STARTED</option>
        <option value="IN PROGRES" style="background:#0b0f19; color:#fbbf24;" ${item.status === 'IN PROGRES' ? 'selected' : ''}>IN PROGRES</option>
        <option value="COMPLETED" style="background:#0b0f19; color:#10b981;" ${item.status === 'COMPLETED' ? 'selected' : ''}>COMPLETED</option>
      </select>
    `;

    const row = document.createElement('tr');
    row.innerHTML = `
      <td style="font-weight: 600; color: #fff;">${index + 1}</td>
      <td style="font-weight: 600; color: var(--color-primary);">${item.division}</td>
      <td style="font-weight: 500; color: #fff;">${item.taskName}</td>
      <td style="color: var(--text-secondary); font-size: 0.95rem;">${item.note || '-'}</td>
      <td style="color: var(--text-secondary); font-size: 0.95rem;">${formatDateIndoShort(item.dueDate)}</td>
      <td style="text-align: center; ${daysLeftStyle}">${daysLeft}</td>
      <td style="text-align: center;">${statusSelect}</td>
      <td style="color: var(--text-secondary); font-size: 0.95rem;">${item.progressInfo || '-'}</td>
      <td style="text-align: center; white-space: nowrap;">
        <button class="edit-btn" style="background: none; border: none; color: var(--color-primary); cursor: pointer; font-size: 1.15rem; padding: 0.25rem;" onclick="openEditJoblistModal('${item._id}')" title="Edit Pekerjaan">✏️</button>
        <button class="delete-btn" style="background: none; border: none; color: var(--color-error); cursor: pointer; font-size: 1.15rem; padding: 0.25rem;" onclick="deleteJoblistItem('${item._id}')" title="Hapus Pekerjaan">🗑️</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function openAddJoblistModal() {
  const modal = document.getElementById('joblist-modal');
  if (!modal) return;

  document.getElementById('joblist-modal-title').innerText = '📋 Tambah Pekerjaan Baru';
  document.getElementById('joblist-form-id').value = '';
  document.getElementById('joblist-form').reset();

  modal.classList.add('active');
}

function openEditJoblistModal(id) {
  const modal = document.getElementById('joblist-modal');
  if (!modal) return;

  const item = joblistData.find(i => i._id === id);
  if (!item) return;

  document.getElementById('joblist-modal-title').innerText = '✏️ Edit Pekerjaan Divisi';
  document.getElementById('joblist-form-id').value = item._id;
  document.getElementById('joblist-form-division').value = item.division;
  document.getElementById('joblist-form-taskname').value = item.taskName;
  document.getElementById('joblist-form-note').value = item.note || '';
  document.getElementById('joblist-form-duedate').value = item.dueDate || '';
  document.getElementById('joblist-form-status').value = item.status || 'NOT STARTED';
  document.getElementById('joblist-form-progressinfo').value = item.progressInfo || '';

  modal.classList.add('active');
}

function closeJoblistModal() {
  const modal = document.getElementById('joblist-modal');
  if (modal) modal.classList.remove('active');
}

async function handleSaveJoblist(e) {
  e.preventDefault();
  
  const id = document.getElementById('joblist-form-id').value;
  const division = document.getElementById('joblist-form-division').value;
  const taskName = document.getElementById('joblist-form-taskname').value;
  const note = document.getElementById('joblist-form-note').value;
  const dueDate = document.getElementById('joblist-form-duedate').value;
  const status = document.getElementById('joblist-form-status').value;
  const progressInfo = document.getElementById('joblist-form-progressinfo').value;

  const payload = { division, taskName, note, dueDate, status, progressInfo };

  try {
    let res;
    if (id) {
      res = await fetch(`/api/joblist/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch('/api/joblist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    if (res.ok) {
      closeJoblistModal();
      await fetchJoblist();
      renderJoblist();
    } else {
      const err = await res.json();
      alert(err.error || 'Gagal menyimpan pekerjaan.');
    }
  } catch (err) {
    alert('Terjadi kesalahan koneksi.');
  }
}

async function updateJoblistStatus(id, newStatus) {
  const item = joblistData.find(i => i._id === id);
  if (!item) return;

  const payload = { 
    division: item.division,
    taskName: item.taskName,
    note: item.note,
    dueDate: item.dueDate,
    status: newStatus,
    progressInfo: item.progressInfo
  };

  try {
    const res = await fetch(`/api/joblist/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      await fetchJoblist();
      renderJoblist();
    } else {
      alert('Gagal memperbarui status pekerjaan.');
    }
  } catch (err) {
    alert('Terjadi kesalahan koneksi.');
  }
}

async function deleteJoblistItem(id) {
  if (!confirm('Apakah Anda yakin ingin menghapus rencana kerja ini?')) return;

  try {
    const res = await fetch(`/api/joblist/${id}`, {
      method: 'DELETE'
    });

    if (res.ok) {
      await fetchJoblist();
      renderJoblist();
    } else {
      alert('Gagal menghapus pekerjaan.');
    }
  } catch (err) {
    alert('Terjadi kesalahan koneksi.');
  }
}

/* ================= ACTIONS EXPORT EXCEL (SHEETJS) ================= */

async function exportAllToExcel() {
  try {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Daftar Kehadiran
    const resAtt = await fetch('/api/attendance/all');
    const attList = await resAtt.json();
    const attData = attList.map((item, idx) => ({
      'No': idx + 1,
      'Nama Anggota': item.name,
      'Divisi': item.division || '-',
      'Tim': item.team,
      'Tanggal': item.date,
      'Jam Absen': item.time,
      'Tugas Piket': item.task,
      'Status Kehadiran': item.status
    }));
    const wsAtt = XLSX.utils.json_to_sheet(attData);
    XLSX.utils.book_append_sheet(wb, wsAtt, 'Daftar Kehadiran');

    // Sheet 2: Inventaris Barang Pribadi
    const resGoods = await fetch('/api/goods');
    const goodsList = await resGoods.json();
    
    const pribadiData = goodsList.filter(i => i.type === 'pribadi').map((item, idx) => ({
      'No': idx + 1,
      'Kategori Kebutuhan': item.category,
      'Nama Perlengkapan': item.name,
      'Catatan': item.note
    }));
    const wsPribadi = XLSX.utils.json_to_sheet(pribadiData);
    XLSX.utils.book_append_sheet(wb, wsPribadi, 'Barang Pribadi');

    // Sheet 3: Inventaris Barang Kelompok
    const kelompokData = goodsList.filter(i => i.type === 'kelompok').map((item, idx) => ({
      'No': idx + 1,
      'Nama Barang': item.name,
      'Jumlah (Qty)': item.qty,
      'Catatan / Note': item.note,
      'Penanggung Jawab (PJ)': item.pj
    }));
    const wsKelompok = XLSX.utils.json_to_sheet(kelompokData);
    XLSX.utils.book_append_sheet(wb, wsKelompok, 'Barang Kelompok');

    // Sheet 4: Joblist Divisi
    const resJob = await fetch('/api/joblist');
    const jobList = await resJob.json();
    const jobData = jobList.map((item, idx) => {
      const daysLeft = calculateDaysLeft(item.dueDate);
      return {
        'No': idx + 1,
        'Divisi': item.division,
        'Nama Tugas': item.taskName,
        'Catatan Rencana': item.note,
        'Due Date': item.dueDate,
        'Sisa Hari': daysLeft,
        'Status Progres': item.status,
        'Keterangan Progres': item.progressInfo
      };
    });
    const wsJob = XLSX.utils.json_to_sheet(jobData);
    XLSX.utils.book_append_sheet(wb, wsJob, 'Joblist Divisi');

    // Sheet 5: Struktur & Jobdesk Divisi (Static)
    const jobdeskData = [
      { Divisi: 'Ketua', PIC: 'Yustian Atha Tsany', Jobdesk: 'Memimpin dan mengkoordinasikan panitia, bertanggung jawab atas program kerja, mengambil keputusan, menjalin komunikasi eksternal/internal, mengawasi divisi, mengevaluasi kegiatan.' },
      { Divisi: 'Sekretaris', PIC: 'Naila Rahma Normalita', Jobdesk: 'Mengelola administrasi dan surat-menyurat, membuat proposal/notulen/laporan, menyusun jadwal kegiatan/agenda rapat, mengarsipkan dokumen penting kepanitiaan.' },
      { Divisi: 'Bendahara', PIC: 'Alfio Valentino Pratama', Jobdesk: 'Mengelola pemasukan dan pengeluaran keuangan, menyusun anggaran biaya, mencatat seluruh transaksi, menyimpan bukti nota pembayaran, menyusun LPJ.' },
      { Divisi: 'Acara', PIC: 'Meifita Wida Aisya, Fayrouzzahra Hamsah', Jobdesk: 'Menyusun konsep & teknis pelaksanaan, membuat rundown kegiatan, mengatur jalannya agenda, koordinasi PIC acara, penyiapan kebutuhan teknis.' },
      { Divisi: 'Humas', PIC: 'Ananda Putri Aprilia, Hanifah Nur Khansa', Jobdesk: 'Komunikasi eksternal (masyarakat, perangkat desa, sponsor), menyampaikan info kegiatan, mengurus perizinan posko, publikasi kegiatan.' },
      { Divisi: 'Logistik', PIC: 'Firzan Qusnul Fajri, Jecionta Ginting', Jobdesk: 'Menyiapkan & mendata peralatan posko, distribusi alat, memastikan kesiapan perlengkapan sebelum dimulai, tanggung jawab penyimpanan barang.' },
      { Divisi: 'PDD', PIC: 'Nanda Rahmatuz Zahra, Muhammad Dzikri Bukhari', Jobdesk: 'Desain poster/banner/pamflet publikasi, dokumentasi foto & video kegiatan, mengelola akun medsos posko, menyusun ide konten kreatif.' }
    ];
    const wsJobdesk = XLSX.utils.json_to_sheet(jobdeskData);
    XLSX.utils.book_append_sheet(wb, wsJobdesk, 'Jobdesk Divisi');

    // Sheet 6: Content List
    try {
      const resContent = await fetch('/api/contentlist');
      const contentList = await resContent.json();
      const contentData = contentList.map((item, idx) => ({
        'No': idx + 1,
        'Konten': item.name,
        'Pelaksanaan': item.executionDate,
        'Checklist': item.status,
        'Link Referensi': item.refLink || '-'
      }));
      const wsContent = XLSX.utils.json_to_sheet(contentData);
      XLSX.utils.book_append_sheet(wb, wsContent, 'Content List');
    } catch (err) {
      console.error('Gagal mengambil data content list untuk export global:', err);
    }

    // Sheet 7: Program Kerja
    try {
      const resProker = await fetch('/api/programkerja');
      const prokerList = await resProker.json();
      const prokerData = prokerList.map((item, idx) => ({
        'No': idx + 1,
        'Tipe': item.type,
        'Program Kerja': item.programKerja,
        'Bidang': item.bidang,
        'Rincian Program Kerja': item.rincian || '-',
        'Pelaksanaan': item.pelaksanaan || '-',
        'Penanggung Jawab': item.pj || '-'
      }));
      const wsProker = XLSX.utils.json_to_sheet(prokerData);
      XLSX.utils.book_append_sheet(wb, wsProker, 'Program Kerja');
    } catch (err) {
      console.error('Gagal mengambil data program kerja untuk export global:', err);
    }

    // Sheet 8: RAB (Semua Type)
    try {
      const resRab = await fetch('/api/rab');
      const rabList = await resRab.json();
      const rabData = rabList.map((item, idx) => ({
        'No': idx + 1,
        'Tipe RAB': item.type,
        'Nama Proker': item.prokerName || '-',
        'Kebutuhan': item.kebutuhan,
        'Satuan': item.satuan || '-',
        'Volume': item.volume,
        'Harga Satuan': item.hargaSatuan,
        'Harga Total (Jumlah)': item.type === 'Konsumsi' || item.type === 'Proker' ? (item.volume * item.hargaSatuan) : item.harga,
        'Anggota': item.anggota || 11
      }));
      const wsRab = XLSX.utils.json_to_sheet(rabData);
      XLSX.utils.book_append_sheet(wb, wsRab, 'RAB (Semua)');
    } catch (err) {
      console.error('Gagal mengambil data RAB untuk export global:', err);
    }

    // Sheet 9: Cashflow
    try {
      const resCf = await fetch('/api/cashflow');
      const cfList = await resCf.json();
      let saldo = 0;
      const cfData = cfList.map((item, idx) => {
        let pemasukan = 0;
        let pengeluaran = 0;
        if (item.jenis === 'Pemasukan') {
          pemasukan = item.nominal;
          saldo += item.nominal;
        } else {
          pengeluaran = item.nominal;
          saldo -= item.nominal;
        }
        return {
          'No': idx + 1,
          'Tanggal': item.tanggal,
          'Keterangan': item.keterangan,
          'Pemasukan': pemasukan,
          'Pengeluaran': pengeluaran,
          'Saldo': saldo
        };
      });
      const wsCf = XLSX.utils.json_to_sheet(cfData);
      XLSX.utils.book_append_sheet(wb, wsCf, 'Cashflow');
    } catch (err) {
      console.error('Gagal mengambil data Cashflow untuk export global:', err);
    }

    // Tulis File Excel
    XLSX.writeFile(wb, 'Laporan_Semua_Data_Posko_Tanjung_Sari.xlsx');
  } catch (err) {
    console.error('Export gagal:', err);
    alert('Terjadi kesalahan saat mengunduh berkas Excel.');
  }
}

async function exportTabToExcel(tabId) {
  try {
    const wb = XLSX.utils.book_new();
    let filename = 'Data_Export.xlsx';

    if (tabId === 'daftar-hadir') {
      const res = await fetch('/api/attendance/all');
      const list = await res.json();
      
      const todayDate = todayScheduleData ? todayScheduleData.date : new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
      const filtered = currentAttendanceFilter === 'today'
        ? list.filter(item => item.date === todayDate)
        : list;

      const data = filtered.map((item, idx) => ({
        'No': idx + 1,
        'Nama Anggota': item.name,
        'Divisi': item.division || '-',
        'Tim': item.team,
        'Tanggal': item.date,
        'Jam Absen': item.time,
        'Tugas Piket': item.task,
        'Status': item.status
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, currentAttendanceFilter === 'today' ? 'Absen Hari Ini' : 'Daftar Hadir');
      filename = currentAttendanceFilter === 'today' ? 'Laporan_Absen_Hari_Ini.xlsx' : 'Laporan_Daftar_Hadir_Lengkap.xlsx';
    } 
    else if (tabId === 'barang-bawaan') {
      const res = await fetch('/api/goods');
      const list = await res.json();
      const typeFiltered = list.filter(i => i.type === currentGoodsType);
      
      if (currentGoodsType === 'pribadi') {
        const data = typeFiltered.map((item, idx) => ({
          'No': idx + 1,
          'Kategori': item.category,
          'Nama Perlengkapan': item.name,
          'Catatan': item.note
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, 'Barang Pribadi');
        filename = 'Laporan_Barang_Bawaan_Pribadi.xlsx';
      } else {
        const data = typeFiltered.map((item, idx) => ({
          'No': idx + 1,
          'Nama Barang': item.name,
          'Jumlah (Qty)': item.qty,
          'Catatan': item.note,
          'Penanggung Jawab (PJ)': item.pj
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, 'Barang Kelompok');
        filename = 'Laporan_Barang_Bawaan_Kelompok.xlsx';
      }
    }
    else if (tabId === 'joblist') {
      const res = await fetch('/api/joblist');
      const list = await res.json();
      
      const filtered = selectedJoblistDivision === 'Semua' 
        ? list 
        : list.filter(i => i.division === selectedJoblistDivision);
      
      const data = filtered.map((item, idx) => {
        const daysLeft = calculateDaysLeft(item.dueDate);
        return {
          'No': idx + 1,
          'Divisi': item.division,
          'Nama Tugas': item.taskName,
          'Catatan': item.note,
          'Due Date': item.dueDate,
          'Sisa Hari': daysLeft,
          'Status Progres': item.status,
          'Keterangan Progres': item.progressInfo
        };
      });
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, `Joblist - ${selectedJoblistDivision}`);
      filename = `Laporan_Joblist_Divisi_${selectedJoblistDivision}.xlsx`;
    }
    else if (tabId === 'jobdesk') {
      const data = [
        { Divisi: 'Ketua', PIC: 'Yustian Atha Tsany', Jobdesk: 'Memimpin dan mengkoordinasikan panitia, bertanggung jawab atas program kerja, mengambil keputusan, menjalin komunikasi eksternal/internal, mengawasi divisi, mengevaluasi kegiatan.' },
        { Divisi: 'Sekretaris', PIC: 'Naila Rahma Normalita', Jobdesk: 'Mengelola administrasi dan surat-menyurat, membuat proposal/notulen/laporan, menyusun jadwal kegiatan/agenda rapat, mengarsipkan dokumen penting kepanitiaan.' },
        { Divisi: 'Bendahara', PIC: 'Alfio Valentino Pratama', Jobdesk: 'Mengelola pemasukan dan pengeluaran keuangan, menyusun anggaran biaya, mencatat seluruh transaksi, menyimpan bukti nota pembayaran, menyusun LPJ.' },
        { Divisi: 'Acara', PIC: 'Meifita Wida Aisya, Fayrouzzahra Hamsah', Jobdesk: 'Menyusun konsep & teknis pelaksanaan, membuat rundown kegiatan, mengatur jalannya agenda, koordinasi PIC acara, penyiapan kebutuhan teknis.' },
        { Divisi: 'Humas', PIC: 'Ananda Putri Aprilia, Hanifah Nur Khansa', Jobdesk: 'Komunikasi eksternal (masyarakat, perangkat desa, sponsor), menyampaikan info kegiatan, mengurus perizinan posko, publikasi kegiatan.' },
        { Divisi: 'Logistik', PIC: 'Firzan Qusnul Fajri, Jecionta Ginting', Jobdesk: 'Menyiapkan & mendata peralatan posko, distribusi alat, memastikan kesiapan perlengkapan sebelum dimulai, tanggung jawab penyimpanan barang.' },
        { Divisi: 'PDD', PIC: 'Nanda Rahmatuz Zahra, Muhammad Dzikri Bukhari', Jobdesk: 'Desain poster/banner/pamflet publikasi, dokumentasi foto & video kegiatan, mengelola akun medsos posko, menyusun ide konten kreatif.' }
      ];
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Jobdesk Divisi');
      filename = 'Laporan_Jobdesk_Divisi.xlsx';
    }
    else if (tabId === 'jadwal-mingguan') {
      const table = document.querySelector('#tab-jadwal-mingguan .premium-table');
      if (table) {
        const ws = XLSX.utils.table_to_sheet(table);
        XLSX.utils.book_append_sheet(wb, ws, `Jadwal Minggu ${currentViewingWeek}`);
        filename = `Laporan_Jadwal_Piket_Minggu_${currentViewingWeek}.xlsx`;
      } else {
        alert('Tabel jadwal tidak ditemukan.');
        return;
      }
    }
    else if (tabId === 'checklist-tugas') {
      const itemsEl = document.querySelectorAll('.checklist-item');
      const data = Array.from(itemsEl).map((el, idx) => {
        const name = el.querySelector('.checklist-name').innerText;
        const team = el.querySelector('.checklist-task-badge').innerText;
        const isCompleted = el.querySelector('input[type="checkbox"]').checked;
        return {
          'No': idx + 1,
          'Nama Anggota': name,
          'Tim': team,
          'Status Checklist Hari Ini': isCompleted ? 'SELESAI' : 'BELUM SELESAI'
        };
      });
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Checklist Tugas');
      filename = 'Laporan_Checklist_Tugas_Hari_Ini.xlsx';
    }
    else if (tabId === 'contentlist') {
      const res = await fetch('/api/contentlist');
      const list = await res.json();
      const data = list.map((item, idx) => ({
        'No': idx + 1,
        'Nama Konten': item.name,
        'Pelaksanaan': item.executionDate,
        'Checklist': item.status,
        'Link Referensi': item.refLink || '-'
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Content List');
      filename = 'Laporan_Content_List.xlsx';
    }
    else if (tabId === 'programkerja') {
      const res = await fetch('/api/programkerja');
      const list = await res.json();
      const filtered = selectedProkerType === 'Semua' ? list : list.filter(i => i.type === selectedProkerType);
      const data = filtered.map((item, idx) => ({
        'No': idx + 1,
        'Tipe': item.type,
        'Program Kerja': item.programKerja,
        'Bidang': item.bidang,
        'Rincian Program Kerja': item.rincian || '-',
        'Pelaksanaan': item.pelaksanaan || '-',
        'Penanggung Jawab': item.pj || '-'
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, `Proker - ${selectedProkerType}`);
      filename = `Laporan_Program_Kerja_${selectedProkerType}.xlsx`;
    }
    else if (tabId === 'rab') {
      if (currentRabType === 'Cashflow') {
        const res = await fetch('/api/cashflow');
        const list = await res.json();
        let saldo = 0;
        const data = list.map((item, idx) => {
          let pemasukan = 0;
          let pengeluaran = 0;
          if (item.jenis === 'Pemasukan') {
            pemasukan = item.nominal;
            saldo += item.nominal;
          } else {
            pengeluaran = item.nominal;
            saldo -= item.nominal;
          }
          return {
            'No': idx + 1,
            'Tanggal': item.tanggal,
            'Keterangan': item.keterangan,
            'Pemasukan': pemasukan,
            'Pengeluaran': pengeluaran,
            'Saldo': saldo
          };
        });
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, 'Cashflow');
        filename = 'Laporan_Cashflow.xlsx';
      } else {
        const res = await fetch('/api/rab');
        const list = await res.json();
        const filtered = currentRabType === 'Ringkasan' ? list : list.filter(i => i.type === currentRabType);
        
        const data = filtered.map((item, idx) => ({
          'No': idx + 1,
          'Tipe RAB': item.type,
          'Nama Proker': item.prokerName || '-',
          'Kebutuhan': item.kebutuhan,
          'Satuan': item.satuan || '-',
          'Volume': item.volume,
          'Harga Satuan': item.hargaSatuan,
          'Harga Total (Jumlah)': item.type === 'Konsumsi' || item.type === 'Proker' ? (item.volume * item.hargaSatuan) : item.harga,
          'Anggota': item.anggota || 11
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, `RAB - ${currentRabType}`);
        filename = `Laporan_RAB_${currentRabType}.xlsx`;
      }
    }

    XLSX.writeFile(wb, filename);
  } catch (err) {
    console.error('Export gagal:', err);
    alert('Terjadi kesalahan saat mengunduh data tab ini.');
  }
}

/* ================= TAB: CONTENT LIST (BISA DIAKSES SEMUA ORANG) ================= */

let contentListData = [];

async function fetchContentList() {
  try {
    const res = await fetch('/api/contentlist');
    contentListData = await res.json();
  } catch (err) {
    console.error('Gagal mengambil data content list:', err);
  }
}

function renderContentList() {
  const tbody = document.getElementById('contentlist-table-body');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (contentListData.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--text-secondary); padding: 3rem;">
          🔍 Belum ada rencana konten.
        </td>
      </tr>
    `;
    return;
  }

  contentListData.forEach((item, index) => {
    // Set background color dropdown status berdasarkan valuenya
    let selectBg = 'background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3);'; // Not yet
    if (item.status === 'Done') {
      selectBg = 'background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3);';
    }

    const statusSelect = `
      <select class="select-control" style="padding: 0.25rem 0.5rem; font-size: 0.85rem; font-weight: 700; border-radius: 8px; width: 120px; ${selectBg}" onchange="updateContentStatus('${item._id}', this.value)">
        <option value="Not yet" style="background:#0b0f19; color:#f87171;" ${item.status === 'Not yet' ? 'selected' : ''}>Not yet</option>
        <option value="Done" style="background:#0b0f19; color:#10b981;" ${item.status === 'Done' ? 'selected' : ''}>Done</option>
      </select>
    `;

    // Render link referensi jika ada
    let linkHtml = '-';
    if (item.refLink) {
      linkHtml = `<a href="${item.refLink}" target="_blank" style="color: var(--color-primary); text-decoration: underline; font-weight: 500;">Link Referensi</a>`;
    }

    const row = document.createElement('tr');
    row.innerHTML = `
      <td style="font-weight: 600; color: #fff;">${index + 1}</td>
      <td style="font-weight: 500; color: #fff;">${item.name}</td>
      <td style="color: var(--text-secondary); font-size: 0.95rem;">${item.executionDate}</td>
      <td style="text-align: center;">${statusSelect}</td>
      <td>${linkHtml}</td>
      <td style="text-align: center; white-space: nowrap;">
        <button class="edit-btn" style="background: none; border: none; color: var(--color-primary); cursor: pointer; font-size: 1.15rem; padding: 0.25rem;" onclick="openEditContentModal('${item._id}')" title="Edit Konten">✏️</button>
        <button class="delete-btn" style="background: none; border: none; color: var(--color-error); cursor: pointer; font-size: 1.15rem; padding: 0.25rem;" onclick="deleteContentItem('${item._id}')" title="Hapus Konten">🗑️</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function openAddContentModal() {
  const modal = document.getElementById('contentlist-modal');
  if (!modal) return;

  document.getElementById('contentlist-modal-title').innerText = '🎬 Tambah Rencana Konten';
  document.getElementById('contentlist-form-id').value = '';
  document.getElementById('contentlist-form').reset();

  modal.classList.add('active');
}

function openEditContentModal(id) {
  const modal = document.getElementById('contentlist-modal');
  if (!modal) return;

  const item = contentListData.find(i => i._id === id);
  if (!item) return;

  document.getElementById('contentlist-modal-title').innerText = '✏️ Edit Rencana Konten';
  document.getElementById('contentlist-form-id').value = item._id;
  document.getElementById('contentlist-form-name').value = item.name;
  document.getElementById('contentlist-form-date').value = item.executionDate;
  document.getElementById('contentlist-form-status').value = item.status || 'Not yet';
  document.getElementById('contentlist-form-link').value = item.refLink || '';

  modal.classList.add('active');
}

function closeContentModal() {
  const modal = document.getElementById('contentlist-modal');
  if (modal) modal.classList.remove('active');
}

async function handleSaveContent(e) {
  e.preventDefault();
  
  const id = document.getElementById('contentlist-form-id').value;
  const name = document.getElementById('contentlist-form-name').value;
  const executionDate = document.getElementById('contentlist-form-date').value;
  const status = document.getElementById('contentlist-form-status').value;
  const refLink = document.getElementById('contentlist-form-link').value;

  const payload = { name, executionDate, status, refLink };

  try {
    let res;
    if (id) {
      res = await fetch(`/api/contentlist/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch('/api/contentlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    if (res.ok) {
      closeContentModal();
      await fetchContentList();
      renderContentList();
    } else {
      const err = await res.json();
      alert(err.error || 'Gagal menyimpan rencana konten.');
    }
  } catch (err) {
    alert('Terjadi kesalahan koneksi.');
  }
}

async function updateContentStatus(id, newStatus) {
  const item = contentListData.find(i => i._id === id);
  if (!item) return;

  const payload = { 
    name: item.name,
    executionDate: item.executionDate,
    status: newStatus,
    refLink: item.refLink
  };

  try {
    const res = await fetch(`/api/contentlist/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      await fetchContentList();
      renderContentList();
    } else {
      alert('Gagal memperbarui status checklist.');
    }
  } catch (err) {
    alert('Terjadi kesalahan koneksi.');
  }
}

async function deleteContentItem(id) {
  if (!confirm('Apakah Anda yakin ingin menghapus rencana konten ini?')) return;

  try {
    const res = await fetch(`/api/contentlist/${id}`, {
      method: 'DELETE'
    });

    if (res.ok) {
      await fetchContentList();
      renderContentList();
    } else {
      alert('Gagal menghapus rencana konten.');
    }
  } catch (err) {
    alert('Terjadi kesalahan koneksi.');
  }
}

/* ================= TAB: PROGRAM KERJA (BISA DIAKSES SEMUA ORANG) ================= */

let selectedProkerType = 'Semua';
let programKerjaData = [];

async function fetchProgramKerja() {
  try {
    const res = await fetch('/api/programkerja');
    programKerjaData = await res.json();
  } catch (err) {
    console.error('Gagal mengambil data program kerja:', err);
  }
}

function filterProkerByType(type) {
  selectedProkerType = type;
  
  // Set active class on filter buttons
  const container = document.getElementById('proker-type-filters');
  if (container) {
    const buttons = container.querySelectorAll('.week-btn');
    buttons.forEach(btn => {
      if (btn.innerText === type) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }
  
  renderProgramKerja();
}

function renderProgramKerja() {
  const tbody = document.getElementById('programkerja-table-body');
  if (!tbody) return;

  tbody.innerHTML = '';

  const filtered = selectedProkerType === 'Semua' 
    ? programKerjaData 
    : programKerjaData.filter(item => item.type === selectedProkerType);

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; color: var(--text-secondary); padding: 3rem;">
          🔍 Belum ada program kerja. Silakan klik tombol "+ Tambah Proker" untuk menambahkan.
        </td>
      </tr>
    `;
    return;
  }

  filtered.forEach((item, index) => {
    // Styling badge tipe
    let typeBadge = `<span class="checklist-task-badge" style="background: rgba(99, 102, 241, 0.15); color: #a5b4fc; border: 1px solid rgba(99, 102, 241, 0.3); font-size: 0.8rem; padding: 0.25rem 0.5rem; border-radius: 8px;">${item.type}</span>`;
    if (item.type === 'Wajib') {
      typeBadge = `<span class="checklist-task-badge" style="background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); font-size: 0.8rem; padding: 0.25rem 0.5rem; border-radius: 8px;">${item.type}</span>`;
    }

    const row = document.createElement('tr');
    row.innerHTML = `
      <td style="font-weight: 600; color: #fff;">${index + 1}</td>
      <td style="text-align: center;">${typeBadge}</td>
      <td style="font-weight: 600; color: var(--color-primary);">${item.programKerja}</td>
      <td style="font-weight: 500; color: #fff;">${item.bidang}</td>
      <td style="color: var(--text-secondary); font-size: 0.95rem; white-space: pre-wrap;">${item.rincian || '-'}</td>
      <td style="color: var(--text-secondary); font-size: 0.95rem;">${item.pelaksanaan || '-'}</td>
      <td style="font-weight: 500; color: #fff;">${item.pj || '-'}</td>
      <td style="text-align: center; white-space: nowrap;">
        <button class="edit-btn" style="background: none; border: none; color: var(--color-primary); cursor: pointer; font-size: 1.15rem; padding: 0.25rem;" onclick="openEditProkerModal('${item._id}')" title="Edit Proker">✏️</button>
        <button class="delete-btn" style="background: none; border: none; color: var(--color-error); cursor: pointer; font-size: 1.15rem; padding: 0.25rem;" onclick="deleteProkerItem('${item._id}')" title="Hapus Proker">🗑️</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function openAddProkerModal() {
  const modal = document.getElementById('programkerja-modal');
  if (!modal) return;

  document.getElementById('programkerja-modal-title').innerText = '🚀 Tambah Program Kerja';
  document.getElementById('programkerja-form-id').value = '';
  document.getElementById('programkerja-form').reset();

  modal.classList.add('active');
}

function openEditProkerModal(id) {
  const modal = document.getElementById('programkerja-modal');
  if (!modal) return;

  const item = programKerjaData.find(i => i._id === id);
  if (!item) return;

  document.getElementById('programkerja-modal-title').innerText = '✏️ Edit Program Kerja';
  document.getElementById('programkerja-form-id').value = item._id;
  document.getElementById('programkerja-form-name').value = item.programKerja;
  document.getElementById('programkerja-form-type').value = item.type;
  document.getElementById('programkerja-form-bidang').value = item.bidang;
  document.getElementById('programkerja-form-rincian').value = item.rincian || '';
  document.getElementById('programkerja-form-pelaksanaan').value = item.pelaksanaan || '';
  document.getElementById('programkerja-form-pj').value = item.pj || '';

  modal.classList.add('active');
}

function closeProkerModal() {
  const modal = document.getElementById('programkerja-modal');
  if (modal) modal.classList.remove('active');
}

async function handleSaveProker(e) {
  e.preventDefault();
  
  const id = document.getElementById('programkerja-form-id').value;
  const programKerja = document.getElementById('programkerja-form-name').value;
  const type = document.getElementById('programkerja-form-type').value;
  const bidang = document.getElementById('programkerja-form-bidang').value;
  const rincian = document.getElementById('programkerja-form-rincian').value;
  const pelaksanaan = document.getElementById('programkerja-form-pelaksanaan').value;
  const pj = document.getElementById('programkerja-form-pj').value;

  const payload = { programKerja, type, bidang, rincian, pelaksanaan, pj };

  try {
    let res;
    if (id) {
      res = await fetch(`/api/programkerja/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch('/api/programkerja', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    if (res.ok) {
      closeProkerModal();
      await fetchProgramKerja();
      renderProgramKerja();
    } else {
      const err = await res.json();
      alert(err.error || 'Gagal menyimpan program kerja.');
    }
  } catch (err) {
    alert('Terjadi kesalahan koneksi.');
  }
}

async function deleteProkerItem(id) {
  if (!confirm('Apakah Anda yakin ingin menghapus program kerja ini?')) return;

  try {
    const res = await fetch(`/api/programkerja/${id}`, {
      method: 'DELETE'
    });

    if (res.ok) {
      await fetchProgramKerja();
      renderProgramKerja();
    } else {
      alert('Gagal menghapus program kerja.');
    }
  } catch (err) {
    alert('Terjadi kesalahan koneksi.');
  }
}

/* ================= TAB: MANAJEMEN RAB (BISA DIAKSES SEMUA ORANG) ================= */

let currentRabType = 'Posko';
let rabData = [];

async function fetchRab() {
  try {
    const res = await fetch('/api/rab');
    rabData = await res.json();
  } catch (err) {
    console.error('Gagal mengambil data RAB:', err);
  }
}

function switchRabType(type) {
  currentRabType = type;
  
  // Set active class on filter buttons
  const container = document.getElementById('rab-type-filters');
  if (container) {
    const buttons = container.querySelectorAll('.week-btn');
    buttons.forEach(btn => {
      if ((type === 'Posko' && btn.innerText === 'RAB Posko') ||
          (type === 'Konsumsi' && btn.innerText === 'RAB Konsumsi') ||
          (type === 'Transportasi' && btn.innerText === 'RAB Transportasi') ||
          (type === 'Proker' && btn.innerText === 'RAB Proker') ||
          (type === 'Ringkasan' && btn.innerText === 'Ringkasan Total') ||
          (type === 'Cashflow' && btn.innerText === 'Cashflow')) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  // Tampilkan/sembunyikan tombol tambah item
  const addBtn = document.getElementById('add-rab-btn');
  if (addBtn) {
    if (type === 'Ringkasan') {
      addBtn.style.display = 'none';
    } else {
      addBtn.style.display = 'block';
    }
  }
  
  renderRab();
}

function formatRupiah(num) {
  if (num === undefined || num === null) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
}

function calculateRabTotal(type) {
  const items = rabData.filter(i => i.type === type);
  if (type === 'Posko') {
    return items.reduce((sum, item) => sum + (item.harga || 0), 0);
  } else if (type === 'Konsumsi') {
    return items.reduce((sum, item) => sum + ((item.volume || 0) * (item.hargaSatuan || 0)), 0);
  } else if (type === 'Transportasi') {
    return items.reduce((sum, item) => sum + (item.harga || 0), 0);
  } else if (type === 'Proker') {
    return items.reduce((sum, item) => sum + ((item.volume || 0) * (item.hargaSatuan || 0)), 0);
  }
  return 0;
}

function renderRab() {
  const container = document.getElementById('rab-table-container');
  if (!container) return;

  container.innerHTML = '';

  if (currentRabType === 'Cashflow') {
    renderCashflow(container);
    return;
  }

  const items = rabData.filter(item => item.type === currentRabType);

  if (currentRabType === 'Posko') {
    let tbodyHtml = '';
    let grandTotal = 0;

    if (items.length === 0) {
      tbodyHtml = `<tr><td colspan="7" style="text-align: center; color: var(--text-secondary); padding: 3rem;">🔍 Belum ada item RAB Posko.</td></tr>`;
    } else {
      items.forEach((item, index) => {
        const jumlah = item.harga || 0;
        const iuran = jumlah / (item.anggota || 11);
        grandTotal += jumlah;

        tbodyHtml += `
          <tr>
            <td style="font-weight: 600; color: #fff;">${index + 1}</td>
            <td style="font-weight: 600; color: var(--color-primary);">${item.kebutuhan}</td>
            <td style="text-align: center;">${item.volume}</td>
            <td>${formatRupiah(item.harga)}</td>
            <td style="text-align: center;">${item.anggota}</td>
            <td>${formatRupiah(iuran)}</td>
            <td style="font-weight: bold; color: #fff;">${formatRupiah(jumlah)}</td>
            <td style="text-align: center; white-space: nowrap;">
              <button class="edit-btn" style="background: none; border: none; color: var(--color-primary); cursor: pointer; font-size: 1.15rem; padding: 0.25rem;" onclick="openEditRabModal('${item._id}')">✏️</button>
              <button class="delete-btn" style="background: none; border: none; color: var(--color-error); cursor: pointer; font-size: 1.15rem; padding: 0.25rem;" onclick="deleteRabItem('${item._id}')">🗑️</button>
            </td>
          </tr>
        `;
      });
    }

    container.innerHTML = `
      <table class="premium-table">
        <thead>
          <tr>
            <th style="width: 60px;">No</th>
            <th>Kebutuhan</th>
            <th style="width: 130px; text-align: center;">Volume/Jumlah</th>
            <th>Harga</th>
            <th style="width: 100px; text-align: center;">Anggota</th>
            <th>Harga Satuan/Iuran</th>
            <th>Jumlah</th>
            <th style="width: 100px; text-align: center;">Aksi</th>
          </tr>
        </thead>
        <tbody>
          ${tbodyHtml}
        </tbody>
        <tfoot>
          <tr style="background: rgba(16, 185, 129, 0.1); font-weight: bold;">
            <td colspan="6" style="text-align: right; color: #fff; font-size: 1rem; padding: 1.25rem;">Jumlah Total:</td>
            <td style="color: var(--color-success); font-size: 1.1rem; padding: 1.25rem;">${formatRupiah(grandTotal)}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    `;
  }
  else if (currentRabType === 'Konsumsi') {
    let tbodyHtml = '';
    let grandTotal = 0;

    if (items.length === 0) {
      tbodyHtml = `<tr><td colspan="7" style="text-align: center; color: var(--text-secondary); padding: 3rem;">🔍 Belum ada item RAB Konsumsi.</td></tr>`;
    } else {
      items.forEach((item, index) => {
        const jumlah = item.volume * item.hargaSatuan;
        grandTotal += jumlah;

        tbodyHtml += `
          <tr>
            <td style="font-weight: 600; color: #fff;">${index + 1}</td>
            <td style="font-weight: 600; color: var(--color-primary);">${item.kebutuhan}</td>
            <td style="text-align: center;"><span class="checklist-task-badge" style="background: rgba(20, 184, 166, 0.15); color: #2dd4bf; border: 1px solid rgba(20, 184, 166, 0.3); font-size: 0.8rem;">${item.satuan || '-'}</span></td>
            <td style="text-align: center;">${item.volume}</td>
            <td>${formatRupiah(item.hargaSatuan)}</td>
            <td style="font-weight: bold; color: #fff;">${formatRupiah(jumlah)}</td>
            <td style="text-align: center; white-space: nowrap;">
              <button class="edit-btn" style="background: none; border: none; color: var(--color-primary); cursor: pointer; font-size: 1.15rem; padding: 0.25rem;" onclick="openEditRabModal('${item._id}')">✏️</button>
              <button class="delete-btn" style="background: none; border: none; color: var(--color-error); cursor: pointer; font-size: 1.15rem; padding: 0.25rem;" onclick="deleteRabItem('${item._id}')">🗑️</button>
            </td>
          </tr>
        `;
      });
    }

    const iuran = Math.ceil((grandTotal / 11) / 1000) * 1000;

    container.innerHTML = `
      <table class="premium-table">
        <thead>
          <tr>
            <th style="width: 60px;">No</th>
            <th>Kebutuhan</th>
            <th style="width: 120px; text-align: center;">Satuan</th>
            <th style="width: 130px; text-align: center;">Volume/Jumlah</th>
            <th>Harga Satuan</th>
            <th>Jumlah</th>
            <th style="width: 100px; text-align: center;">Aksi</th>
          </tr>
        </thead>
        <tbody>
          ${tbodyHtml}
        </tbody>
        <tfoot>
          <tr style="background: rgba(16, 185, 129, 0.05); font-weight: bold;">
            <td colspan="5" style="text-align: right; color: #fff; font-size: 1rem; padding: 1rem;">Jumlah Total:</td>
            <td style="color: var(--color-success); font-size: 1.05rem; padding: 1rem;">${formatRupiah(grandTotal)}</td>
            <td></td>
          </tr>
          <tr style="background: rgba(99, 102, 241, 0.1); font-weight: bold;">
            <td colspan="5" style="text-align: right; color: #fff; font-size: 1rem; padding: 1rem;">Iuran Per Anggota (dibagi 11):</td>
            <td style="color: #a5b4fc; font-size: 1.1rem; padding: 1rem;">${formatRupiah(iuran)}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    `;
  }
  else if (currentRabType === 'Transportasi') {
    let tbodyHtml = '';
    let grandTotal = 0;

    if (items.length === 0) {
      tbodyHtml = `<tr><td colspan="8" style="text-align: center; color: var(--text-secondary); padding: 3rem;">🔍 Belum ada item RAB Transportasi.</td></tr>`;
    } else {
      items.forEach((item, index) => {
        const jumlah = item.harga || 0;
        const iuran = jumlah / (item.anggota || 11);
        grandTotal += jumlah;

        tbodyHtml += `
          <tr>
            <td style="font-weight: 600; color: #fff;">${index + 1}</td>
            <td style="font-weight: 600; color: var(--color-primary);">${item.kebutuhan}</td>
            <td style="text-align: center;"><span class="checklist-task-badge" style="background: rgba(245, 158, 11, 0.15); color: #facc15; border: 1px solid rgba(245, 158, 11, 0.3); font-size: 0.8rem;">${item.satuan || '-'}</span></td>
            <td style="text-align: center;">${item.volume}</td>
            <td>${formatRupiah(item.harga)}</td>
            <td style="text-align: center;">${item.anggota}</td>
            <td>${formatRupiah(iuran)}</td>
            <td style="font-weight: bold; color: #fff;">${formatRupiah(jumlah)}</td>
            <td style="text-align: center; white-space: nowrap;">
              <button class="edit-btn" style="background: none; border: none; color: var(--color-primary); cursor: pointer; font-size: 1.15rem; padding: 0.25rem;" onclick="openEditRabModal('${item._id}')">✏️</button>
              <button class="delete-btn" style="background: none; border: none; color: var(--color-error); cursor: pointer; font-size: 1.15rem; padding: 0.25rem;" onclick="deleteRabItem('${item._id}')">🗑️</button>
            </td>
          </tr>
        `;
      });
    }

    container.innerHTML = `
      <table class="premium-table">
        <thead>
          <tr>
            <th style="width: 60px;">No</th>
            <th>Kebutuhan</th>
            <th style="width: 120px; text-align: center;">Satuan</th>
            <th style="width: 130px; text-align: center;">Volume/Jumlah</th>
            <th>Harga</th>
            <th style="width: 100px; text-align: center;">Anggota</th>
            <th>Harga Satuan/Iuran</th>
            <th>Jumlah</th>
            <th style="width: 100px; text-align: center;">Aksi</th>
          </tr>
        </thead>
        <tbody>
          ${tbodyHtml}
        </tbody>
        <tfoot>
          <tr style="background: rgba(16, 185, 129, 0.1); font-weight: bold;">
            <td colspan="7" style="text-align: right; color: #fff; font-size: 1rem; padding: 1.25rem;">Jumlah Total:</td>
            <td style="color: var(--color-success); font-size: 1.1rem; padding: 1.25rem;">${formatRupiah(grandTotal)}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    `;
  }
  else if (currentRabType === 'Proker') {
    let tbodyHtml = '';
    let grandTotal = 0;

    // Grouping by prokerName
    const prokerGroups = {};
    items.forEach(item => {
      const gName = item.prokerName || 'Umum';
      if (!prokerGroups[gName]) prokerGroups[gName] = [];
      prokerGroups[gName].push(item);
    });

    if (items.length === 0) {
      tbodyHtml = `<tr><td colspan="6" style="text-align: center; color: var(--text-secondary); padding: 3rem;">🔍 Belum ada item RAB Proker.</td></tr>`;
    } else {
      Object.entries(prokerGroups).forEach(([gName, prokerItems]) => {
        let subtotal = 0;
        
        // Header group row
        tbodyHtml += `
          <tr style="background: rgba(99, 102, 241, 0.08); font-weight: bold;">
            <td colspan="6" style="color: #a5b4fc; text-align: left; font-size: 1rem; padding: 0.85rem 1.25rem;">
              📌 ${gName}
              <button onclick="openAddRabModal('${gName}')" style="float: right; font-size: 0.85rem; padding: 0.25rem 0.75rem; background: var(--color-primary); border: none; border-radius: 4px; color: #fff; cursor: pointer; display: flex; align-items: center; gap: 0.25rem;">➕ Tambah Barang</button>
            </td>
          </tr>
        `;

        prokerItems.forEach((item, index) => {
          const jumlah = item.volume * item.hargaSatuan;
          subtotal += jumlah;
          grandTotal += jumlah;

          tbodyHtml += `
            <tr>
              <td style="text-align: center; color: var(--text-secondary);">${index + 1}</td>
              <td style="font-weight: 500; color: #fff; padding-left: 2rem;">${item.kebutuhan}</td>
              <td style="text-align: center;">${item.volume}</td>
              <td>${formatRupiah(item.hargaSatuan)}</td>
              <td style="font-weight: bold; color: #fff;">${formatRupiah(jumlah)}</td>
              <td style="text-align: center; white-space: nowrap;">
                <button class="edit-btn" style="background: none; border: none; color: var(--color-primary); cursor: pointer; font-size: 1.15rem; padding: 0.25rem;" onclick="openEditRabModal('${item._id}')">✏️</button>
                <button class="delete-btn" style="background: none; border: none; color: var(--color-error); cursor: pointer; font-size: 1.15rem; padding: 0.25rem;" onclick="deleteRabItem('${item._id}')">🗑️</button>
              </td>
            </tr>
          `;
        });

        // Subtotal row for group
        tbodyHtml += `
          <tr style="background: rgba(255, 255, 255, 0.02); font-weight: 600;">
            <td colspan="4" style="text-align: right; color: var(--text-secondary); font-size: 0.9rem; padding: 0.65rem 1.25rem;">Jumlah ${gName}:</td>
            <td style="color: #fff; font-size: 0.95rem; padding: 0.65rem 1.25rem;">${formatRupiah(subtotal)}</td>
            <td></td>
          </tr>
        `;
      });
    }

    container.innerHTML = `
      <table class="premium-table">
        <thead>
          <tr>
            <th style="width: 80px; text-align: center;">No</th>
            <th>Keterangan / Kebutuhan</th>
            <th style="width: 130px; text-align: center;">Volume/Jumlah</th>
            <th>Harga Satuan</th>
            <th>Jumlah</th>
            <th style="width: 100px; text-align: center;">Aksi</th>
          </tr>
        </thead>
        <tbody>
          ${tbodyHtml}
        </tbody>
        <tfoot>
          <tr style="background: rgba(16, 185, 129, 0.1); font-weight: bold;">
            <td colspan="4" style="text-align: right; color: #fff; font-size: 1rem; padding: 1.25rem;">Jumlah Total:</td>
            <td style="color: var(--color-success); font-size: 1.1rem; padding: 1.25rem;">${formatRupiah(grandTotal)}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    `;
  }
  else if (currentRabType === 'Ringkasan') {
    const poskoTotal = calculateRabTotal('Posko');
    const konsumTotal = calculateRabTotal('Konsumsi');
    const transportTotal = calculateRabTotal('Transportasi');
    const prokerTotal = calculateRabTotal('Proker');
    const overallTotal = poskoTotal + konsumTotal + transportTotal;

    container.innerHTML = `
      <table class="premium-table" style="max-width: 600px; margin: 0 auto;">
        <thead>
          <tr style="background: var(--color-primary); color: #fff;">
            <th>JENIS RAB</th>
            <th style="text-align: right; padding-right: 2rem;">Jumlah Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="font-weight: 600; color: #fff; padding: 1.25rem;">RAB Posko</td>
            <td style="text-align: right; padding-right: 2rem; font-weight: 500;">${formatRupiah(poskoTotal)}</td>
          </tr>
          <tr>
            <td style="font-weight: 600; color: #fff; padding: 1.25rem;">RAB Konsumsi</td>
            <td style="text-align: right; padding-right: 2rem; font-weight: 500;">${formatRupiah(konsumTotal)}</td>
          </tr>
          <tr>
            <td style="font-weight: 600; color: #fff; padding: 1.25rem;">RAB Transportasi</td>
            <td style="text-align: right; padding-right: 2rem; font-weight: 500;">${formatRupiah(transportTotal)}</td>
          </tr>
          <tr style="border-top: 2px solid var(--border-color); background: rgba(99, 102, 241, 0.05);">
            <td style="font-weight: bold; color: #a5b4fc; padding: 1.25rem;">Jumlah Total Keseluruhan (Posko + Konsum + Transport)</td>
            <td style="text-align: right; padding-right: 2rem; font-weight: bold; color: #a5b4fc; font-size: 1.05rem;">${formatRupiah(overallTotal)}</td>
          </tr>
          <tr style="border-top: 1px solid var(--border-color);">
            <td style="font-weight: 600; color: #fff; padding: 1.25rem;">RAB Proker</td>
            <td style="text-align: right; padding-right: 2rem; font-weight: 500; color: var(--color-accent);">${formatRupiah(prokerTotal)}</td>
          </tr>
          <tr style="border-top: 2px solid var(--color-success); background: rgba(16, 185, 129, 0.1);">
            <td style="font-weight: bold; color: var(--color-success); padding: 1.25rem;">GRAND TOTAL (Keseluruhan Semua RAB)</td>
            <td style="text-align: right; padding-right: 2rem; font-weight: bold; color: var(--color-success); font-size: 1.1rem;">${formatRupiah(overallTotal + prokerTotal)}</td>
          </tr>
        </tbody>
      </table>
    `;
  }
}

function populateRabProkerList() {
  const datalist = document.getElementById('rab-proker-list');
  if (!datalist) return;
  datalist.innerHTML = '';
  // Ambil nama proker unik dari programKerjaData
  const prokerNames = [...new Set(programKerjaData.map(p => p.name))];
  prokerNames.forEach(name => {
    const option = document.createElement('option');
    option.value = name;
    datalist.appendChild(option);
  });
}

function toggleRabCalcMode() {
  const isAuto = document.getElementById('rab-form-isautocalc').value === 'true';
  const hargaTotalInput = document.getElementById('rab-form-harga');
  const volumeInput = document.getElementById('rab-form-volume');
  const hargaSatuanInput = document.getElementById('rab-form-hargasatuan');

  if (isAuto) {
    hargaTotalInput.readOnly = true;
    volumeInput.required = true;
    hargaSatuanInput.required = true;
    calculateRabTotalAuto();
  } else {
    hargaTotalInput.readOnly = false;
    volumeInput.required = false;
    hargaSatuanInput.required = false;
  }
}

function calculateRabTotalAuto() {
  const isAuto = document.getElementById('rab-form-isautocalc').value === 'true';
  if (!isAuto) return;

  const volume = parseFloat(document.getElementById('rab-form-volume').value) || 0;
  const hargaSatuan = parseFloat(document.getElementById('rab-form-hargasatuan').value) || 0;
  document.getElementById('rab-form-harga').value = volume * hargaSatuan;
}

function openAddRabModal(prefillProker = null) {
  if (currentRabType === 'Cashflow') {
    openCashflowModal();
    return;
  }

  const modal = document.getElementById('rab-modal');
  if (!modal) return;

  populateRabProkerList();

  document.getElementById('rab-modal-title').innerText = '💰 Tambah Anggaran (RAB)';
  document.getElementById('rab-form-id').value = '';
  document.getElementById('rab-form').reset();
  
  // Set default type select to current selected tab
  document.getElementById('rab-form-type').value = currentRabType;
  document.getElementById('rab-form-isautocalc').value = 'true';
  toggleRabFormFields(currentRabType);
  toggleRabCalcMode();

  if (currentRabType === 'Proker' && prefillProker && typeof prefillProker === 'string') {
    document.getElementById('rab-form-proker-name').value = prefillProker;
  }

  modal.classList.add('active');
}

function openEditRabModal(id) {
  const modal = document.getElementById('rab-modal');
  if (!modal) return;

  const item = rabData.find(i => i._id === id);
  if (!item) return;

  populateRabProkerList();

  document.getElementById('rab-modal-title').innerText = '✏️ Edit Anggaran (RAB)';
  document.getElementById('rab-form-id').value = item._id;
  document.getElementById('rab-form-type').value = item.type;
  document.getElementById('rab-form-proker-name').value = item.prokerName || '';
  
  document.getElementById('rab-form-kebutuhan').value = item.kebutuhan;
  document.getElementById('rab-form-satuan').value = item.satuan || 'Buah';
  document.getElementById('rab-form-volume').value = item.volume;
  document.getElementById('rab-form-harga').value = item.harga || 0;
  document.getElementById('rab-form-hargasatuan').value = item.hargaSatuan || 0;
  document.getElementById('rab-form-anggota').value = item.anggota || 11;
  document.getElementById('rab-form-isautocalc').value = item.isAutoCalc !== false ? 'true' : 'false';

  toggleRabFormFields(item.type);
  toggleRabCalcMode();
  modal.classList.add('active');
}

function closeRabModal() {
  const modal = document.getElementById('rab-modal');
  if (modal) modal.classList.remove('active');
}

function toggleRabFormFields(type) {
  const prokerGroup = document.getElementById('rab-form-proker-group');
  const satuanGroup = document.getElementById('rab-form-satuan-group');
  const anggotaGroup = document.getElementById('rab-form-anggota-group');
  const volumeGroup = document.getElementById('rab-form-volume-group');
  const hargaSatuanGroup = document.getElementById('rab-form-hargasatuan-group');
  const hargaGroup = document.getElementById('rab-form-harga-group');
  
  if(volumeGroup) volumeGroup.style.display = 'block';
  if(hargaSatuanGroup) hargaSatuanGroup.style.display = 'block';
  if(hargaGroup) hargaGroup.style.display = 'block';

  if (type === 'Posko') {
    if(prokerGroup) prokerGroup.style.display = 'none';
    satuanGroup.style.display = 'none';
    anggotaGroup.style.display = 'block';
  } else if (type === 'Konsumsi') {
    if(prokerGroup) prokerGroup.style.display = 'none';
    satuanGroup.style.display = 'block';
    anggotaGroup.style.display = 'none';
  } else if (type === 'Transportasi') {
    if(prokerGroup) prokerGroup.style.display = 'none';
    satuanGroup.style.display = 'block';
    anggotaGroup.style.display = 'block';
  } else if (type === 'Proker') {
    if(prokerGroup) prokerGroup.style.display = 'block';
    satuanGroup.style.display = 'none';
    anggotaGroup.style.display = 'none';
  }
}

async function handleSaveRab(e) {
  e.preventDefault();

  const id = document.getElementById('rab-form-id').value;
  const type = document.getElementById('rab-form-type').value;
  const prokerName = document.getElementById('rab-form-proker-name').value;

  const kebutuhan = document.getElementById('rab-form-kebutuhan').value;
  const satuan = document.getElementById('rab-form-satuan').value;
  const volume = parseFloat(document.getElementById('rab-form-volume').value) || 0;
  const harga = parseFloat(document.getElementById('rab-form-harga').value) || 0;
  const hargaSatuan = parseFloat(document.getElementById('rab-form-hargasatuan').value) || 0;
  const anggota = parseInt(document.getElementById('rab-form-anggota').value, 10) || 11;
  const isAutoCalc = document.getElementById('rab-form-isautocalc').value === 'true';

  const payload = { type, prokerName, kebutuhan, satuan, volume, harga, hargaSatuan, anggota, isAutoCalc };

  try {
    let res;
    if (id) {
      res = await fetch(`/api/rab/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch('/api/rab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    if (res.ok) {
      closeRabModal();
      await fetchRab();
      renderRab();
    } else {
      const err = await res.json();
      alert(err.error || 'Gagal menyimpan data RAB.');
    }
  } catch (err) {
    alert('Terjadi kesalahan koneksi.');
  }
}

async function deleteRabItem(id) {
  if (!confirm('Apakah Anda yakin ingin menghapus item RAB ini?')) return;

  try {
    const res = await fetch(`/api/rab/${id}`, {
      method: 'DELETE'
    });

    if (res.ok) {
      await fetchRab();
      renderRab();
    } else {
      alert('Gagal menghapus item RAB.');
    }
  } catch (err) {
    alert('Terjadi kesalahan koneksi.');
  }
}

async function toggleRabAutoCalc(id, currentStatus) {
  try {
    const res = await fetch(`/api/rab/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isAutoCalc: !currentStatus })
    });

    if (res.ok) {
      await fetchRab();
      renderRab();
    } else {
      alert('Gagal mengubah mode kalkulasi RAB.');
    }
  } catch (err) {
    alert('Terjadi kesalahan koneksi.');
  }
}
// ==========================================
// GOOGLE SHEETS EXPORT
// ==========================================
async function syncToGoogleSheets() {
  const btn = document.getElementById('btn-sync-sheets');
  const originalText = btn.innerHTML;
  
  if (!confirm('Apakah Anda yakin ingin menimpa (sync) seluruh data di Google Spreadsheet dengan data terbaru dari website ini? Ini akan memakan waktu beberapa saat.')) {
    return;
  }

  try {
    btn.innerHTML = '<span class="spinner" style="width: 1rem; height: 1rem; border-width: 2px;"></span> Menyinkronkan...';
    btn.disabled = true;
    
    const response = await fetch('/api/export-sheets', {
      method: 'POST'
    });
    
    const result = await response.json();
    
    if (response.ok) {
      alert('✅ Sukses: ' + result.message);
    } else {
      alert('❌ Gagal: ' + (result.error || 'Terjadi kesalahan'));
    }
  } catch (error) {
    console.error('Error syncing to sheets:', error);
    alert('❌ Terjadi kesalahan jaringan saat sync data.');
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

/* ================= CASHFLOW ================= */

let cashflowData = [];

async function fetchCashflow() {
  try {
    const res = await fetch('/api/cashflow');
    cashflowData = await res.json();
  } catch (err) {
    console.error('Gagal mengambil data Cashflow:', err);
  }
}

function renderCashflow(container) {
  let tbodyHtml = '';
  let totalPemasukan = 0;
  let totalPengeluaran = 0;
  let saldo = 0;

  if (cashflowData.length === 0) {
    tbodyHtml = `<tr><td colspan="7" style="text-align: center; color: var(--text-secondary); padding: 3rem;">🔍 Belum ada data arus kas.</td></tr>`;
  } else {
    cashflowData.forEach((item, index) => {
      let pemasukanStr = '-';
      let pengeluaranStr = '-';
      
      if (item.jenis === 'Pemasukan') {
        totalPemasukan += item.nominal;
        saldo += item.nominal;
        pemasukanStr = `<span style="color: var(--color-success); font-weight: bold;">+ ${formatRupiah(item.nominal)}</span>`;
      } else {
        totalPengeluaran += item.nominal;
        saldo -= item.nominal;
        pengeluaranStr = `<span style="color: var(--color-error); font-weight: bold;">- ${formatRupiah(item.nominal)}</span>`;
      }

      tbodyHtml += `
        <tr>
          <td style="font-weight: 600; color: #fff;">${index + 1}</td>
          <td style="white-space: nowrap;">${item.tanggal}</td>
          <td style="font-weight: 600; color: var(--color-primary);">${item.keterangan}</td>
          <td>${pemasukanStr}</td>
          <td>${pengeluaranStr}</td>
          <td style="font-weight: bold; color: #fff;">${formatRupiah(saldo)}</td>
          <td style="text-align: center; white-space: nowrap;">
            <button class="delete-btn" style="background: none; border: none; color: var(--color-error); cursor: pointer; font-size: 1.15rem; padding: 0.25rem;" onclick="deleteCashflowItem('${item._id}')" title="Hapus">🗑️</button>
          </td>
        </tr>
      `;
    });
  }

  container.innerHTML = `
    <table class="premium-table" id="cashflow-table">
      <thead>
        <tr>
          <th style="width: 60px;">No</th>
          <th style="width: 120px;">Tanggal</th>
          <th>Keterangan / Sumber / Penggunaan</th>
          <th style="width: 150px;">Pemasukan</th>
          <th style="width: 150px;">Pengeluaran</th>
          <th style="width: 150px;">Saldo</th>
          <th style="width: 80px; text-align: center;">Aksi</th>
        </tr>
      </thead>
      <tbody>
        ${tbodyHtml}
      </tbody>
      <tfoot>
        <tr style="background: rgba(16, 185, 129, 0.05); font-weight: bold;">
          <td colspan="3" style="text-align: right; color: #fff; font-size: 1rem; padding: 1rem;">Total Pemasukan:</td>
          <td style="color: var(--color-success); font-size: 1.05rem; padding: 1rem;">${formatRupiah(totalPemasukan)}</td>
          <td colspan="3"></td>
        </tr>
        <tr style="background: rgba(239, 68, 68, 0.05); font-weight: bold;">
          <td colspan="3" style="text-align: right; color: #fff; font-size: 1rem; padding: 1rem;">Total Pengeluaran:</td>
          <td></td>
          <td style="color: var(--color-error); font-size: 1.05rem; padding: 1rem;">${formatRupiah(totalPengeluaran)}</td>
          <td colspan="2"></td>
        </tr>
        <tr style="background: rgba(99, 102, 241, 0.1); font-weight: bold;">
          <td colspan="3" style="text-align: right; color: #fff; font-size: 1.1rem; padding: 1.25rem;">Saldo Akhir:</td>
          <td colspan="2"></td>
          <td style="color: #a5b4fc; font-size: 1.2rem; padding: 1.25rem;">${formatRupiah(saldo)}</td>
          <td></td>
        </tr>
      </tfoot>
    </table>
  `;
}

function openCashflowModal() {
  const modal = document.getElementById('cashflow-modal');
  if (!modal) return;

  document.getElementById('cashflow-form-id').value = '';
  document.getElementById('cashflow-form').reset();
  
  // Set default date to today
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  document.getElementById('cashflow-form-tanggal').value = `${yyyy}-${mm}-${dd}`;

  modal.classList.add('active');
}

function closeCashflowModal() {
  const modal = document.getElementById('cashflow-modal');
  if (modal) modal.classList.remove('active');
}

async function handleSaveCashflow(e) {
  e.preventDefault();
  
  const id = document.getElementById('cashflow-form-id').value;
  const tanggal = document.getElementById('cashflow-form-tanggal').value;
  const keterangan = document.getElementById('cashflow-form-keterangan').value;
  const jenis = document.getElementById('cashflow-form-jenis').value;
  const nominal = document.getElementById('cashflow-form-nominal').value;

  const payload = { tanggal, keterangan, jenis, nominal };

  try {
    let res;
    if (id) {
      // Edit is not implemented yet in the UI, but ready for API
      res = await fetch(`/api/cashflow/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch('/api/cashflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    if (res.ok) {
      closeCashflowModal();
      await fetchCashflow();
      renderRab(); // renderRab calls renderCashflow if currentRabType === 'Cashflow'
    } else {
      const data = await res.json();
      alert('Gagal menyimpan cashflow: ' + (data.error || 'Unknown error'));
    }
  } catch (err) {
    console.error(err);
    alert('Terjadi kesalahan jaringan.');
  }
}

async function deleteCashflowItem(id) {
  if (!confirm('Apakah Anda yakin ingin menghapus catatan arus kas ini?')) return;
  try {
    const res = await fetch(`/api/cashflow/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await fetchCashflow();
      renderRab();
    } else {
      alert('Gagal menghapus cashflow.');
    }
  } catch (err) {
    console.error(err);
    alert('Terjadi kesalahan jaringan.');
  }
}

// Override initial load to fetch cashflow
const _originalFetchRab = fetchRab;
fetchRab = async function() {
  await _originalFetchRab();
  await fetchCashflow();
};
