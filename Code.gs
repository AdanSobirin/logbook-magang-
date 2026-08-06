/**
 * Logbook Magang — Backend Google Apps Script
 * ------------------------------------------------------------
 * Menyimpan catatan harian ke Google Sheets dan menyediakannya
 * untuk web di GitHub Pages.
 *
 * Cara pakai singkat (langkah lengkap ada di README.md):
 *   1. Buka Google Sheet baru.
 *   2. Menu: Extensions > Apps Script.
 *   3. Hapus isi default, tempel SELURUH file ini, lalu Save.
 *   4. Deploy > New deployment > pilih "Web app".
 *      - Execute as: Me
 *      - Who has access: Anyone
 *   5. Salin "Web app URL", tempel ke API_URL di index.html.
 * ------------------------------------------------------------
 */

var SHEET_NAME = 'Logbook';
var HEADERS = ['id', 'tanggal', 'hariKe', 'kegiatan', 'dipelajari',
               'kendala', 'output', 'rencana', 'createdAt'];

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADERS);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
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
        id: String(r[0]), tanggal: r[1], hariKe: r[2], kegiatan: r[3],
        dipelajari: r[4], kendala: r[5], output: r[6], rencana: r[7]
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
      sh.appendRow([
        body.id, body.tanggal, body.hariKe, body.kegiatan, body.dipelajari,
        body.kendala, body.output, body.rencana, new Date()
      ]);
      return json({ ok: true, action: 'create', id: body.id });
    }

    if (action === 'update' || action === 'delete') {
      var ids = sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 0), 1).getValues();
      var rowIndex = -1;
      for (var i = 0; i < ids.length; i++) {
        if (String(ids[i][0]) === String(body.id)) { rowIndex = i + 2; break; }
      }
      if (rowIndex === -1) return json({ ok: false, error: 'id tidak ditemukan' });

      if (action === 'delete') {
        sh.deleteRow(rowIndex);
        return json({ ok: true, action: 'delete', id: body.id });
      }
      // update
      sh.getRange(rowIndex, 1, 1, 8).setValues([[
        body.id, body.tanggal, body.hariKe, body.kegiatan,
        body.dipelajari, body.kendala, body.output, body.rencana
      ]]);
      return json({ ok: true, action: 'update', id: body.id });
    }

    return json({ ok: false, error: 'action tidak dikenal' });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}
