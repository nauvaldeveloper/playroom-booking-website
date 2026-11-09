/**
 * KONFIGURASI WEBSITE
 * Ubah nilai di sini saja, tidak perlu menyentuh app.js.
 */
window.LOG_CONFIG = {
  // Nama bisnis (dipakai di navbar, footer & pesan WhatsApp).
  BRAND_NAME: 'Respawn Playroom',

  // URL Web App Apps Script (lihat README). Kosongkan = pakai data contoh dari data.js.
  API_URL: '',

  /* ---------- MODE DEMO / PORTFOLIO ----------
   * true  = tampilkan banner "Website concept", tombol booking memunculkan
   *         pratinjau pesan WA + ajakan menghubungi developer.
   * false = website sungguhan: tombol booking langsung membuka WhatsApp admin.
   */
  DEMO: true,
  DEV_NAME: 'Nauval Dev',
  // Link kontak developer. Bisa wa.me/62xxxx atau DM Instagram.
  DEV_CONTACT_URL: 'https://ig.me/m/nauval_dev',

  // Kontak bisnis — dipakai hanya saat DEMO: false. Kosongkan untuk menyembunyikan tombolnya.
  WA_NUMBER: '',            // format 62xxxxxxxxxx
  WA_DISPLAY: '',
  INSTAGRAM_URL: '',
  INSTAGRAM_HANDLE: '',
  MAPS_URL: '',
  ADDRESS: 'Jl. Contoh Raya No. 12, Bandung',

  // Jam operasional (format 24 jam). Slot terakhir = CLOSE_HOUR - 1.
  OPEN_HOUR: 9,
  CLOSE_HOUR: 21,

  // Berapa hari ke depan yang bisa dilihat/di-booking.
  DAYS_AHEAD: 7,
};
