/**
 * PLAYROOM BOOKING — Backend jadwal berbasis Google Sheets
 *
 * Cara pakai singkat (detail di README.md):
 *  1. Buat Google Sheet baru → Extensions → Apps Script → paste file ini.
 *  2. Jalankan fungsi `setupSheet` sekali (izinkan akses) → tab & dropdown dibuat otomatis.
 *  3. Deploy → New deployment → Web app → Execute as: Me, Who has access: Anyone.
 *  4. Copy URL /exec → tempel ke assets/js/config.js (API_URL).
 *
 * Endpoint hanya MENGIRIM: data ruangan + (tanggal, ruangan, jam mulai, jam selesai).
 * Nama & nomor WA customer TIDAK pernah dikirim ke website.
 */

const SHEET_BOOKING = 'Booking';
const SHEET_ROOMS = 'Ruangan';
const TZ = 'Asia/Jakarta';
const DAYS_AHEAD = 14;     // booking yang dikirim: hari ini s/d +14 hari
const CACHE_KEY = 'payload_v1';
const CACHE_SEC = 60;      // cache 60 detik; otomatis dihapus tiap ada edit
const OPEN_HOUR = 9;
const CLOSE_HOUR = 21;

const BOOKING_HEADERS = ['Tanggal', 'Ruangan', 'Mulai', 'Selesai', 'Nama', 'No WA', 'Status', 'Catatan'];
const ROOM_HEADERS = ['Nama', 'Tipe', 'Lantai', 'Harga/Jam', 'Harga 3 Jam', 'Kapasitas', 'Game (pisah koma)', 'Link Reel IG / Foto', 'Fasilitas (pisah koma)', 'Deskripsi', 'Aktif'];
const STATUS_ACTIVE = ['Hold', 'Lunas'];        // status yang membuat slot tampil "terbooking"
const STATUS_ALL = ['Hold', 'Lunas', 'Batal'];

/* ============================ API ============================ */

function doGet() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get(CACHE_KEY);
  if (hit) return json_(hit);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const body = JSON.stringify({
    updatedAt: new Date().toISOString(),
    rooms: readRooms_(ss),
    bookings: readBookings_(ss),
  });
  cache.put(CACHE_KEY, body, CACHE_SEC);
  return json_(body);
}

/** Simple trigger: setiap admin mengedit sheet, cache dibuang → website langsung dapat data terbaru. */
function onEdit() {
  CacheService.getScriptCache().remove(CACHE_KEY);
}

function json_(s) {
  return ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.JSON);
}

/* ============================ READERS ============================ */

function readRooms_(ss) {
  const sh = ss.getSheetByName(SHEET_ROOMS);
  if (!sh || sh.getLastRow() < 2) return [];
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, ROOM_HEADERS.length).getValues();
  return rows
    .filter((r) => String(r[0]).trim())
    .map((r) => ({
      name: String(r[0]).trim(),
      type: String(r[1]).trim(),
      floor: String(r[2]).trim(),
      price: Number(r[3]) || 0,
      price3: Number(r[4]) || 0,
      capacity: Number(r[5]) || 0,
      games: splitList_(r[6]),
      reel: String(r[7]).trim(),
      features: splitList_(r[8]),
      description: String(r[9]).trim(),
      active: r[10] === '' ? true : r[10] === true || String(r[10]).toUpperCase() === 'TRUE',
    }));
}

function readBookings_(ss) {
  const sh = ss.getSheetByName(SHEET_BOOKING);
  if (!sh || sh.getLastRow() < 2) return [];
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 7).getValues();

  const today = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  const until = Utilities.formatDate(new Date(Date.now() + DAYS_AHEAD * 864e5), TZ, 'yyyy-MM-dd');
  const out = [];

  rows.forEach((r) => {
    const date = toISODate_(r[0]);
    const room = String(r[1]).trim();
    const start = toHHmm_(r[2]);
    const end = toHHmm_(r[3]);
    const status = String(r[6]).trim();
    if (!date || !room || !start || !end) return;
    if (STATUS_ACTIVE.indexOf(status) === -1) return;
    if (date < today || date > until) return;
    out.push({ date: date, room: room, start: start, end: end });   // tanpa nama / no WA
  });
  return out;
}

/* ============================ HELPERS ============================ */

function splitList_(v) {
  return String(v || '').split(',').map((s) => s.trim()).filter(Boolean);
}

function toISODate_(v) {
  if (v instanceof Date && !isNaN(v)) return Utilities.formatDate(v, TZ, 'yyyy-MM-dd');
  const m = String(v).trim().match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/); // dd/mm/yyyy
  if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  return '';
}

