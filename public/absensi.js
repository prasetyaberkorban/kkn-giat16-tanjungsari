// Data Anggota & Tim (untuk populate option dropdown)
const TEAMS = {
  'TIM A': ['Zii', 'Mey', 'Hani'],
  'TIM B': ['Tian', 'Ananda', 'Firzan'],
  'TIM C': ['Cio', 'Naila', 'Valen'],
  'TIM D': ['Fay', 'Nanda']
};

let todaySchedule = null;

document.addEventListener('DOMContentLoaded', () => {
  populateDropdown();
  fetchTodaySchedule();

  // Event listener saat nama dipilih untuk menampilkan tugas secara dinamis
  const nameSelect = document.getElementById('name-select');
  nameSelect.addEventListener('change', handleNameChange);

  // Event listener submit form
  const form = document.getElementById('attendance-form');
  form.addEventListener('submit', handleFormSubmit);
});

/**
 * Memasukkan nama-nama anggota ke dalam select optgroup
 */
function populateDropdown() {
  Object.entries(TEAMS).forEach(([teamName, members]) => {
    // Cari optgroup yang sesuai berdasarkan id
    const groupKey = `opt-${teamName.toLowerCase().replace(' ', '-')}`;
    const groupElement = document.getElementById(groupKey);
    
    if (groupElement) {
      members.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        groupElement.appendChild(option);
      });
    }
  });
}

/**
 * Mengambil jadwal hari ini untuk menampilkan info tugas
 */
async function fetchTodaySchedule() {
  try {
    const res = await fetch('/api/schedule');
    const data = await res.json();
    
    if (data.error) {
      console.error('Error fetching schedule:', data.error);
      return;
    }
    
    todaySchedule = data;

    // Update badge tanggal di mobile
    const dateBadge = document.getElementById('mobile-date-badge');
    const formattedDate = formatDateIndo(data.date);
    dateBadge.innerHTML = `<span>📅</span> ${data.dayName}, ${formattedDate}`;

  } catch (error) {
    console.error('Error fetching schedule in mobile:', error);
  }
}

/**
 * Menangani perubahan pilihan nama untuk menampilkan tugas hari ini
 */
function handleNameChange(e) {
  const selectedName = e.target.value;
  if (!selectedName || !todaySchedule) return;

  // Cari tim dari user
  let userTeam = null;
  for (const [teamName, members] of Object.entries(TEAMS)) {
    if (members.includes(selectedName)) {
      userTeam = teamName;
      break;
    }
  }

  // Tampilkan info tugas
  const infoContainer = document.getElementById('info-tugas-container');
  const infoVal = document.getElementById('info-tugas-val');

  if (userTeam && todaySchedule.dailySchedule[userTeam]) {
    const task = todaySchedule.dailySchedule[userTeam].task;
    infoVal.innerText = `${userTeam} - ${task}`;
    infoContainer.style.display = 'block';
  } else {
    infoContainer.style.display = 'none';
  }
}

/**
 * Menangani proses submit form absensi
 */
async function handleFormSubmit(e) {
  e.preventDefault();
  
  const nameSelect = document.getElementById('name-select');
  const selectedName = nameSelect.value;
  
  if (!selectedName) return;

  const submitBtn = document.getElementById('submit-btn');
  const originalBtnHtml = submitBtn.innerHTML;
  
  // Set button ke loading state
  submitBtn.disabled = true;
  submitBtn.innerHTML = `<div class="spinner"></div> <span>Memproses...</span>`;

  const urlParams = new URLSearchParams(window.location.search);
  const qrParam = urlParams.get('qr') || '';

  try {
    const res = await fetch('/api/attendance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: selectedName, qr: qrParam })
    });

    const data = await res.json();

    if (!res.ok) {
      // Tampilkan error view
      showErrorView(data.error || 'Terjadi kesalahan saat memproses absensi.');
    } else {
      // Tampilkan success view
      showSuccessView(data.data);
    }

  } catch (error) {
    showErrorView('Gagal terhubung ke server. Pastikan koneksi internet Anda aktif.');
  } finally {
    // Kembalikan tombol ke keadaan semula
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnHtml;
  }
}

/**
 * Menampilkan view sukses
 */
function showSuccessView(attendanceData) {
  document.getElementById('form-view').style.display = 'none';
  document.getElementById('error-view').style.display = 'none';
  
  document.getElementById('res-name').innerText = attendanceData.name;
  document.getElementById('res-team').innerText = attendanceData.team;
  document.getElementById('res-task').innerText = attendanceData.task;
  document.getElementById('res-time').innerText = attendanceData.time;
  
  document.getElementById('success-view').style.display = 'block';
}

/**
 * Menampilkan view error
 */
function showErrorView(message) {
  document.getElementById('form-view').style.display = 'none';
  document.getElementById('success-view').style.display = 'none';

  const titleEl = document.getElementById('error-title-val');
  const messageEl = document.getElementById('error-message-val');
  const iconEl = document.getElementById('error-icon-val');
  const retryBtn = document.getElementById('error-retry-btn');

  // Jika pesan error menunjukkan user sudah absen
  if (message.toLowerCase().includes('sudah melakukan absensi') || message.toLowerCase().includes('sudah absen')) {
    titleEl.innerText = 'Sudah Absen';
    messageEl.innerText = message;
    messageEl.style.color = 'var(--text-primary)';
    
    // Ubah icon silang merah menjadi icon info 'i' berwarna kuning amber
    iconEl.className = 'status-icon';
    iconEl.style.background = 'rgba(245, 158, 11, 0.15)';
    iconEl.style.border = '2px solid var(--color-accent)';
    iconEl.style.color = 'var(--color-accent)';
    iconEl.innerText = 'i';
    
    // Sembunyikan tombol "Kembali ke Formulir"
    retryBtn.style.display = 'none';
  } else {
    // Error normal / teknis (Absen Gagal)
    titleEl.innerText = 'Absen Gagal';
    messageEl.innerText = message;
    messageEl.style.color = 'var(--color-error)';
    
    // Kembalikan ke icon silang merah
    iconEl.className = 'status-icon error';
    iconEl.style.background = '';
    iconEl.style.border = '';
    iconEl.style.color = '';
    iconEl.innerText = '✗';
    
    // Tampilkan tombol "Kembali ke Formulir"
    retryBtn.style.display = 'block';
  }

  document.getElementById('error-view').style.display = 'block';
}

/**
 * Menampilkan kembali view form
 */
function showFormView() {
  document.getElementById('success-view').style.display = 'none';
  document.getElementById('error-view').style.display = 'none';
  
  // Reset form
  document.getElementById('name-select').selectedIndex = 0;
  document.getElementById('info-tugas-container').style.display = 'none';
  
  document.getElementById('form-view').style.display = 'block';
}

/**
 * Format string tanggal YYYY-MM-DD menjadi "DD Bulan YYYY" dalam bahasa Indonesia
 */
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
