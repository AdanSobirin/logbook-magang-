# Logbook Magang

Aplikasi web pencatatan harian magang. **Gratis 100%**, tanpa server:

- **Tampilan (frontend):** `index.html` + `style.css` + `app.js`, di-hosting gratis lewat **GitHub Pages**.
- **Database:** **Google Sheets**, dijembatani oleh **Google Apps Script**.
- **Foto kegiatan:** diupload langsung dari HP/laptop, otomatis tersimpan ke **Google Drive** dengan nama file otomatis (tidak perlu diketik manual).

Data tersimpan di Google Sheet & Drive milikmu sendiri, jadi mudah dibuat tabel/grafik untuk laporan dan skripsi.

> Sebelum di-setup, aplikasi tetap bisa dicoba — catatan tersimpan sementara di browser (localStorage), termasuk foto (sebagai data lokal). Setelah `API_URL` diisi, semua catatan masuk ke Google Sheet dan foto masuk ke Google Drive.

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
   Kali ini kamu juga akan diminta izin akses **Google Drive** — ini dipakai untuk menyimpan foto kegiatan yang kamu upload dari web.
7. Salin **Web app URL** (formatnya `https://script.google.com/macros/s/AKfy.../exec`). Simpan link ini.

> Sudah pernah deploy versi lama (tanpa fitur foto)? Tempel ulang isi `Code.gs` yang baru ke Apps Script, lalu **Deploy → Manage deployments → Edit (✏️) → Version: New version → Deploy**. Sheet lama otomatis dilengkapi kolom `foto` tanpa menghapus data yang sudah ada, dan `API_URL` tidak berubah.

---

## Langkah 2 — Hubungkan tampilan ke database

1. Buka file `app.js` dengan teks editor apa pun.
2. Cari baris di bagian paling atas:
   ```js
   const API_URL = "";
   ```
3. Tempel link dari Langkah 1 di antara tanda kutip:
   ```js
   const API_URL = "https://script.google.com/macros/s/AKfy.../exec";
   ```
4. Simpan file.

Untuk mengetes cepat, buka `index.html` langsung di browser (klik dua kali) — `style.css` dan `app.js` harus berada di folder yang sama. Coba tambah satu catatan (boleh sertakan foto), lalu cek: barisnya harus muncul di tab **Logbook** pada Google Sheet-mu, dan fotonya muncul di folder Drive **"Logbook Magang - Foto"**.

---

## Langkah 3 — Publikasikan gratis via GitHub Pages

1. Buat akun di <https://github.com> bila belum punya.
2. Buat **repository baru** (mis. `logbook-magang`), set **Public**.
3. Upload **`index.html`, `style.css`, dan `app.js`** ke repository (harus tiga-tiganya, dalam folder yang sama):
   - Di halaman repo, klik **Add file → Upload files**, seret ketiga file itu, lalu **Commit changes**.
   - (File `Code.gs` dan `README.md` boleh ikut diupload sebagai arsip, tapi yang wajib untuk web adalah `index.html` + `style.css` + `app.js`.)
4. Buka **Settings → Pages**.
5. Di bagian **Source**, pilih branch **`main`** dan folder **`/ (root)`**, lalu **Save**.
6. Tunggu ±1 menit. Alamat webmu akan muncul di halaman itu, formatnya:
   ```
   https://NAMA-AKUN.github.io/logbook-magang/
   ```

Selesai. Buka alamat itu dari HP atau laptop mana pun untuk mencatat, dan datanya tersimpan aman di Google Sheet-mu.

---

## Cara pakai harian

- Isi form **Catatan hari ini** setiap sore sebelum pulang (10–15 menit) — bisa juga langsung diisi saat masih di lokasi/lapangan lewat HP.
- Kolom **Hari ke-** dan **Tanggal** terisi otomatis, tinggal disesuaikan.
- Untuk foto: tekan **"Ambil / pilih foto"** — di HP akan muncul pilihan kamera atau galeri, di laptop akan membuka file explorer (bisa juga di-drag & drop ke kotaknya). Boleh lebih dari satu foto sekaligus.
  - Foto otomatis dikecilkan & dikompres dulu di perangkatmu sebelum diunggah (supaya tetap cepat walau sinyal lapangan pas-pasan), lalu tersimpan ke Google Drive dengan nama file **otomatis berurutan** — tidak perlu mengetik nama file.
  - Tekan ✕ di pojok foto untuk membatalkan sebelum disimpan, atau menghapusnya saat mode edit.
- Gunakan kotak **pencarian** untuk menemukan catatan lama, atau filter **per minggu**.
- Ikon ✏️ untuk mengedit, 🗑️ untuk menghapus catatan.
- Saat magang selesai: buka Google Sheet → **File → Download → Excel/CSV** untuk mengolah data jadi laporan dan lampiran; foto-foto ada di folder Drive **"Logbook Magang - Foto"**.

## Tips

- **Foto** cukup diupload lewat form — otomatis rapi berurutan per tanggal di Drive, tidak perlu diatur manual lagi.
- **Data pengujian** (jarak LoRa, packet loss, latency) sebaiknya tetap di subfolder Drive / sheet terpisah. Di logbook, cukup tulis lokasi filenya pada kolom *Output / bukti (teks)*.
- **Kode** simpan di Git; tempel link commit pada kolom *Output / bukti (teks)*.
- Rekap tiap Jumat: filter **minggu** ini, baca ulang, dan itulah bahan bab "Pelaksanaan Magang".

## Kalau ada masalah

- **Web kosong / "Gagal memuat data":** pastikan `API_URL` di `app.js` benar dan deployment memakai akses **Anyone**. Setiap kali kode `Code.gs` diubah, buat **Deploy → Manage deployments → Edit → Version: New version**.
- **Catatan tidak masuk ke Sheet / foto tidak masuk ke Drive:** cek kembali langkah otorisasi (Langkah 1 no. 6), termasuk izin akses Drive.
- **Foto lama tidak tampak setelah update `Code.gs`:** pastikan sheet lama sudah punya kolom `foto` — kolom ini otomatis ditambahkan sendiri saat Web App pertama kali dipanggil setelah `Code.gs` diperbarui.
- **Ganti tampilan tapi data tetap:** cukup ganti `index.html` + `style.css` + `app.js`, `API_URL` yang sama di `app.js` tetap menunjuk ke Sheet & folder Drive lama.