function toHHmm_(v) {
  if (v instanceof Date && !isNaN(v)) return Utilities.formatDate(v, TZ, 'HH:mm');
  const m = String(v).trim().match(/^(\d{1,2})[:.](\d{2})/);
  return m ? ('0' + m[1]).slice(-2) + ':' + m[2] : '';
}

/* ============================ SETUP (jalankan sekali) ============================ */

function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone(TZ);

  // --- Tab Ruangan ---
  let rooms = ss.getSheetByName(SHEET_ROOMS) || ss.insertSheet(SHEET_ROOMS);
  if (rooms.getLastRow() === 0) {
    rooms.getRange(1, 1, 1, ROOM_HEADERS.length).setValues([ROOM_HEADERS]);
    const data = defaultRooms_();
    rooms.getRange(2, 1, data.length, ROOM_HEADERS.length).setValues(data);
  }
  styleHeader_(rooms, ROOM_HEADERS.length);
  rooms.getRange('D2:E').setNumberFormat('#,##0');
  rooms.getRange('K2:K').insertCheckboxes();
  rooms.setColumnWidth(7, 320);
  rooms.setColumnWidth(10, 260);

  // --- Tab Booking ---
  let book = ss.getSheetByName(SHEET_BOOKING) || ss.insertSheet(SHEET_BOOKING, 0);
  if (book.getLastRow() === 0) book.getRange(1, 1, 1, BOOKING_HEADERS.length).setValues([BOOKING_HEADERS]);
  styleHeader_(book, BOOKING_HEADERS.length);

  const hours = [];
  for (let h = OPEN_HOUR; h <= CLOSE_HOUR; h++) hours.push(('0' + h).slice(-2) + ':00');

  book.getRange('A2:A').setNumberFormat('dd/mm/yyyy')
    .setDataValidation(SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(false).build());
  book.getRange('B2:B').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInRange(rooms.getRange('A2:A'), true).setAllowInvalid(false).build());
  book.getRange('C2:D').setNumberFormat('@').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(hours, true).setAllowInvalid(false).build());
  book.getRange('F2:F').setNumberFormat('@');
  book.getRange('G2:G').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(STATUS_ALL, true).setAllowInvalid(false).build());

  // Warna status
  const g = book.getRange('A2:H');
  book.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$G2="Lunas"').setBackground('#d9f7e3').setRanges([g]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$G2="Hold"').setBackground('#fff4cc').setRanges([g]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$G2="Batal"').setFontColor('#999999').setStrikethrough(true).setRanges([g]).build(),
  ]);
  book.setColumnWidths(1, 8, 120);

  const def = ss.getSheetByName('Sheet1');
  if (def && def.getLastRow() === 0 && ss.getSheets().length > 2) ss.deleteSheet(def);

  CacheService.getScriptCache().remove(CACHE_KEY);
  SpreadsheetApp.getUi().alert('Setup selesai ✅\n\nIsi list game asli di tab "Ruangan", lalu deploy sebagai Web App.');
}

function styleHeader_(sh, n) {
  sh.getRange(1, 1, 1, n).setFontWeight('bold').setBackground('#2e1f66').setFontColor('#ffffff');
  sh.setFrozenRows(1);
}

function defaultRooms_() {
  const GAME_TODO = 'ISI LIST GAME, pisahkan dengan koma';
  const vipPs = (n) => ['VIP ' + n, 'VIP PS', '1', 35000, 95000, 6, GAME_TODO, '', 'Ruangan private, PS5, Netflix, AC', 'Ruangan private PS5 lengkap dengan Netflix.', true];
  const reg = (n) => ['Reguler ' + n, 'Reguler PS', '1', 20000, 55000, 4, GAME_TODO, '', 'Open space bersekat, PS5', 'Spot PS5 open space dengan sekat.', true];
  const vipNs = (name, lt) => [name, 'VIP Switch', lt, 35000, 95000, 6, GAME_TODO, '', 'Ruangan private, Nintendo Switch, Netflix, AC', 'Ruangan private Nintendo Switch di lantai ' + lt + '.', true];
  return [
    vipPs(1), vipPs(2), vipPs(3), vipPs(4),
    reg(1), reg(2), reg(3), reg(4),
    ['VIP Arcade', 'VIP Switch', '2', 50000, 135000, 8, GAME_TODO, '', 'Ruangan private, PS5 + Nintendo Switch, Netflix, Ruangan paling luas', 'Ruangan VIP terbesar: PS5 dan Nintendo Switch sekaligus.', true],
    vipNs('VIP Neon', '2'), vipNs('VIP Pixel', '2'), vipNs('VIP Retro', '1'), vipNs('VIP Turbo', '1'),
  ];
}
