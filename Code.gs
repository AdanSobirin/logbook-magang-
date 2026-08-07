/**
 * Logbook Magang — Backend Google Apps Script
 * ------------------------------------------------------------
 * Menyimpan catatan harian ke Google Sheets + foto ke Google Drive,
 * dan menyediakannya untuk web di GitHub Pages.
 *
 * Cara pakai singkat (langkah lengkap ada di README.md):
 *   1. Buka Google Sheet baru.
 *   2. Menu: Extensions > Apps Script.
 *   3. Hapus isi default, tempel SELURUH file ini, lalu Save.
 *   4. Deploy > New deployment > pilih "Web app".
 *      - Execute as: Me
 *      - Who has access: Anyone
 *   5. Salin "Web app URL", tempel ke API_URL di app.js.
 *
 * Foto otomatis disimpan ke folder Drive "Logbook Magang - Foto"
 * (dibuat otomatis di My Drive milik akun yang deploy skrip ini),
 * dengan nama file otomatis "YYYY-MM-DD_001.jpg" dst — tidak perlu
 * mengetik nama file secara manual.
 * ------------------------------------------------------------
 */

var SHEET_NAME = 'Logbook';
var FOLDER_NAME = 'Logbook Magang - Foto';
var HEADERS = ['id', 'tanggal', 'hariKe', 'kegiatan', 'dipelajari',
               'kendala', 'output', 'rencana', 'foto', 'createdAt'];

/**
 * JALANKAN FUNGSI INI SEKALI SECARA MANUAL kalau muncul error
 * "You do not have permission to call DriveApp...".
 * Caranya: pilih "authorizeDriveAccess" di dropdown fungsi (toolbar atas
 * editor ini), lalu klik tombol Run (▶). Google akan menampilkan layar
 * izin — pilih akunmu, klik Advanced → Go to ... (unsafe) kalau muncul
 * peringatan "belum diverifikasi", lalu Allow. Setelah itu upload foto
 * dari web app akan berfungsi tanpa perlu deploy ulang.
 */
function authorizeDriveAccess() {
  getPhotoFolder();
  getSheet();
}

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADERS);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sh.setFrozenRows(1);
    return sh;
  }
  // Migrasi: kalau sheet dibuat oleh versi lama tanpa kolom 'foto',
  // sisipkan kolomnya di depan 'createdAt' supaya data lama tetap aman.
  var lastCol = Math.max(sh.getLastColumn(), 1);
  var headerRow = sh.getRange(1, 1, 1, lastCol).getValues()[0];
  if (headerRow.indexOf('foto') === -1) {
    var createdAtCol = headerRow.indexOf('createdAt');
    var insertAt = createdAtCol === -1 ? headerRow.length + 1 : createdAtCol + 1;
    sh.insertColumnBefore(insertAt);
    sh.getRange(1, insertAt).setValue('foto').setFontWeight('bold');
  }
  return sh;
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function pad(n, len) {
  var s = String(n);
  while (s.length < len) s = '0' + s;
  return s;
}

/** Folder Drive tempat semua foto logbook disimpan (dibuat otomatis sekali). */
function getPhotoFolder() {
  var it = DriveApp.getFoldersByName(FOLDER_NAME);
  if (it.hasNext()) return it.next();
  return DriveApp.createFolder(FOLDER_NAME);
}

/** Nomor urut berikutnya untuk tanggal tertentu, aman dari race condition. */
function nextSeq(dateStr) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var props = PropertiesService.getScriptProperties();
    var key = 'seq_' + dateStr;
    var n = parseInt(props.getProperty(key) || '0', 10) + 1;
    props.setProperty(key, String(n));
    return n;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Upload sekumpulan foto (base64) ke Drive dengan nama otomatis
 * "YYYY-MM-DD_urutan.ext" — pengguna tidak perlu mengetik nama file.
 * Mengembalikan array {id, name, url, viewUrl} siap dipakai di web.
 * Setiap foto diproses dalam try/catch tersendiri supaya satu foto yang
 * bermasalah tidak menggagalkan foto lain yang sudah berhasil diupload.
 */
