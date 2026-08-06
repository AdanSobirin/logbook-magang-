# Konteks Proyek — Logbook Magang

> File ini adalah konteks untuk melanjutkan pengerjaan di Claude Code (VS Code).
> **Update terakhir:** UI dimodernkan & dipecah jadi 3 file, plus fitur upload foto otomatis ke Google Drive
> (lihat bagian 5, 6, dan 8 — bagian 8 sekarang berisi riwayat, bukan tugas yang masih terbuka).

---

## 1. Ringkasan proyek

Aplikasi web **pencatatan harian magang** (logbook). Mahasiswa mengisi catatan tiap hari
(kegiatan, yang dipelajari, kendala, output, rencana besok). Data ini nanti dipakai untuk
menyusun laporan magang, presentasi, dan sebagian bahan skripsi (topik: **IoT + jaringan**,
LoRa/MQTT). Aplikasi harus **gratis** dan berjalan online.

## 2. Arsitektur (penting — jangan diubah tanpa alasan)

Semua serba gratis, **tanpa server & tanpa build step**:

- **Frontend:** file statis `index.html` (struktur) + `style.css` (tampilan) + `app.js` (logika),
  dipisah murni untuk kemudahan maintenance — tetap tanpa framework/bundler.
  Di-hosting via **GitHub Pages** (upload ketiga file ke folder yang sama).
- **Backend/jembatan:** **Google Apps Script** (`Code.gs`) yang di-deploy sebagai *Web app*.
- **Database:** **Google Sheets** (satu tab bernama `Logbook`).
- **Penyimpanan foto:** **Google Drive**, folder otomatis `Logbook Magang - Foto`, dikelola oleh `Code.gs`.

Alur data teks: `app.js` (browser) ⇄ `fetch` ⇄ Apps Script `/exec` ⇄ Google Sheet.
Alur data foto: `app.js` mengompres foto di browser (canvas, ke JPEG) → base64 dikirim dalam payload yang sama
ke Apps Script → `Code.gs` decode & simpan sebagai file ke folder Drive dengan nama otomatis → URL foto
disimpan sebagai JSON di kolom `foto` pada Sheet, dan dikembalikan ke frontend untuk ditampilkan.

## 3. File dalam repo

| File | Peran |
|------|-------|
| `index.html` | Struktur/markup aplikasi (HTML saja, tanpa CSS/JS inline). |
| `style.css` | Seluruh styling & tema visual. |
| `app.js` | Seluruh logika: state, render, CRUD, kompresi & upload foto. `API_URL` didefinisikan di sini. |
| `Code.gs` | Kode Apps Script (backend + upload foto ke Drive). Bukan bagian dari web hosting; dipasang di Google Apps Script. |
| `README.md` | Panduan setup untuk pengguna. |
| `CLAUDE.md` | File ini. |

Ketiga file frontend (`index.html`, `style.css`, `app.js`) **harus selalu diupload bersama** ke GitHub Pages —
`index.html` me-link keduanya lewat `<link rel="stylesheet">` dan `<script src>` relatif (bukan inline lagi).

Repo: `https://github.com/AdanSobirin/logbook-magang-`

## 4. Model data (kolom di Google Sheet & objek JS)

Setiap catatan = satu objek dengan field:

```
id           string, unik, dibuat otomatis saat create ("id" + timestamp + random)
tanggal      string ISO "YYYY-MM-DD"
hariKe       angka/ string, "Hari ke-" magang
kegiatan     string (wajib)
dipelajari   string
kendala      string  (Kendala & solusi)
output       string  (Output / bukti — teks bebas: link commit, nama alat, dst.)
rencana      string  (Rencana besok)
foto         array of { id, name, url, viewUrl }  — foto yang diupload ke Drive
```

`foto` disimpan di Sheet sebagai string JSON pada kolom `foto` (`Code.gs` yang serialize/deserialize).
`url` dipakai untuk `<img src>` (endpoint thumbnail Drive), `viewUrl` untuk buka file penuh di tab baru.

Apps Script menerima `action`: `"create" | "update" | "delete"`. Payload create/update foto memakai:
- `fotoLama`: array foto existing yang tetap dipertahankan (dikirim balik oleh frontend saat edit).
- `fotoBaru`: array `{ mimeType, base64 }` foto baru yang perlu diupload di request ini.

Sheet lama (dari versi sebelum fitur foto) **otomatis dimigrasi** — `getSheet()` di `Code.gs` menyisipkan
kolom `foto` di depan `createdAt` kalau belum ada, tanpa menghapus data lama.

## 5. Design system SEKARANG (pertahankan bahasanya, tingkatkan kualitasnya)

Tema: **"engineer's field logbook"** — kalem, teknis, fokus. Ada tekstur grid halus (kesan kertas milimeter).

**Warna (CSS variables di `:root`):**
```
--paper #eaeef2  (background)   --panel #ffffff (kartu)
--ink #16202c    (teks utama)   --ink-soft #4a5b6b  --ink-faint #8296a6
--teal #0d7a72   (aksi utama)   --teal-deep #0a5f59  --teal-wash #e4f2f0
--amber #b8730f  (aksen "rencana"/hari)   --rose #b23b4e (aksen "kendala")
--line #d5dde4   (garis)
```

**Tipografi:**
- Display/heading: `Space Grotesk`
- Body: `Inter`
- Data/tanggal/angka: `JetBrains Mono`

**Elemen khas (signature):** timeline vertikal di sisi kiri daftar catatan; tiap hari
jadi "node" bulat di garis (spine), dikelompokkan per minggu. Header sticky dengan efek blur
saat scroll. Form panel juga sticky di desktop dengan scroll internal jika kontennya panjang.

