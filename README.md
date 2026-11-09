# Playroom Booking — Website Concept

Website concept by **Nauval Dev**: landing page + jadwal live + booking via WhatsApp untuk bisnis
rental/playroom PS5 & Nintendo Switch. Merek ("Respawn Playroom"), ruangan, harga & list game semuanya fiktif.

Frontend HTML/CSS/JS biasa (tanpa build tool), data jadwal dari Google Sheets lewat Apps Script.

## Mode demo vs website sungguhan

Di `assets/js/config.js`:

- `DEMO: true` (default): baris kecil "Website concept" tampil di atas, tombol **Booking via WhatsApp** memunculkan
  pratinjau pesan WA (tidak mengirim ke siapa pun). Link "Hubungi" mengarah ke `DEV_CONTACT_URL`.
- `DEMO: false` + isi `WA_NUMBER`: tombol booking langsung membuka WhatsApp admin bisnis.

Untuk dipakai klien: ganti `BRAND_NAME`, logo (`assets/img/logo.svg`), kontak, lalu set `DEMO: false`.

```
index.html
assets/
  css/style.css
  js/config.js     ← SEMUA pengaturan (URL API, no WA, Maps, jam buka)
  js/data.js       ← data dummy untuk mode demo
  js/app.js        ← logika website
  img/logo.svg
apps-script/Code.gs ← backend Google Sheets
```

## Jalankan (mode demo)

Buka `index.html` langsung di browser. Selama `API_URL` di `config.js` masih kosong, website memakai data contoh dari `data.js`.

Foto ruangan bisa ditambahkan lewat field `image` (URL) di data/Sheet. Tanpa foto, kartu memakai cover grafis otomatis.

## Hubungkan ke Google Sheets

1. Buat Google Sheet baru (pakai akun Google milik bisnisnya).
2. **Extensions → Apps Script**, hapus isi default, lalu paste isi `apps-script/Code.gs`. Simpan.
3. Pilih fungsi **`setupSheet`** → **Run** → izinkan akses. Tab `Booking` & `Ruangan` dibuat otomatis lengkap dengan dropdown.
4. Di tab **Ruangan**, ganti kolom *Game* dengan list game asli tiap ruangan (pisahkan dengan koma).
5. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Copy URL yang berakhiran `/exec`, lalu tempel ke `API_URL` di `assets/js/config.js`.

> Jika `Code.gs` diubah, buat versi baru lewat **Deploy → Manage deployments → Edit → Version: New version** supaya URL tetap sama.

## Cara admin mengisi jadwal

Tab **Booking**, satu baris = satu booking:

| Tanggal | Ruangan | Mulai | Selesai | Nama | No WA | Status | Catatan |
|---|---|---|---|---|---|---|---|
| 08/11/2026 | VIP Retro | 11:00 | 14:00 | Budi | 08xx | Lunas | |

- **Status `Hold`** → customer sudah konfirmasi, menunggu transfer (slot tampil terbooking).
- **Status `Lunas`** → sudah bayar.
- **Status `Batal`** → slot kembali kosong di website.
- Booking walk-in juga dimasukkan ke sini agar tidak dobel.

Website hanya menerima tanggal, ruangan & jam. **Nama dan nomor WA customer tidak pernah dikirim ke website.**

Ruangan bisa disembunyikan sementara (mis. maintenance) dengan menghapus centang kolom **Aktif** di tab Ruangan. Harga & list game juga cukup diubah di tab tersebut.

## Hosting

Upload seluruh folder ini ke Netlify / Vercel / GitHub Pages (static hosting, gratis). Domain custom bisa dipasang menyusul.
