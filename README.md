# Logbook Magang

Aplikasi web pencatatan harian magang. **Gratis 100%**, tanpa server:

- **Tampilan (frontend):** file `index.html` di-hosting gratis lewat **GitHub Pages**.
- **Database:** **Google Sheets**, dijembatani oleh **Google Apps Script**.

Data tersimpan di Google Sheet milikmu sendiri, jadi mudah dibuat tabel/grafik untuk laporan dan skripsi.

> Sebelum di-setup, aplikasi tetap bisa dicoba — catatan tersimpan sementara di browser (localStorage). Setelah `API_URL` diisi, semua catatan masuk ke Google Sheet.

---

## Langkah 1 — Siapkan Google Sheet + Apps Script (database)

1. Buka <https://sheets.google.com>, buat **spreadsheet baru**. Beri nama bebas, misalnya `DB Logbook Magang`.
2. Di menu atas, klik **Extensions → Apps Script**.
3. Hapus semua kode contoh yang ada, lalu **tempel seluruh isi file `Code.gs`**.
4. Klik ikon **Save** (💾).
5. Klik **Deploy → New deployment**.
   - Klik ikon gerigi ⚙️ di sebelah "Select type", pilih **Web app**.
   - **Description:** bebas (mis. `logbook v1`).
   - **Execute as:** `Me`
   - **Who has access:** `Anyone`  ← penting, supaya web bisa mengakses.
   - Klik **Deploy**.
6. Akan muncul permintaan izin — klik **Authorize access**, pilih akun Google-mu, lalu **Allow**.
   (Kalau muncul layar "Google hasn't verified this app", klik **Advanced → Go to … (unsafe)**. Ini aman karena skripnya milikmu sendiri.)
7. Salin **Web app URL** (formatnya `https://script.google.com/macros/s/AKfy.../exec`). Simpan link ini.

---

## Langkah 2 — Hubungkan tampilan ke database

1. Buka file `index.html` dengan teks editor apa pun.
2. Cari baris di bagian `<script>`:
   ```js
   const API_URL = "";
   ```
3. Tempel link dari Langkah 1 di antara tanda kutip:
   ```js
   const API_URL = "https://script.google.com/macros/s/AKfy.../exec";
   ```
4. Simpan file.

Untuk mengetes cepat, buka `index.html` langsung di browser (klik dua kali). Coba tambah satu catatan, lalu cek: barisnya harus muncul di tab **Logbook** pada Google Sheet-mu.

---

## Langkah 3 — Publikasikan gratis via GitHub Pages

1. Buat akun di <https://github.com> bila belum punya.
2. Buat **repository baru** (mis. `logbook-magang`), set **Public**.
3. Upload file **`index.html`** ke repository:
   - Di halaman repo, klik **Add file → Upload files**, seret `index.html`, lalu **Commit changes**.
   - (File `Code.gs` dan `README.md` boleh ikut diupload sebagai arsip, tapi yang wajib untuk web hanya `index.html`.)
4. Buka **Settings → Pages**.
5. Di bagian **Source**, pilih branch **`main`** dan folder **`/ (root)`**, lalu **Save**.
6. Tunggu ±1 menit. Alamat webmu akan muncul di halaman itu, formatnya:
   ```
   https://NAMA-AKUN.github.io/logbook-magang/
   ```

Selesai. Buka alamat itu dari HP atau laptop mana pun untuk mencatat, dan datanya tersimpan aman di Google Sheet-mu.

---

## Cara pakai harian

- Isi form **Catatan hari ini** setiap sore sebelum pulang (10–15 menit).
- Kolom **Hari ke-** dan **Tanggal** terisi otomatis, tinggal disesuaikan.
- Gunakan kotak **pencarian** untuk menemukan catatan lama, atau filter **per minggu**.
- Ikon ✏️ untuk mengedit, 🗑️ untuk menghapus catatan.
- Saat magang selesai: buka Google Sheet → **File → Download → Excel/CSV** untuk mengolah data jadi laporan dan lampiran.

## Tips

- **Foto & data pengujian** (jarak LoRa, packet loss, latency) sebaiknya tetap di subfolder Drive / sheet terpisah. Di logbook, cukup tulis lokasi filenya pada kolom *Output / bukti*.
- **Kode** simpan di Git; tempel link commit pada kolom *Output / bukti*.
- Rekap tiap Jumat: filter **minggu** ini, baca ulang, dan itulah bahan bab "Pelaksanaan Magang".

## Kalau ada masalah

- **Web kosong / "Gagal memuat data":** pastikan `API_URL` benar dan deployment memakai akses **Anyone**. Setiap kali kode `Code.gs` diubah, buat **Deploy → Manage deployments → Edit → Version: New version**.
- **Catatan tidak masuk ke Sheet:** cek kembali langkah otorisasi (Langkah 1 no. 6).
- **Ganti tampilan tapi data tetap:** cukup ganti `index.html`, `API_URL` yang sama tetap menunjuk ke Sheet lama.