**Layout:** 2 kolom di desktop (kiri = form input sticky, kanan = timeline catatan).
Menumpuk (stacked) di mobile < 880px. Di mobile, tombol "Simpan catatan" jadi **sticky di
bagian bawah viewport** (thumb-reachable) — penting karena form sering diisi sambil berdiri/
di lapangan pakai satu tangan.

**Upload foto:** drop-zone bergaris putus-putus dengan tombol "Ambil / pilih foto" + area
drag-and-drop (desktop). Preview foto sebagai grid thumbnail kotak dengan tombol hapus (✕).
Input `<input type="file" accept="image/*" multiple>` tanpa atribut `capture` supaya di HP
muncul pilihan kamera **atau** galeri (bukan dipaksa salah satu).

## 6. Kendala teknis yang WAJIB dijaga (jangan sampai rusak saat merapikan lagi)

1. **Tiga file frontend statis** (`index.html` + `style.css` + `app.js`), tanpa dependency
   build. GitHub Pages hanya menyajikan file statis — ketiganya harus selalu diupload bersama.
2. **CORS Apps Script:**
   - `POST` harus pakai `Content-Type: text/plain` (bukan `application/json`) supaya tidak kena preflight OPTIONS yang tidak didukung Apps Script. Body tetap `JSON.stringify(payload)`.
   - `GET` biasa (`fetch(API_URL)`) — Apps Script me-redirect ke googleusercontent, fetch mengikutinya.
   - **Jangan** menambah custom header lain pada request.
3. **Jangan pakai `localStorage` sebagai database** (hanya dipakai sebagai mode fallback saat `API_URL` kosong — termasuk untuk foto, disimpan sebagai data URL langsung).
4. `const API_URL` di `app.js` (bukan lagi di `index.html`) sudah diisi link Apps Script milik pengguna — **jangan dikosongkan**.
5. Aksesibilitas & responsif yang sudah ada harus dipertahankan: fokus keyboard terlihat, `prefers-reduced-motion` dihormati, layout mobile jalan, ukuran font input ≥16px (mencegah auto-zoom iOS Safari saat fokus).
6. **Foto dikompres di klien** (canvas, max dimensi 1600px, JPEG kualitas .82) sebelum dikirim sebagai base64 — jangan hilangkan langkah ini, krusial untuk pemakaian di lapangan dengan sinyal lemah.
7. **Payload create/update** membawa `fotoLama` (foto existing yang dipertahankan) + `fotoBaru` (foto baru untuk diupload Apps Script ke Drive) — jangan gabungkan jadi satu array tanpa status upload.
8. `Code.gs` butuh scope OAuth **Google Drive** selain Sheets — saat re-deploy setelah update kode, otorisasi ulang mungkin diminta lagi.

## 7. Status saat ini

- `index.html`, `style.css`, `app.js` sudah terupload ke repo, `API_URL` (di `app.js`) sudah diisi.
- GitHub Pages: perlu dipastikan aktif (Settings → Pages → branch `main`, folder `/root`), dan pastikan ketiga file frontend ikut ter-upload.
- Fungsi CRUD (tambah/edit/hapus), pencarian, filter minggu, statistik, dan **upload foto ke Drive** sudah berjalan.
- Sheet lama (kolom belum ada `foto`) otomatis dimigrasi oleh `getSheet()` di `Code.gs`.

## 8. Riwayat pekerjaan (sudah selesai)

Sesi sebelumnya: modernisasi tampilan + fitur foto. Yang dikerjakan:

- Pecah `index.html` (dulu satu file HTML+CSS+JS inline) menjadi `index.html` (markup) + `style.css`
  (styling) + `app.js` (logika) — memudahkan maintenance, identitas desain di bagian 5 dipertahankan.
- Modernisasi UI: header sticky+blur, kartu stat dengan ikon, tap target lebih besar, font input
  ≥16px (anti auto-zoom mobile), tombol simpan sticky di bawah layar pada mobile agar mudah
  dijangkau ibu jari saat dipakai di lapangan.
- Fitur upload foto: multi-foto per catatan, kompresi otomatis di browser, upload ke Google Drive
  via `Code.gs`, nama file otomatis format `YYYY-MM-DD_urutan.jpg` (tidak perlu mengetik nama file),
  folder Drive `Logbook Magang - Foto` dibuat otomatis. Ditampilkan sebagai galeri thumbnail di
  tiap kartu catatan, klik untuk buka ukuran penuh di tab baru.
- `Code.gs`: tambah kolom `foto` (JSON array of `{id,name,url,viewUrl}`), migrasi otomatis untuk
  sheet lama, fungsi `uploadPhotos`/`getPhotoFolder`/`nextSeq` (pakai `LockService` agar aman dari
  race condition penomoran file).

**Belum dikerjakan / bisa jadi tugas selanjutnya kalau diminta:**
- Proteksi sederhana (mis. secret key) di `Code.gs` supaya `API_URL` publik tidak bisa ditulis sembarang orang.
- Hapus file di Drive saat foto/catatan dihapus dari web (saat ini file Drive dibiarkan tetap ada sebagai arsip).
- Indikator progres upload per-foto yang lebih presisi (saat ini hanya teks "Mengunggah N foto...").

## 9. Menjalankan/melihat secara lokal

Buka `index.html` di browser (klik dua kali) — pastikan `style.css` dan `app.js` ada di folder
yang sama, atau di VS Code pakai ekstensi "Live Server". Perubahan CSS/HTML/JS langsung terlihat.
Untuk uji simpan-data sungguhan (termasuk foto), `API_URL` di `app.js` sudah menunjuk ke Apps
Script; baris baru akan masuk ke Google Sheet dan foto ke folder Drive.
