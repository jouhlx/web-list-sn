/**
 * ==============================================================================
 * GOOGLE APPS SCRIPT: WEB LIST SN & MITRA CLOUD DATABASE (REV 3.0 - FIX DROPDOWN)
 * ==============================================================================
 * 
 * Target Spreadsheet:
 * https://docs.google.com/spreadsheets/d/1ovocklaF-petCx2nHZTjHN0NKARAw3-HJivESlIcRGM/edit?gid=0#gid=0
 * 
 * PERBAIKAN PENTING DI VERSI INI:
 * 1. AUTO-MATCH DROPDOWN SHEET (CHIP / PILIHAN VALIDASI AKTIF OTOMATIS):
 *    - Nilai Merk & Mitra dinormalisasi persis 100% sama dengan pilihan validasi di sheet
 *      (contoh: "Precon 150", "precon 100", "Huawei Baru", "AKU - AGS", dll).
 *    - Di Google Sheet, chip dropdown akan langsung menyala aktif (ter-klik otomatis).
 * 2. FORMAT TANGGAL RESMI GOOGLE SHEETS:
 *    - Tanggal ditulis sebagai Object Date resmi (GMT+7) dengan format "dd/MM/yyyy".
 *    - Popup kalender (date picker) di Google Sheet akan otomatis aktif saat diklik ganda.
 * 3. OTOMATIS MENEMUKAN TAB "Input" ATAU "list sn" (maupun sheet pertama).
 * 4. MENCEGAH TIMPA DATA: Menambahkan data baru persis di bawah baris terisi terakhir kolom SN.
 * 
 * CARA UPDATE KE GOOGLE APPS SCRIPT:
 * 1. Buka spreadsheet target Anda di browser.
 * 2. Klik menu "Ekstensi" > "Apps Script".
 * 3. Hapus semua kode lama, lalu PASTE SELURUH KODE DI BAWAH INI.
 * 4. Klik ikon Disket (Simpan / Ctrl+S).
 * 5. Klik tombol biru "Deploy" (pojok kanan atas) > pilih "Kelola deployment" (Manage deployments).
 * 6. Klik ikon Pensil (Edit) pada deployment yang sedang aktif:
 *    - Kolom "Versi": pilih "Versi baru" (New version).
 *    - Kolom "Akses": pastikan tetap "Siapa saja" (Anyone).
 *    - Klik tombol "Deploy".
 */

// ========================================================
// 1. GET: MEMBACA SELURUH DATA DARI GOOGLE SHEET KE WEB
// ========================================================
function doGet(e) {
  try {
    var sheet = getTargetSheet();
    var dataRange = sheet.getDataRange();
    var values = dataRange.getValues();

    if (!values || values.length <= 1) {
      return createJsonResponse({
        status: "success",
        sheetName: sheet.getName(),
        total: 0,
        data: []
      });
    }

    var historyList = [];

    // Baca mulai baris ke-2 (index 1) sampai baris paling bawah yang terisi
    for (var i = 1; i < values.length; i++) {
      var row = values[i];
      var snStr = String(row[1] || "").trim();

      if (snStr !== "") {
        var tanggalStr = formatTanggal(row[0]);
        var merkStr = String(row[2] || "").trim();
        var mitraStr = String(row[3] || "").trim();

        historyList.push({
          rowNumber: i + 1,
          tanggal: tanggalStr,
          sn: snStr,
          merk: merkStr,
          mitra: mitraStr,
          status: "synced"
        });
      }
    }

    // Urutkan dari data paling baru (baris terbawah di sheet tampil paling atas di web)
    historyList.reverse();

    return createJsonResponse({
      status: "success",
      sheetName: sheet.getName(),
      total: historyList.length,
      data: historyList
    });

  } catch (error) {
    return createJsonResponse({
      status: "error",
      message: error.toString()
    });
  }
}

// ========================================================
// 2. POST: MENULIS DATA SCAN KE GOOGLE SHEET DENGAN FORMAT VALID
// ========================================================
function doPost(e) {
  try {
    var sheet = getTargetSheet();
    var contents = e.postData ? e.postData.contents : null;
    if (!contents) {
      throw new Error("Payload kosong.");
    }

    var payload = JSON.parse(contents);
    var items = payload.items || [payload];
    var rowsToAppend = [];

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if (item && item.sn) {
        // 1. Konversi Tanggal ke Real Date Object agar date picker Google Sheet aktif
        var dateObj = parseDateForSheet(item.tanggal);

        // 2. SN Perangkat
        var sn = String(item.sn).trim();

        // 3. Normalisasi Merk persis sesuai pilihan Data Validation Sheet
        var merk = normalizeMerk(item.merk);

        // 4. Normalisasi Mitra persis sesuai pilihan Data Validation Sheet
        var mitra = normalizeMitra(item.mitra);

        rowsToAppend.push([dateObj, sn, merk, mitra]);
      }
    }

    if (rowsToAppend.length > 0) {
      // Cari baris terakhir yang benar-benar terisi di kolom B (SN)
      var snColumnValues = sheet.getRange("B:B").getValues();
      var trueLastRow = 1;

      for (var r = snColumnValues.length - 1; r >= 0; r--) {
        if (String(snColumnValues[r][0]).trim() !== "") {
          trueLastRow = r + 1;
          break;
        }
      }

      var insertStartRow = trueLastRow + 1;
      var targetRange = sheet.getRange(insertStartRow, 1, rowsToAppend.length, 4);
      
      // Tulis data ke sheet
      targetRange.setValues(rowsToAppend);

      // Kunci format tanggal kolom A sebagai dd/MM/yyyy
      sheet.getRange(insertStartRow, 1, rowsToAppend.length, 1).setNumberFormat("dd/MM/yyyy");
    }

    return createJsonResponse({
      status: "success",
      sheetName: sheet.getName(),
      count: rowsToAppend.length,
      message: "Sukses menambahkan " + rowsToAppend.length + " data ke sheet " + sheet.getName() + " mulai baris " + (trueLastRow + 1)
    });

  } catch (error) {
    return createJsonResponse({
      status: "error",
      message: error.toString()
    });
  }
}