function uploadPhotos(fotos, tanggal) {
  if (!fotos || !fotos.length) return [];
  var folder = getPhotoFolder();
  var dateStr = (tanggal && String(tanggal).trim()) ||
    Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var out = [];
  fotos.forEach(function (f) {
    if (!f || !f.base64) return;
    try {
      var seq = nextSeq(dateStr);
      var mimeType = f.mimeType || 'image/jpeg';
      var ext = mimeType.indexOf('png') > -1 ? 'png' : 'jpg';
      var name = dateStr + '_' + pad(seq, 3) + '.' + ext;
      var bytes = Utilities.base64Decode(f.base64);
      var blob = Utilities.newBlob(bytes, mimeType, name);
      var file = folder.createFile(blob);

      // Coba buat foto bisa diakses publik (perlu untuk ditampilkan di web).
      // Kalau langkah ini gagal (mis. dibatasi kebijakan akun/organisasi),
      // foto tetap tersimpan — jangan sampai batal semuanya gara-gara ini.
      try {
        file.setSharingAccess(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (shareErr) {
        // diamkan — file tetap ada di Drive, hanya mungkin belum publik.
      }

      var id = file.getId();
      out.push({
        id: id,
        name: name,
        url: 'https://drive.google.com/thumbnail?id=' + id + '&sz=w1000',
        viewUrl: 'https://drive.google.com/file/d/' + id + '/view'
      });
    } catch (fileErr) {
      // Lewati foto ini, lanjut ke foto berikutnya dalam batch yang sama.
    }
  });
  return out;
}

function safeParseFoto(val) {
  if (!val) return [];
  try {
    var parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

/**
 * Google Sheets otomatis mengubah sel yang isinya terlihat seperti tanggal
 * (mis. "2026-08-03") menjadi objek Date sungguhan. Kalau langsung dikirim
 * lewat JSON, Date berubah jadi string ISO lengkap dengan jam
 * ("2026-08-03T17:00:00.000Z") yang tidak dikenali oleh tampilan web.
 * Fungsi ini mengembalikannya ke format "YYYY-MM-DD" memakai timezone
 * spreadsheet, supaya konsisten berapa pun cara Sheets menyimpannya.
 */
function formatDateCell(val) {
  if (Object.prototype.toString.call(val) === '[object Date]' && !isNaN(val)) {
    var tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
    return Utilities.formatDate(val, tz, 'yyyy-MM-dd');
  }
  return val;
}

/** READ — kembalikan semua catatan sebagai array JSON */
function doGet(e) {
  try {
    var sh = getSheet();
    var values = sh.getDataRange().getValues();
    var rows = [];
    for (var i = 1; i < values.length; i++) {
      var r = values[i];
      if (!r[0]) continue;
      rows.push({
        id: String(r[0]), tanggal: formatDateCell(r[1]), hariKe: r[2], kegiatan: r[3],
        dipelajari: r[4], kendala: r[5], output: r[6], rencana: r[7],
        foto: safeParseFoto(r[8])
      });
    }
    return json(rows);
  } catch (err) {
    return json({ error: String(err) });
  }
}

/** WRITE — create / update / delete */
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action;
    var sh = getSheet();

    if (action === 'create') {
      // Simpan teks catatan DULU — kalau upload foto gagal (mis. izin Drive
      // belum di-otorisasi), catatan tidak boleh ikut hilang.
      var fotoLama = body.fotoLama || [];
      sh.appendRow([
        body.id, body.tanggal, body.hariKe, body.kegiatan, body.dipelajari,
        body.kendala, body.output, body.rencana, JSON.stringify(fotoLama), new Date()
      ]);
      var rowIndex = sh.getLastRow();

      var fotoAll = fotoLama;
      var fotoError = null;
      try {
        var uploaded = uploadPhotos(body.fotoBaru, body.tanggal);
        if (uploaded.length) {
          fotoAll = fotoLama.concat(uploaded);
          sh.getRange(rowIndex, 9).setValue(JSON.stringify(fotoAll));
        }
      } catch (photoErr) {
        fotoError = String(photoErr);
      }

      return json({ ok: true, action: 'create', id: body.id, foto: fotoAll, fotoError: fotoError });
    }

    if (action === 'update' || action === 'delete') {
      var ids = sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 0), 1).getValues();
      var rowIndex2 = -1;
      for (var i = 0; i < ids.length; i++) {
        if (String(ids[i][0]) === String(body.id)) { rowIndex2 = i + 2; break; }
      }
      if (rowIndex2 === -1) return json({ ok: false, error: 'id tidak ditemukan' });

      if (action === 'delete') {
        sh.deleteRow(rowIndex2);
        return json({ ok: true, action: 'delete', id: body.id });
      }

      // update teks DULU, foto belakangan (alasan sama seperti create)
      var fotoLamaU = body.fotoLama || [];
      sh.getRange(rowIndex2, 1, 1, 8).setValues([[
        body.id, body.tanggal, body.hariKe, body.kegiatan,
        body.dipelajari, body.kendala, body.output, body.rencana
      ]]);
      sh.getRange(rowIndex2, 9).setValue(JSON.stringify(fotoLamaU));

      var fotoAllU = fotoLamaU;
      var fotoErrorU = null;
      try {
        var uploadedU = uploadPhotos(body.fotoBaru, body.tanggal);
        if (uploadedU.length) {
          fotoAllU = fotoLamaU.concat(uploadedU);
          sh.getRange(rowIndex2, 9).setValue(JSON.stringify(fotoAllU));
        }
      } catch (photoErrU) {
        fotoErrorU = String(photoErrU);
      }

      return json({ ok: true, action: 'update', id: body.id, foto: fotoAllU, fotoError: fotoErrorU });
    }

    return json({ ok: false, error: 'action tidak dikenal' });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}
