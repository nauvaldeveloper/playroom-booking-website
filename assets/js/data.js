/**
 * DATA CONTOH — dipakai kalau LOG_CONFIG.API_URL kosong.
 * Bentuknya sama persis dengan output Apps Script (apps-script/Code.gs),
 * jadi saat API asli dipasang, tidak ada kode lain yang perlu diubah.
 *
 * Semua nama ruangan, harga & list game di sini fiktif (untuk demo).
 * Field opsional `image`: URL foto ruangan. Jika kosong, kartu memakai cover grafis.
 */
(function () {
  const PS_A = ['EA Sports FC 26', 'Tekken 8', 'Mortal Kombat 1', 'It Takes Two', 'GTA V'];
  const PS_B = ['EA Sports FC 26', 'NBA 2K26', 'Gran Turismo 7', 'Split Fiction', 'Overcooked! All You Can Eat'];
  const PS_C = ['EA Sports FC 26', 'Street Fighter 6', 'Crash Team Rumble', 'Spider-Man 2', 'Fall Guys'];
  const PS_D = ['EA Sports FC 26', 'WWE 2K25', 'Tekken 8', 'Minecraft', 'Sackboy: A Big Adventure'];
  const NS_A = ['Mario Kart 8 Deluxe', 'Super Smash Bros. Ultimate', 'Mario Party Jamboree', 'Overcooked! 2'];
  const NS_B = ['Mario Kart 8 Deluxe', 'Nintendo Switch Sports', 'Just Dance 2025', 'Pico Park'];
  const NS_C = ['Mario Kart 8 Deluxe', 'Super Mario Bros. Wonder', 'Kirby Star Allies', 'Snipperclips'];

  const VIP_PS_FEAT = ['Ruangan private', 'PS5', 'Netflix', 'AC'];
  const REG_PS_FEAT = ['Open space bersekat', 'PS5'];
  const VIP_NS_FEAT = ['Ruangan private', 'Nintendo Switch', 'Netflix', 'AC'];

  const vipPs = (n, games) => ({ name: `VIP ${n}`, type: 'VIP PS', floor: '1', price: 35000, price3: 95000, capacity: 6, games, features: VIP_PS_FEAT, description: 'Ruangan private PS5 lengkap dengan Netflix.' });
  const reg = (n, games) => ({ name: `Reguler ${n}`, type: 'Reguler PS', floor: '1', price: 20000, price3: 55000, capacity: 4, games, features: REG_PS_FEAT, description: 'Spot PS5 open space dengan sekat, pas buat main santai.' });
  const vipNs = (name, floor, games) => ({ name, type: 'VIP Switch', floor, price: 35000, price3: 95000, capacity: 6, games, features: VIP_NS_FEAT, description: `Ruangan private Nintendo Switch di lantai ${floor}.` });

  const rooms = [
    vipPs(1, PS_A), vipPs(2, PS_B), vipPs(3, PS_C), vipPs(4, PS_D),
    reg(1, PS_A), reg(2, PS_B), reg(3, PS_C), reg(4, PS_D),
    { name: 'VIP Arcade', type: 'VIP Switch', floor: '2', price: 50000, price3: 135000, capacity: 8, games: [...NS_A, ...PS_A.slice(0, 3)], features: ['Ruangan private', 'PS5 + Nintendo Switch', 'Netflix', 'Ruangan paling luas'], description: 'Ruangan VIP terbesar: PS5 dan Nintendo Switch sekaligus. Cocok buat rombongan.' },
    vipNs('VIP Neon', '2', NS_A),
    vipNs('VIP Pixel', '2', NS_B),
    vipNs('VIP Retro', '1', NS_C),
    vipNs('VIP Turbo', '1', NS_B),
  ];

  // Booking contoh dibuat relatif ke hari ini supaya demo selalu ada isinya.
  function iso(offset) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
  const b = (day, room, start, end) => ({ date: iso(day), room, start, end });

  const bookings = [
    b(0, 'VIP Retro', '15:00', '18:00'),
    b(0, 'VIP Arcade', '14:00', '17:00'),
    b(0, 'VIP 1', '10:00', '13:00'),
    b(0, 'VIP 3', '18:00', '21:00'),
    b(0, 'Reguler 2', '12:00', '14:00'),
    b(0, 'VIP Pixel', '19:00', '21:00'),
    b(1, 'VIP Neon', '13:00', '16:00'),
    b(1, 'VIP 2', '16:00', '19:00'),
    b(1, 'Reguler 1', '09:00', '12:00'),
    b(2, 'VIP Arcade', '18:00', '21:00'),
    b(2, 'VIP Turbo', '11:00', '14:00'),
    b(3, 'VIP 4', '15:00', '18:00'),
    b(5, 'VIP Arcade', '10:00', '16:00'),
    b(5, 'VIP Retro', '13:00', '16:00'),
  ];

  window.LOG_DUMMY = { updatedAt: new Date().toISOString(), rooms, bookings };
})();