// ========================================================
// HELPER: NORMALISASI SESUAI DATA VALIDATION GOOGLE SHEET
// ========================================================

/**
 * Menyelaraskan teks merk ke 13 pilihan resmi di Data Validation Sheet:
 * "Huawei Bekas,Huawei Baru,Raisecom Bekas,Raisecom Baru,ZTE Bekas,ZTE Baru,ott,Precon 150,Precon 250,Precon 50,precon 100,Fiber Home,Raisecom Switch"
 */
function normalizeMerk(rawMerk) {
  if (!rawMerk) return "";
  var m = String(rawMerk).trim().toLowerCase();

  if (m === "precon 150" || m === "precon150") return "Precon 150";
  if (m === "precon 100" || m === "precon100") return "precon 100"; // Huruf kecil 'precon' sesuai sheet
  if (m === "precon 250" || m === "precon250") return "Precon 250";
  if (m === "precon 50" || m === "precon50") return "Precon 50";

  if (m === "huawei" || m === "huawei baru") return "Huawei Baru";
  if (m === "huawei bekas") return "Huawei Bekas";

  if (m === "zte" || m === "zte baru") return "ZTE Baru";
  if (m === "zte bekas") return "ZTE Bekas";

  if (m === "raisecom" || m === "raisecom baru") return "Raisecom Baru";
  if (m === "raisecom bekas") return "Raisecom Bekas";
  if (m === "raisecom switch") return "Raisecom Switch";

  if (m === "fiber home" || m === "fiberhome") return "Fiber Home";
  if (m === "ott") return "ott";

  return rawMerk;
}

/**
 * Menyelaraskan teks mitra ke 31 pilihan resmi di Data Validation Sheet
 */
function normalizeMitra(rawMitra) {
  if (!rawMitra) return "";
  var m = String(rawMitra).trim();

  // Khusus AKU - AGS (di sheet menggunakan spasi di sekitar tanda minus)
  if (m.toUpperCase() === "AKU-AGS" || m.toUpperCase() === "AKU - AGS") {
    return "AKU - AGS";
  }

  var validMitras = [
    "ANKA TEGUH", "ANKA HARIZ", "ANKA DIMAS EKO", "KOPEG HAVIZ", "KOPEG A",
    "AJT", "ADE", "GSP", "AKU - AGS", "PT.BSR", "kirim kediri", "ADW", "KPS",
    "URC", "ANKA", "KOPEG H", "SPARE", "KOPEG SERA", "CBS", "SAMUSA",
    "GMS", "WAN", "KOP", "JDM", "MMS", "API", "ANA", "KOPEG", "AZKA", "PSW", "KOPEG B"
  ];

  for (var i = 0; i < validMitras.length; i++) {
    if (validMitras[i].toLowerCase() === m.toLowerCase()) {
      return validMitras[i];
    }
  }

  return rawMitra;
}

/**
 * Mengubah string tanggal "DD/MM/YYYY" menjadi Date object resmi Google Sheets
 */
function parseDateForSheet(dateStr) {
  if (!dateStr) return new Date();
  var str = String(dateStr).trim();
  var parts = str.split('/');
  if (parts.length === 3) {
    var d = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10) - 1; // 0-indexed month
    var y = parseInt(parts[2], 10);
    if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
      return new Date(y, m, d, 12, 0, 0); // Diset jam 12 siang agar aman dari timezone shift
    }
  }
  return new Date();
}

/**
 * Menemukan tab sheet yang tepat (Tab "Input", "list sn", atau sheet pertama)
 */
function getTargetSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();

  for (var i = 0; i < sheets.length; i++) {
    var name = sheets[i].getName().trim().toLowerCase();
    if (name === "input" || name === "list sn" || name === "listsn" || name.indexOf("input") !== -1 || name.indexOf("list sn") !== -1) {
      return sheets[i];
    }
  }

  return sheets[0];
}

function formatTanggal(raw) {
  if (!raw) return Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy");
  if (raw instanceof Date) {
    return Utilities.formatDate(raw, "GMT+7", "dd/MM/yyyy");
  }
  return String(raw).trim();
}

function createJsonResponse(dataObj) {
  return ContentService.createTextOutput(JSON.stringify(dataObj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Uji coba langsung di editor Apps Script
function testWrite() {
  var sheet = getTargetSheet();
  Logger.log("Testing on sheet: " + sheet.getName());
}
