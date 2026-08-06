/* ================================================================
   Logbook Magang — Logika aplikasi
   Dipisah dari index.html supaya lebih mudah dirawat.
   ================================================================ */

/* ================================================================
   1) TEMPEL LINK WEB APP DI SINI setelah deploy Apps Script.
      Contoh: "https://script.google.com/macros/s/AKfy.../exec"
      Biarkan kosong ("") untuk mode uji coba tanpa database.
   ================================================================ */
const API_URL = "https://script.google.com/macros/s/AKfycbyijLiqTlKZryycNTsKfZqEBkLMMov8NAbw0I8yQc3xiUb32OvWVu_kKS9IqY1ymCuZ/exec";

/* ---------------------------------------------------------------- */
const $ = (id) => document.getElementById(id);
const HAS_DB = API_URL.trim().length > 0;
let entries = [];

// Foto yang sedang dilampirkan di form (belum tentu tersimpan)
let keptPhotos = [];  // foto lama (saat edit) yang tetap dipertahankan: {id,name,url,viewUrl}
let newPhotos = [];   // foto baru yang baru dipilih di perangkat ini: {dataUrl}

const DAYS = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return iso;
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
// ISO week key like "2025-W32"
function weekKey(iso) {
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return 'lainnya';
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const wk = Math.ceil((((t - yearStart) / 86400000) + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(wk).padStart(2,'0')}`;
}

function toast(msg, isErr) {
  const t = $('toast');
  t.innerHTML = (isErr
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>') + `<span>${msg}</span>`;
  t.className = 'toast show' + (isErr ? ' err' : '');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.className = 'toast', 3200);
}

function esc(s) {
  return (s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* ---------------- Data layer ---------------- */
const LS_KEY = 'logbook_local_v1';

async function apiGet() {
  if (!HAS_DB) {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  }
  const res = await fetch(API_URL);
  const data = await res.json();
  return Array.isArray(data) ? data : (data.rows || []);
}
async function apiSend(payload) {
  if (!HAS_DB) {
    let list = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
    // mode lokal: foto baru langsung dipakai apa adanya (data URL) sebagai "foto"
    const fotoLokal = [
      ...(payload.fotoLama || []),
      ...(payload.fotoBaru || []).map((f, i) => ({
        id: 'local' + Date.now() + i,
        name: `foto-${i + 1}`,
        url: 'data:' + f.mimeType + ';base64,' + f.base64,
        viewUrl: 'data:' + f.mimeType + ';base64,' + f.base64
      }))
    ];
    const record = { ...payload, foto: fotoLokal };
    delete record.fotoBaru; delete record.fotoLama;
    if (payload.action === 'create') list.push(record);
    else if (payload.action === 'update') list = list.map(e => e.id === payload.id ? { ...e, ...record } : e);
    else if (payload.action === 'delete') list = list.filter(e => e.id !== payload.id);
    localStorage.setItem(LS_KEY, JSON.stringify(list));
    return { ok: true, foto: fotoLokal };
  }
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

/* ---------------- Kompresi & pratinjau foto ---------------- */
// Mengecilkan foto sebelum dikirim — penting untuk pemakaian di lapangan
// dengan sinyal yang seringkali lemah.
function compressImage(file, maxDim = 1600, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.onload = (ev) => {
      const img = new Image();
      img.onerror = () => reject(new Error('File bukan gambar yang valid'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) { height = Math.round(height * maxDim / width); width = maxDim; }
          else { width = Math.round(width * maxDim / height); height = maxDim; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function renderPhotoPreview() {
  const grid = $('photoPreview');
  const keptHtml = keptPhotos.map((p, i) => `
    <div class="photo-thumb">
      <img src="${p.url}" alt="Foto tersimpan" loading="lazy" />
      <button type="button" class="rm" title="Hapus foto" onclick="removeKeptPhoto(${i})">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>`).join('');
  const newHtml = newPhotos.map((p, i) => `
    <div class="photo-thumb">
      <img src="${p.dataUrl}" alt="Foto baru" loading="lazy" />
      <button type="button" class="rm" title="Hapus foto" onclick="removeNewPhoto(${i})">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>`).join('');
  grid.innerHTML = keptHtml + newHtml;
}

function removeKeptPhoto(i) { keptPhotos.splice(i, 1); renderPhotoPreview(); }
function removeNewPhoto(i) { newPhotos.splice(i, 1); renderPhotoPreview(); }

async function handleFiles(fileList) {
  const files = [...fileList].filter(f => f.type.startsWith('image/'));
  if (!files.length) return;
  const hint = $('photoHint');
  const originalHint = hint.textContent;
  hint.textContent = `Memproses ${files.length} foto...`;
  hint.classList.add('busy');
  try {
    for (const file of files) {
      const dataUrl = await compressImage(file);
      newPhotos.push({ dataUrl });
      renderPhotoPreview();
    }
  } catch (err) {
    toast('Ada foto gagal diproses, dilewati', true);
  } finally {
    hint.textContent = originalHint;
    hint.classList.remove('busy');
  }
}

$('photoPickBtn').addEventListener('click', () => $('photoInput').click());
$('photoInput').addEventListener('change', (ev) => {
  handleFiles(ev.target.files);
  ev.target.value = ''; // supaya file yang sama bisa dipilih lagi
});
const dropZone = $('photoDrop');
['dragover', 'dragenter'].forEach(evt => dropZone.addEventListener(evt, (e) => {
  e.preventDefault(); dropZone.classList.add('drag');
}));
['dragleave', 'drop'].forEach(evt => dropZone.addEventListener(evt, (e) => {
  e.preventDefault(); dropZone.classList.remove('drag');
}));
dropZone.addEventListener('drop', (e) => {
  if (e.dataTransfer?.files?.length) handleFiles(e.dataTransfer.files);
});

/* ---------------- Render ---------------- */
function render() {
  const term = $('search').value.trim().toLowerCase();
  const wk = $('weekFilter').value;

  let list = [...entries].sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));

  // stats (dari seluruh data)
  $('statDays').textContent = entries.length;
  $('statWeeks').textContent = new Set(entries.map(e => weekKey(e.tanggal))).size;

  // opsi filter minggu
  const weeks = [...new Set(entries.map(e => weekKey(e.tanggal)))].sort().reverse();
  const cur = $('weekFilter').value;
  $('weekFilter').innerHTML = '<option value="">Semua minggu</option>' +
    weeks.map((w, i) => `<option value="${w}"${w===cur?' selected':''}>Minggu ${weeks.length - i} (${w})</option>`).join('');

  if (term) {
    list = list.filter(e => [e.kegiatan, e.dipelajari, e.kendala, e.output, e.rencana]
      .join(' ').toLowerCase().includes(term));
  }
  if (wk) list = list.filter(e => weekKey(e.tanggal) === wk);

  const feed = $('feed');

  if (list.length === 0) {
    feed.innerHTML = entries.length === 0
      ? `<div class="state">
           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
           <h3>Belum ada catatan</h3>
           <p>Isi form di sebelah kiri untuk mencatat kegiatan hari pertamamu. Sedikit tiap hari, laporan menyusun dirinya sendiri.</p>
         </div>`
      : `<div class="state">
           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
           <h3>Tidak ada yang cocok</h3>
           <p>Coba kata kunci lain atau pilih "Semua minggu".</p>
         </div>`;
    return;
  }

  // kelompokkan per minggu
  const groups = {};
  list.forEach(e => { const k = weekKey(e.tanggal); (groups[k] = groups[k] || []).push(e); });
  const orderedKeys = Object.keys(groups).sort().reverse();
  const weekNumberOf = {}; weeks.forEach((w, i) => weekNumberOf[w] = weeks.length - i);

  feed.innerHTML = orderedKeys.map(k => {
    const rows = groups[k].map(e => cardHTML(e)).join('');
    return `<div class="week-group">
      <div class="week-label">Minggu ${weekNumberOf[k] || '?'} · ${k}</div>
      ${rows}
    </div>`;
  }).join('');
}

function seg(cls, label, val) {
  if (!val || !val.trim()) return '';
  return `<div class="seg ${cls}"><div class="seg-label">${label}</div><div class="seg-text">${esc(val)}</div></div>`;
}

function photoGalleryHTML(foto) {
  if (!foto || !foto.length) return '';
  const items = foto.map(p => `
    <a href="${esc(p.viewUrl || p.url)}" target="_blank" rel="noopener">
      <img src="${esc(p.url)}" alt="Foto kegiatan" loading="lazy" />
    </a>`).join('');
  return `<div class="seg foto">
    <div class="seg-label">Foto (${foto.length})</div>
    <div class="photo-gallery">${items}</div>
  </div>`;
}

function cardHTML(e) {
  return `<div class="entry"><div class="card">
    <div class="card-top">
      <div class="card-date">
        ${e.hariKe ? `<span class="hari-chip">Hari ${esc(String(e.hariKe))}</span>` : ''}
        <span class="d">${fmtDate(e.tanggal)}</span>
      </div>
      <div class="card-tools">
        <button class="icon-btn" title="Edit" onclick="editEntry('${esc(e.id)}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
        </button>
        <button class="icon-btn del" title="Hapus" onclick="deleteEntry('${esc(e.id)}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
        </button>
      </div>
    </div>
    <div class="card-body">
      ${seg('kegiatan','Kegiatan', e.kegiatan)}
      ${seg('dipelajari','Yang dipelajari', e.dipelajari)}
      ${seg('kendala','Kendala &amp; solusi', e.kendala)}
      ${seg('output','Output / bukti', e.output)}
      ${seg('rencana','Rencana besok', e.rencana)}
      ${photoGalleryHTML(e.foto)}
    </div>
  </div></div>`;
}

/* ---------------- Form logic ---------------- */
function resetForm() {
  $('entryForm').reset();
  $('editId').value = '';
  $('formTitle').textContent = 'Catatan hari ini';
  $('modeTag').textContent = 'Baru';
  $('modeTag').className = 'mode-tag';
  $('saveLabel').textContent = 'Simpan catatan';
  $('cancelBtn').style.display = 'none';
  $('tanggal').value = new Date().toISOString().slice(0, 10);
  $('hariKe').value = entries.length + 1;
  keptPhotos = [];
  newPhotos = [];
  renderPhotoPreview();
  REQUIRED_FIELDS.forEach(({ id }) => clearFieldError(id));
}

function editEntry(id) {
  const e = entries.find(x => x.id === id);
  if (!e) return;
  $('editId').value = e.id;
  $('tanggal').value = e.tanggal || '';
  $('hariKe').value = e.hariKe || '';
  $('kegiatan').value = e.kegiatan || '';
  $('dipelajari').value = e.dipelajari || '';
  $('kendala').value = e.kendala || '';
  $('output').value = e.output || '';
  $('rencana').value = e.rencana || '';
  $('formTitle').textContent = 'Edit catatan';
  $('modeTag').textContent = 'Edit';
  $('modeTag').className = 'mode-tag editing';
  $('saveLabel').textContent = 'Simpan perubahan';
  $('cancelBtn').style.display = 'block';
  keptPhotos = [...(e.foto || [])];
  newPhotos = [];
  renderPhotoPreview();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteEntry(id) {
  if (!confirm('Hapus catatan ini? Tindakan tidak bisa dibatalkan.')) return;
  entries = entries.filter(e => e.id !== id);
  render();
  try {
    const res = await apiSend({ action: 'delete', id });
    if (res && res.ok === false) throw new Error(res.error || 'Backend menolak permintaan');
    toast('Catatan dihapus');
  } catch (err) {
    console.error('Gagal menghapus catatan:', err);
    toast('Gagal menghapus — coba lagi', true);
    load();
  }
}

$('entryForm').addEventListener('submit', async (ev) => {
  ev.preventDefault();

  const firstInvalid = validateForm();
  if (firstInvalid) {
    toast('Lengkapi dulu bagian yang wajib diisi', true);
    firstInvalid.focus({ preventScroll: true });
    firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const btn = $('saveBtn');
  const label = $('saveLabel');
  const editing = !!$('editId').value;
  const payload = {
    action: editing ? 'update' : 'create',
    id: editing ? $('editId').value : ('id' + Date.now() + Math.floor(Math.random()*1000)),
    tanggal: $('tanggal').value,
    hariKe: $('hariKe').value,
    kegiatan: $('kegiatan').value,
    dipelajari: $('dipelajari').value,
    kendala: $('kendala').value,
    output: $('output').value,
    rencana: $('rencana').value,
    fotoLama: keptPhotos,
    fotoBaru: newPhotos.map(p => ({
      mimeType: 'image/jpeg',
      base64: p.dataUrl.split(',')[1]
    }))
  };

  btn.disabled = true;
  const originalLabel = label.textContent;
  if (payload.fotoBaru.length) label.textContent = `Mengunggah ${payload.fotoBaru.length} foto...`;

  // optimistic update — tampilkan langsung pakai pratinjau lokal foto baru
  const optimisticFoto = [...keptPhotos, ...newPhotos.map((p, i) => ({ id: 'pending' + i, name: '', url: p.dataUrl, viewUrl: p.dataUrl }))];
  const optimisticEntry = { ...payload, foto: optimisticFoto };
  if (editing) entries = entries.map(e => e.id === payload.id ? { ...e, ...optimisticEntry } : e);
  else entries.push(optimisticEntry);
  render();

  try {
    const res = await apiSend(payload);
    if (res && res.ok === false) {
      throw new Error(res.error || 'Backend menolak permintaan');
    }
    if (res && res.foto) {
      entries = entries.map(e => e.id === payload.id ? { ...e, foto: res.foto } : e);
      render();
    }
    if (res && res.fotoError) {
      console.error('Foto gagal diupload:', res.fotoError);
      toast('Catatan tersimpan, tapi foto gagal diupload ke Drive', true);
    } else {
      toast(editing ? 'Perubahan tersimpan' : 'Catatan tersimpan');
    }
    resetForm();
  } catch (err) {
    console.error('Gagal menyimpan catatan:', err);
    toast('Gagal menyimpan — cek koneksi/URL', true);
    load();
  } finally {
    btn.disabled = false;
    label.textContent = originalLabel;
  }
});

/* ---------------- Validasi field wajib ---------------- */
const REQUIRED_FIELDS = [
  { id: 'tanggal', msg: 'Tanggal wajib diisi' },
  { id: 'kegiatan', msg: 'Kegiatan hari ini wajib diisi' }
];

function setFieldError(id, msg) {
  const el = $(id);
  el.classList.add('input-invalid');
  let err = el.nextElementSibling;
  if (!err || !err.classList.contains('field-error')) {
    err = document.createElement('div');
    err.className = 'field-error';
    el.insertAdjacentElement('afterend', err);
  }
  err.textContent = msg;
}
function clearFieldError(id) {
  const el = $(id);
  el.classList.remove('input-invalid');
  const err = el.nextElementSibling;
  if (err && err.classList.contains('field-error')) err.remove();
}

// Validasi seluruh field wajib; kembalikan elemen pertama yang masih kosong (atau null kalau lolos).
function validateForm() {
  let firstInvalid = null;
  REQUIRED_FIELDS.forEach(({ id, msg }) => {
    const el = $(id);
    if (!el.value || !el.value.trim()) {
      setFieldError(id, msg);
      if (!firstInvalid) firstInvalid = el;
    } else {
      clearFieldError(id);
    }
  });
  return firstInvalid;
}

// Hapus tanda error begitu pengguna mulai mengisi lagi.
REQUIRED_FIELDS.forEach(({ id }) => {
  $(id).addEventListener('input', () => clearFieldError(id));
});

$('cancelBtn').addEventListener('click', resetForm);
$('search').addEventListener('input', render);
$('weekFilter').addEventListener('change', render);

window.addEventListener('scroll', () => {
  $('siteHeader').classList.toggle('scrolled', window.scrollY > 4);
}, { passive: true });

/* ---------------- Init ---------------- */
async function load() {
  try {
    const data = await apiGet();
    entries = data.map(e => ({
      id: String(e.id || ''), tanggal: e.tanggal || '', hariKe: e.hariKe || '',
      kegiatan: e.kegiatan || '', dipelajari: e.dipelajari || '',
      kendala: e.kendala || '', output: e.output || '', rencana: e.rencana || '',
      foto: Array.isArray(e.foto) ? e.foto : []
    })).filter(e => e.id);
    render();
  } catch (err) {
    $('feed').innerHTML = `<div class="state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 17h.01"/><circle cx="12" cy="12" r="10"/></svg>
      <h3>Gagal memuat data</h3>
      <p>Periksa apakah <code>API_URL</code> benar dan Web App sudah di-deploy dengan akses "Anyone".</p></div>`;
  }
}

function boot() {
  if (!HAS_DB) $('setupBanner').style.display = 'flex';
  $('feed').innerHTML = `<div class="state"><div class="spinner"></div><p>Memuat catatan...</p></div>`;
  resetForm();
  load();
}
boot();
