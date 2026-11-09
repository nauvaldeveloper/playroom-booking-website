/* =========================================================
   PLAYROOM BOOKING — app logic (vanilla JS, no build step)
   ========================================================= */
(function () {
  'use strict';

  const CFG = window.LOG_CONFIG;
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  const rupiah = (n) => 'Rp' + Number(n).toLocaleString('id-ID');
  const hourLabel = (h) => `${pad(h)}.00`;
  const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseISO = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const longDate = (s) => parseISO(s).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const parseHour = (t) => parseInt(String(t).split(/[:.]/)[0], 10);
  const HOURS = Array.from({ length: CFG.CLOSE_HOUR - CFG.OPEN_HOUR }, (_, i) => CFG.OPEN_HOUR + i);

  const state = {
    rooms: [],
    occupied: new Map(),        // "YYYY-MM-DD|Room name" -> Set(hours)
    updatedAt: null,
    roomFilter: 'Semua',
    scheduleFilter: 'Semua',
    search: '',
    date: isoDate(new Date()),
    sel: null,                  // { room, start, duration }
  };

  /* ---------------- Data ---------------- */
  function normalizeRoom(r) {
    const list = (v) => Array.isArray(v) ? v : String(v || '').split(',').map((s) => s.trim()).filter(Boolean);
    return {
      name: String(r.name).trim(),
      type: String(r.type || 'Lainnya').trim(),
      floor: r.floor ? String(r.floor) : '',
      price: Number(r.price) || 0,
      price3: Number(r.price3) || 0,
      capacity: Number(r.capacity) || 0,
      games: list(r.games),
      features: list(r.features),
      reel: r.reel || '',
      image: r.image || '',
      description: r.description || '',
    };
  }

  function ingest(payload) {
    state.rooms = (payload.rooms || []).filter((r) => r.active !== false).map(normalizeRoom);
    state.updatedAt = payload.updatedAt ? new Date(payload.updatedAt) : new Date();
    state.occupied = new Map();
    for (const b of payload.bookings || []) {
      const key = `${b.date}|${String(b.room).trim()}`;
      if (!state.occupied.has(key)) state.occupied.set(key, new Set());
      const set = state.occupied.get(key);
      const s = parseHour(b.start), e = parseHour(b.end);
      for (let h = s; h < e; h++) set.add(h);
    }
  }

  async function load() {
    setSync('Memuat jadwal…');
    try {
      if (CFG.API_URL) {
        const res = await fetch(CFG.API_URL, { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        ingest(await res.json());
      } else {
        ingest(window.LOG_DUMMY);
      }
      validateSelection();
      renderAll();
      const t = state.updatedAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      setSync(`${CFG.API_URL ? '' : 'Data contoh · '}Diperbarui ${t} · <button type="button" id="refreshBtn">Muat ulang</button>`);
    } catch (err) {
      console.error(err);
      setSync(`Gagal memuat jadwal. <button type="button" id="refreshBtn">Coba lagi</button> atau chat admin via WhatsApp.`);
      $('#schedule').innerHTML = '<p class="empty">Jadwal belum bisa dimuat.</p>';
    }
  }

  function setSync(html) {
    $('#syncInfo').innerHTML = html;
    const btn = $('#refreshBtn');
    if (btn) btn.addEventListener('click', load);
  }

  /* ---------------- Helpers ---------------- */
  const types = () => ['Semua', ...new Set(state.rooms.map((r) => r.type))];
  const roomByName = (name) => state.rooms.find((r) => r.name === name);
  const kindOf = (r) => (/ps/i.test(r.type) && !/nintendo|switch/i.test(r.type) ? 'ps' : 'ns');

  const isBooked = (date, room, h) => state.occupied.get(`${date}|${room}`)?.has(h) || false;
  const isPast = (date, h) => {
    const now = new Date();
    if (date !== isoDate(now)) return parseISO(date) < parseISO(isoDate(now));
    return h <= now.getHours();
  };
  const isFree = (date, room, h) => !isBooked(date, room, h) && !isPast(date, h);

  // Paket 3 jam diulang, sisa jam dihitung per jam.
  function priceFor(room, dur) {
    const normal = room.price * dur;
    if (!room.price3) return { total: normal, normal };
    const total = Math.floor(dur / 3) * room.price3 + (dur % 3) * room.price;
    return { total: Math.min(total, normal), normal };
  }

  function maxDuration(room, start) {
    let d = 0;
    for (let h = start; h < CFG.CLOSE_HOUR && isFree(state.date, room, h); h++) d++;
    return d;
  }

  function reelEmbed(url) {
    const m = String(url).match(/instagram\.com\/(reel|p)\/([^/?#]+)/);
    return m ? `https://www.instagram.com/${m[1]}/${m[2]}/embed` : '';
  }

  function tabsHTML(active) {
    return types().map((t) => `<button class="tab" role="tab" data-type="${esc(t)}" aria-selected="${t === active}">${esc(t)}</button>`).join('');
  }

  /* ---------------- Render: rooms ---------------- */
  function renderRooms() {
    $('#roomTabs').innerHTML = tabsHTML(state.roomFilter);
    const q = state.search.toLowerCase();
    const list = state.rooms.filter((r) =>
      (state.roomFilter === 'Semua' || r.type === state.roomFilter) &&
      (!q || r.name.toLowerCase().includes(q) || r.games.some((g) => g.toLowerCase().includes(q)))
    );

    if (!list.length) {
      $('#roomGrid').innerHTML = `<p class="empty">Belum ada ruangan dengan game "<b>${esc(state.search)}</b>". Coba kata kunci lain ya.</p>`;
      return;
    }

    $('#roomGrid').innerHTML = list.map((r) => {
      const games = r.games.map((g) => (q && g.toLowerCase().includes(q) ? `<mark>${esc(g)}</mark>` : esc(g)));
      return `
      <article class="room">
        <div class="room__top">
          <div>
            <p class="room__type" data-kind="${kindOf(r)}">${esc(r.type)}</p>
            <h3 class="room__name">${esc(r.name)}</h3>
          </div>
          <div class="room__price"><b>${rupiah(r.price)}</b><span>/ jam</span></div>
        </div>
        <div class="room__meta">
          <span class="chip">Maks ${r.capacity} orang</span>
          ${r.floor ? `<span class="chip">Lantai ${esc(r.floor)}</span>` : ''}
          ${r.features.slice(0, 3).map((f) => `<span class="chip">${esc(f)}</span>`).join('')}
        </div>
        <p class="room__games"><b>Game:</b> ${games.slice(0, 5).join(', ')}${r.games.length > 5 ? `, +${r.games.length - 5} lainnya` : ''}</p>
        <div class="room__actions">
          <button class="btn btn--ghost" data-detail="${esc(r.name)}">Detail</button>
          <button class="btn btn--pink" data-book="${esc(r.name)}">Cek Jadwal</button>
        </div>
      </article>`;
    }).join('');
  }

  /* ---------------- Render: prices ---------------- */
  function renderPrices() {
    const groups = new Map();
    for (const r of state.rooms) {
      const key = `${r.type}|${r.price}|${r.price3}|${r.capacity}`;
      if (!groups.has(key)) groups.set(key, { ...r, names: [] });
      groups.get(key).names.push(r.name);
    }
    const maxPrice = Math.max(...state.rooms.map((r) => r.price));
    $('#priceGrid').innerHTML = [...groups.values()].map((g) => {
      const save = g.price * 3 - g.price3;
      return `
      <div class="price ${g.price === maxPrice ? 'price--hot' : ''}">
        <p class="room__type" data-kind="${kindOf(g)}">${esc(g.type)}</p>
        <h3>${esc(g.names.length > 1 ? g.names.join(', ') : g.names[0])}</h3>
        <p class="price__rooms">${esc(g.features.join(' · '))}</p>
        <div class="price__row"><span>1 jam</span><b>${rupiah(g.price)}</b></div>
        ${g.price3 ? `<div class="price__row"><span>Paket 3 jam</span><b>${rupiah(g.price3)}</b></div>
        ${save > 0 ? `<p class="price__save">Hemat ${rupiah(save)}</p>` : ''}` : ''}
        <p class="price__cap">Maks ${g.capacity} orang</p>
      </div>`;
    }).join('');
  }

  /* ---------------- Render: schedule ---------------- */
  function renderDates() {
    const today = new Date();
    const days = Array.from({ length: CFG.DAYS_AHEAD }, (_, i) => { const d = new Date(today); d.setDate(d.getDate() + i); return d; });
    $('#dateStrip').innerHTML = days.map((d, i) => {
      const iso = isoDate(d);
      const top = i === 0 ? 'Hari ini' : i === 1 ? 'Besok' : d.toLocaleDateString('id-ID', { weekday: 'short' });
      return `<button class="date" role="tab" data-date="${iso}" aria-selected="${iso === state.date}">
        <small>${top}</small><b>${d.getDate()}</b><small>${d.toLocaleDateString('id-ID', { month: 'short' })}</small></button>`;
    }).join('');
  }

  function renderSchedule() {
    $('#scheduleTabs').innerHTML = tabsHTML(state.scheduleFilter);
    const list = state.rooms.filter((r) => state.scheduleFilter === 'Semua' || r.type === state.scheduleFilter);
    const sel = state.sel;

    $('#schedule').innerHTML = list.map((r) => {
      const free = HOURS.filter((h) => isFree(state.date, r.name, h)).length;
      const slots = HOURS.map((h) => {
        const booked = isBooked(state.date, r.name, h);
        const past = isPast(state.date, h);
        const chosen = sel && sel.room === r.name && h >= sel.start && h < sel.start + sel.duration;
        const cls = chosen ? 'is-sel' : booked ? 'is-booked' : past ? 'is-past' : '';
        const label = `${r.name} ${hourLabel(h)} ${booked ? 'sudah dibooking' : past ? 'sudah lewat' : 'kosong'}`;
        return `<button class="slot ${cls}" data-room="${esc(r.name)}" data-hour="${h}" ${booked || past ? 'disabled' : ''} aria-label="${esc(label)}" aria-pressed="${!!chosen}">${pad(h)}</button>`;
      }).join('');
      return `
      <div class="srow ${sel && sel.room === r.name ? 'is-active' : ''}" id="row-${esc(r.name).replace(/\s+/g, '-')}">
        <div class="srow__head">
          <span class="srow__name">${esc(r.name)}</span>
          <span class="srow__info">${esc(r.type)}${r.floor ? ` · Lt ${esc(r.floor)}` : ''} · ${free ? `${free} jam kosong` : 'Penuh'}</span>
        </div>
        <div class="slots">${slots}</div>
      </div>`;
    }).join('') || '<p class="empty">Tidak ada ruangan.</p>';
  }

  /* ---------------- Booking sheet ---------------- */
  function renderSheet() {
    const sheet = $('#sheet');
    const sel = state.sel;
    if (!sel) {
      sheet.classList.remove('open');
      sheet.setAttribute('aria-hidden', 'true');
      document.body.style.setProperty('--sheet-h', '0px');
      return;
    }
    const room = roomByName(sel.room);
    const max = maxDuration(sel.room, sel.start);
    const { total, normal } = priceFor(room, sel.duration);

    $('#sheetTitle').textContent = `${room.name}${room.floor ? ` · Lantai ${room.floor}` : ''}`;
    $('#sheetWhen').textContent = `${longDate(state.date)} · ${hourLabel(sel.start)}–${hourLabel(sel.start + sel.duration)}`;
    $('#durValue').textContent = sel.duration;
    $('#durMinus').disabled = sel.duration <= 1;
    $('#durPlus').disabled = sel.duration >= max;
    $('#totalPrice').textContent = rupiah(total);
    $('#totalStrike').textContent = total < normal ? rupiah(normal) : '';
    $('#totalSave').textContent = total < normal ? `Harga paket 3 jam · hemat ${rupiah(normal - total)}` : (sel.duration === 2 && room.price3 ? `Tambah 1 jam jadi paket 3 jam: ${rupiah(room.price3)}` : '');
    $('#sheetHint').textContent = sel.duration >= max && max < CFG.CLOSE_HOUR - sel.start
      ? `Maksimal ${max} jam karena jam ${hourLabel(sel.start + max)} sudah dibooking.`
      : 'Slot belum terkunci sampai admin konfirmasi & pembayaran diterima.';

    sheet.classList.add('open');
    sheet.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => document.body.style.setProperty('--sheet-h', sheet.offsetHeight + 'px'));
  }

  // Setelah data di-refresh, pilihan user bisa saja sudah keburu dibooking orang lain.
  function validateSelection() {
    const sel = state.sel;
    if (!sel) return;
    if (!roomByName(sel.room) || !isFree(state.date, sel.room, sel.start)) {
      state.sel = null;
      toast('Slot yang kamu pilih baru saja dibooking. Pilih jam lain ya.');
      return;
    }
    const max = maxDuration(sel.room, sel.start);
    if (sel.duration > max) {
      sel.duration = max;
      toast(`Durasi disesuaikan jadi ${max} jam karena ada slot yang baru dibooking.`);
    }
  }

  function selectSlot(roomName, hour) {
    const sel = state.sel;
    // Tap jam setelah jam mulai di ruangan yang sama → perpanjang/perpendek sampai jam itu.
    if (sel && sel.room === roomName && hour >= sel.start) {
      const want = hour - sel.start + 1;
      const max = maxDuration(roomName, sel.start);
      if (want === sel.duration && want === 1) { state.sel = null; }
      else if (want <= max) { sel.duration = want; }
      else { toast('Ada jam yang sudah dibooking di antaranya.'); return; }
    } else {
      state.sel = { room: roomName, start: hour, duration: 1 };
    }
    renderSchedule();
    renderSheet();
  }

  function buildWAMessage(name) {
    const sel = state.sel;
    const room = roomByName(sel.room);
    const { total, normal } = priceFor(room, sel.duration);
    const lines = [
      `Halo ${CFG.BRAND_NAME}, saya mau booking 🎮`,
      '',
      `Nama: ${name}`,
      `Ruangan: ${room.name} (${room.type})${room.floor ? ` - Lantai ${room.floor}` : ''}`,
      `Hari/Tanggal: ${longDate(state.date)}`,
      `Durasi main: ${sel.duration} jam (${hourLabel(sel.start)} s/d ${hourLabel(sel.start + sel.duration)})`,
      `Estimasi total: ${rupiah(total)}${total < normal ? ' (harga paket 3 jam)' : ''}`,
      '',
      'Mohon dicek & dikirimkan form pembayarannya ya, terima kasih!',
    ];
    return lines.join('\n');
  }

  function waLink(text) {
    return `https://wa.me/${CFG.WA_NUMBER}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
  }

  /* ---------------- Room modal ---------------- */
  function openModal(roomName) {
    const r = roomByName(roomName);
    if (!r) return;
    const embed = reelEmbed(r.reel);
    $('#modalBody').innerHTML = `
      ${embed ? `<div class="reel"><iframe src="${esc(embed)}" title="Video ruangan ${esc(r.name)}" loading="lazy" allowfullscreen></iframe></div>` : ''}
      <div class="modal__info">
        <div>
          <p class="room__type" data-kind="${kindOf(r)}">${esc(r.type)}${r.floor ? ` · Lantai ${esc(r.floor)}` : ''}</p>
          <h2 id="modalTitle">${esc(r.name)}</h2>
        </div>
        ${r.description ? `<p>${esc(r.description)}</p>` : ''}
        <div class="room__meta">
          <span class="chip">${rupiah(r.price)} / jam</span>
          ${r.price3 ? `<span class="chip">${rupiah(r.price3)} / 3 jam</span>` : ''}
          <span class="chip">Maks ${r.capacity} orang</span>
        </div>
        ${r.features.length ? `<ul>${r.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}
        <div>
          <p class="sheet__label" style="margin-bottom:8px">List game (${r.games.length})</p>
          <div class="game-list">${r.games.map((g) => `<span class="chip">${esc(g)}</span>`).join('')}</div>
        </div>
        ${r.reel ? `<a class="btn btn--ghost btn--sm" href="${esc(r.reel)}" target="_blank" rel="noopener">Buka di Instagram</a>` : ''}
        <button class="btn btn--pink" data-book="${esc(r.name)}" data-close>Cek Jadwal ${esc(r.name)}</button>
      </div>`;
    showModal();
  }

  function showModal() {
    $('#modal').classList.add('open');
    $('#modal').setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    $('.modal__close').focus();
  }

  // Mode demo: tampilkan pratinjau pesan WA + ajakan menghubungi developer.
  function openDemoPreview(text) {
    const time = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    $('#modalBody').innerHTML = `
      <div class="demo-modal">
        <p class="eyebrow">Mode demo</p>
        <h2 id="modalTitle">Pesan ini yang akan diterima admin</h2>
        <div class="wa-preview"><div class="wa-preview__bubble">${esc(text)}<time>${time} ✓✓</time></div></div>
        <p>Di versi aslinya, tombol ini langsung membuka WhatsApp admin dengan pesan di atas.</p>
        <button class="btn btn--pink" data-close>Tutup</button>
      </div>`;
    showModal();
  }

  function closeModal() {
    $('#modal').classList.remove('open');
    $('#modal').setAttribute('aria-hidden', 'true');
    $('#modalBody').innerHTML = '';
    document.body.style.overflow = '';
  }

  function goToSchedule(roomName) {
    const r = roomByName(roomName);
    state.scheduleFilter = r ? r.type : 'Semua';
    renderSchedule();
    document.getElementById('jadwal').scrollIntoView({ behavior: 'smooth' });
    const row = document.getElementById('row-' + roomName.replace(/\s+/g, '-'));
    if (row) {
      row.classList.add('is-active');
      setTimeout(() => { if (!state.sel || state.sel.room !== roomName) row.classList.remove('is-active'); }, 1800);
    }
  }

  /* ---------------- Misc ---------------- */
  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  function renderStatic() {
    const hours = `${hourLabel(CFG.OPEN_HOUR)}–${hourLabel(CFG.CLOSE_HOUR)}`;
    $('#heroHours').textContent = `${pad(CFG.OPEN_HOUR)}–${pad(CFG.CLOSE_HOUR)}`;
    $('#contactHours').textContent = hours;
    $('#contactAddr').textContent = CFG.ADDRESS || '';
    document.querySelectorAll('[data-brand]').forEach((el) => { el.textContent = CFG.BRAND_NAME; });
    document.title = `${CFG.BRAND_NAME} — PS5 & Nintendo Switch Playroom`;

    // Tombol kontak: tampil hanya jika datanya diisi di config.
    const setLink = (id, url, label) => {
      const el = $(id);
      if (!url) { el.hidden = true; return; }
      el.href = url;
      if (label) el.textContent = label;
    };
    setLink('#mapsLink', CFG.MAPS_URL);
    setLink('#waLink', CFG.WA_NUMBER && waLink(`Halo ${CFG.BRAND_NAME}, saya mau tanya-tanya dulu 🙌`));
    setLink('#igLink', CFG.INSTAGRAM_URL, CFG.INSTAGRAM_HANDLE ? 'Instagram ' + CFG.INSTAGRAM_HANDLE : 'Instagram');
    $('#year').textContent = new Date().getFullYear();
    $('#footerContact').textContent = [CFG.WA_DISPLAY && `WA ${CFG.WA_DISPLAY}`, CFG.INSTAGRAM_HANDLE].filter(Boolean).join(' · ');

    if (CFG.DEMO) {
      $('#demoBar').hidden = false;
      $('#demoBarLink').href = CFG.DEV_CONTACT_URL;
    }
  }

  function renderAll() {
    renderRooms();
    renderPrices();
    renderDates();
    renderSchedule();
    renderSheet();
  }

  /* ---------------- Events ---------------- */
  function bind() {
    // Nav
    $('#navToggle').addEventListener('click', () => {
      const open = $('.nav').classList.toggle('open');
      $('#navToggle').setAttribute('aria-expanded', open);
    });
    const closeNav = () => { $('.nav').classList.remove('open'); $('#navToggle').setAttribute('aria-expanded', 'false'); };
    $('#navLinks').addEventListener('click', (e) => { if (e.target.closest('a')) closeNav(); });
    // Tap di luar menu (area gelap) → tutup menu
    document.addEventListener('click', (e) => { if ($('.nav').classList.contains('open') && !e.target.closest('.nav__links, #navToggle')) closeNav(); });

    // Room filters & search
    $('#roomTabs').addEventListener('click', (e) => {
      const t = e.target.closest('[data-type]'); if (!t) return;
      state.roomFilter = t.dataset.type; renderRooms();
    });
    $('#gameSearch').addEventListener('input', (e) => { state.search = e.target.value.trim(); renderRooms(); });

    // Schedule filters
    $('#scheduleTabs').addEventListener('click', (e) => {
      const t = e.target.closest('[data-type]'); if (!t) return;
      state.scheduleFilter = t.dataset.type; renderSchedule();
    });
    $('#dateStrip').addEventListener('click', (e) => {
      const d = e.target.closest('[data-date]'); if (!d) return;
      state.date = d.dataset.date; state.sel = null;
      renderDates(); renderSchedule(); renderSheet();
    });
    $('#schedule').addEventListener('click', (e) => {
      const s = e.target.closest('.slot'); if (!s || s.disabled) return;
      selectSlot(s.dataset.room, Number(s.dataset.hour));
    });

    // Detail / book buttons (anywhere)
    document.addEventListener('click', (e) => {
      const d = e.target.closest('[data-detail]');
      if (d) { openModal(d.dataset.detail); return; }
      const b = e.target.closest('[data-book]');
      if (b) { if (b.hasAttribute('data-close')) closeModal(); goToSchedule(b.dataset.book); return; }
      if (e.target.closest('#modal [data-close]')) closeModal();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('#modal').classList.contains('open')) closeModal(); });

    // Sheet
    $('#sheetClose').addEventListener('click', () => { state.sel = null; renderSchedule(); renderSheet(); });
    $('#durMinus').addEventListener('click', () => { if (state.sel.duration > 1) { state.sel.duration--; renderSchedule(); renderSheet(); } });
    $('#durPlus').addEventListener('click', () => {
      if (state.sel.duration < maxDuration(state.sel.room, state.sel.start)) { state.sel.duration++; renderSchedule(); renderSheet(); }
    });
    $('#custName').addEventListener('input', (e) => e.target.classList.remove('invalid'));
    $('#waBook').addEventListener('click', () => {
      const input = $('#custName');
      const name = input.value.trim();
      if (!name) { input.classList.add('invalid'); input.focus(); toast('Isi nama dulu ya 🙏'); return; }
      try { localStorage.setItem('log_name', name); } catch (_) { /* ignore */ }
      const msg = buildWAMessage(name);
      if (CFG.DEMO || !CFG.WA_NUMBER) { openDemoPreview(msg); return; }
      window.open(waLink(msg), '_blank', 'noopener');
    });
    try { $('#custName').value = localStorage.getItem('log_name') || ''; } catch (_) { /* ignore */ }

    // Auto refresh tiap 2 menit selama tab aktif
    setInterval(() => { if (!document.hidden && CFG.API_URL) load(); }, 120000);
  }

  renderStatic();
  bind();
  load();
})();
