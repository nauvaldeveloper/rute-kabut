/* =========================================================
   RUTE KABUT — jadwal, paket, pendaftaran via WhatsApp
   ========================================================= */
(function () {
  'use strict';
  const T = window.TRIP;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rp = (n) => 'Rp' + Math.round(n).toLocaleString('id-ID');
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const pkgById = (id) => T.PACKAGES.find((p) => p.id === id);
  const longDate = (d) => d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const shortDay = (d) => d.toLocaleDateString('id-ID', { weekday: 'short' });
  const monthName = (d) => d.toLocaleDateString('id-ID', { month: 'long' });

  /* ---------------- departures (contoh, dibuat relatif ke hari ini) ---------------- */
  function seeded(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return ((h >>> 0) % 1000) / 1000; }
  function buildDepartures() {
    const out = [], today = new Date(); today.setHours(0, 0, 0, 0);
    for (let i = 2; i < 30; i++) {
      const d = new Date(today); d.setDate(d.getDate() + i);
      for (const p of T.PACKAGES) {
        if (!p.days.includes(d.getDay())) continue;
        const r = seeded(p.id + iso(d));
        // makin dekat tanggalnya, makin banyak kursi terisi
        const fill = Math.min(1, r * 0.7 + (1 - i / 30) * 0.5);
        const left = Math.max(0, p.capacity - Math.round(fill * (p.capacity + 1)));
        out.push({ key: p.id + '|' + iso(d), pkg: p.id, date: d, left });
      }
    }
    return out.sort((a, b) => a.date - b.date);
  }
  const DEPS = buildDepartures();
  const depsOf = (id) => DEPS.filter((d) => d.pkg === id);
  const seatsText = (left) => left === 0 ? 'Penuh' : left <= 3 ? `Sisa ${left} kursi` : `${left} kursi`;

  /* ---------------- shared bits ---------------- */
  function levelHTML(l) { return `<span class="lvl"><i>${[1, 2, 3].map((n) => `<span class="${n <= l ? 'on' : ''}"></span>`).join('')}</i>${T.LEVELS[l]}</span>`; }
  function dateTile(d) { return `<div class="date-tile"><b>${d.getDate()}</b><small>${shortDay(d)} · ${d.toLocaleDateString('id-ID', { month: 'short' })}</small></div>`; }

  function profileSVG(points, h, opts = {}) {
    const W = 300, min = 500, max = 2800, n = points.length;
    const x = (i) => (i / (n - 1)) * W;
    const y = (v) => h - 6 - ((v - min) / (max - min)) * (h - 14);
    const line = points.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
    const peakI = points.indexOf(Math.max(...points));
    const grid = opts.grid ? [1000, 1500, 2000, 2500].map((v) => `<path d="M0 ${y(v)}H${W}" stroke="rgba(255,255,255,.1)" stroke-width="1" vector-effect="non-scaling-stroke"/>`).join('') : '';
    const px = x(peakI), py = y(points[peakI]);
    return `<svg viewBox="0 0 ${W} ${h}" preserveAspectRatio="none" aria-hidden="true">
      ${grid}
      <path d="${line} L${W} ${h} L0 ${h}Z" fill="rgba(238,241,239,.12)"/>
      <path d="${line}" fill="none" stroke="#e2703a" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>
      <path d="M${px} ${py}V${h}" stroke="#fff" stroke-width="1" stroke-dasharray="3 3" vector-effect="non-scaling-stroke"/>
    </svg>`;
  }

  /* ---------------- next strip ---------------- */
  function renderNext() {
    const list = DEPS.filter((d) => d.left > 0).slice(0, 3);
    $('#nextList').innerHTML = list.map((d) => {
      const p = pkgById(d.pkg);
      return `<button class="next__item" type="button" data-open="${p.id}" data-date="${iso(d.date)}">
        ${dateTile(d.date)}<div><strong>${esc(p.short)}</strong><span class="${d.left <= 3 ? 'seats-low' : ''}">${seatsText(d.left)}</span> <span>· ${rp(p.price)}</span></div></button>`;
    }).join('');
  }

  /* ---------------- schedule ---------------- */
  const sched = { month: 'all', type: '', all: false };
  const ROW_LIMIT = 10;
  function renderMonths() {
    const months = [...new Set(DEPS.map((d) => `${d.date.getFullYear()}-${d.date.getMonth()}`))].slice(0, 2);
    const btn = (id, label) => `<button type="button" role="tab" data-m="${id}" aria-selected="${sched.month === id}">${label}</button>`;
    $('#monthSeg').innerHTML = btn('all', 'Semua') + months.map((m) => { const [y, mo] = m.split('-').map(Number); return btn(m, monthName(new Date(y, mo, 1))); }).join('');
  }
  function renderRows() {
    const all = DEPS.filter((d) => (sched.month === 'all' || `${d.date.getFullYear()}-${d.date.getMonth()}` === sched.month) && (!sched.type || pkgById(d.pkg).type === sched.type));
    const list = sched.all ? all : all.slice(0, ROW_LIMIT);
    const more = $('#moreRows');
    more.hidden = all.length <= ROW_LIMIT;
    more.textContent = sched.all ? 'Tampilkan lebih sedikit' : `Lihat semua jadwal (${all.length})`;
    $('#rows').innerHTML = list.length ? list.map((d) => {
      const p = pkgById(d.pkg), full = d.left === 0;
      return `<li class="row ${full ? 'row--full' : ''}">
        ${dateTile(d.date)}
        <div class="row__name"><strong>${esc(p.name)}</strong><span>${esc(p.type)} · berangkat ${esc(p.start)} · ${esc(p.duration)}</span>
          <div class="row__meta-m">${rp(p.price)} · <span class="${!full && d.left <= 3 ? 'seats-low' : ''}">${seatsText(d.left)}</span></div></div>
        <div class="row__lvl">${levelHTML(p.level)}</div>
        <div class="row__price">${rp(p.price)}</div>
        <div class="row__seats ${!full && d.left <= 3 ? 'seats-low' : ''}">${seatsText(d.left)}</div>
        <button class="btn ${full ? 'btn--line' : 'btn--sun'} btn--sm" type="button" data-open="${p.id}" data-date="${iso(d.date)}" ${full ? 'disabled' : ''}>${full ? 'Penuh' : 'Daftar'}</button>
      </li>`;
    }).join('') : '<li class="empty">Belum ada jadwal untuk pilihan ini.</li>';
  }

  /* ---------------- package cards ---------------- */
  function renderCards() {
    $('#cards').innerHTML = T.PACKAGES.map((p) => {
      const next = depsOf(p.id).find((d) => d.left > 0);
      return `<button class="card" type="button" data-open="${p.id}">
        <div class="card__profile"><span class="card__type">${esc(p.type)}</span><span class="card__peak">${p.peak.toLocaleString('id-ID')} mdpl</span>${profileSVG(p.profile, 96)}</div>
        <div class="card__body">
          <h3>${esc(p.short)}</h3>
          <p class="card__sum">${esc(p.summary)}</p>
          <div class="facts"><span>${esc(p.duration)}</span><span>${esc(p.distance)}</span></div>
          ${levelHTML(p.level)}
          <div class="card__foot"><div><b>${rp(p.price)}</b> <small>/ orang</small></div><small>${next ? 'Terdekat ' + next.date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : 'Jadwal menyusul'}</small></div>
        </div></button>`;
    }).join('');
  }

  /* ---------------- detail + booking ---------------- */
  let bk = null;
  function openPkg(id, dateIso) {
    const p = pkgById(id);
    const deps = depsOf(id).slice(0, 8);
    const pick = deps.find((d) => iso(d.date) === dateIso && d.left > 0) || deps.find((d) => d.left > 0);
    bk = { id, key: pick ? pick.key : null, pax: 1, pickup: T.PICKUPS[0].id, name: bk?.name || '', phone: bk?.phone || '', sent: '' };
    renderPkg(); $('#pkgLayer').hidden = false; document.body.style.overflow = 'hidden'; $('#pkgLayer .x').focus();
  }
  function closePkg() { $('#pkgLayer').hidden = true; document.body.style.overflow = ''; }

  function renderPkg() {
    const p = pkgById(bk.id), deps = depsOf(p.id).slice(0, 8), dep = DEPS.find((d) => d.key === bk.key);
    const total = p.price * bk.pax, dp = Math.round(total * T.DP_PERCENT / 100);
    const payoff = dep ? new Date(dep.date.getFullYear(), dep.date.getMonth(), dep.date.getDate() - T.PAYOFF_DAYS) : null;
    const maxPax = dep ? dep.left : 1;
    $('#pkgBody').innerHTML = `
      <div class="pk">
        <div class="pk__top">
          <p class="eyebrow">${esc(p.type)} · ${T.LEVELS[p.level]}</p>
          <h2 id="pkgTitle">${esc(p.name)}</h2>
          <p>${esc(p.summary)}</p>
          <dl class="pk__stats">
            <div><dt>Titik tertinggi</dt><dd>${p.peak.toLocaleString('id-ID')} mdpl</dd></div>
            <div><dt>Jarak</dt><dd>${esc(p.distance)}</dd></div>
            <div><dt>Durasi</dt><dd>${esc(p.duration)}</dd></div>
            <div><dt>Kuota</dt><dd>${p.capacity} orang / trip</dd></div>
          </dl>
          <div class="pk__profile">${profileSVG(p.profile, 120, { grid: true })}</div>
        </div>
        <div class="pk__grid">
          <div>
            <h3>Itinerary</h3>
            <ol class="timeline">${p.itinerary.map(([t, a]) => `<li><time>${esc(t)}</time><span>${esc(a)}</span></li>`).join('')}</ol>
            <div class="lists">
              <div><h4>Termasuk</h4><ul>${p.include.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
              <div><h4>Tidak termasuk</h4><ul>${p.exclude.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
              <div><h4>Bawa</h4><ul>${p.bring.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
            </div>
          </div>
          <form class="bk" id="bkForm" novalidate>
            <h3>Daftar trip</h3>
            ${bk.sent ? `
              <p class="label-sm">Mode demo · pesan yang akan diterima admin:</p>
              <div class="wa-preview"><div>${esc(bk.sent)}</div></div>
              <button class="btn btn--line btn--block" type="button" id="bkBack">Ubah data</button>
            ` : `
            <div><span class="label-sm">Tanggal berangkat</span>
              <div class="dates">${deps.map((d) => `<button type="button" class="dchip" data-key="${d.key}" aria-pressed="${d.key === bk.key}" ${d.left === 0 ? 'disabled' : ''}><b>${d.date.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}</b><small>${seatsText(d.left)}</small></button>`).join('')}</div></div>
            <div class="pax"><span class="label-sm">Peserta</span>
              <div class="stepper"><button type="button" data-pax="-1" ${bk.pax <= 1 ? 'disabled' : ''} aria-label="Kurangi peserta">−</button><span>${bk.pax}</span><button type="button" data-pax="1" ${bk.pax >= maxPax ? 'disabled' : ''} aria-label="Tambah peserta">+</button></div>
              <small>maks ${maxPax} sesuai sisa kursi</small></div>
            <label>Titik jemput<select id="bk-pickup">${T.PICKUPS.map((x) => `<option value="${x.id}" ${x.id === bk.pickup ? 'selected' : ''}>${esc(x.label)}</option>`).join('')}</select></label>
            <div class="two">
              <label>Nama<input id="bk-name" autocomplete="name" value="${esc(bk.name)}" /></label>
              <label>No. WhatsApp<input id="bk-phone" inputmode="tel" autocomplete="tel" placeholder="08xx" value="${esc(bk.phone)}" /></label>
            </div>
            <div class="bill">
              <div><span>${bk.pax} × ${rp(p.price)}</span><span>${rp(total)}</span></div>
              <div class="big"><span>DP ${T.DP_PERCENT}%</span><span>${rp(dp)}</span></div>
              ${payoff ? `<div><span>Pelunasan ${rp(total - dp)}</span><span>maks. ${payoff.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span></div>` : ''}
            </div>
            <p class="err" id="bkErr" hidden></p>
            <button class="btn btn--sun btn--block" type="submit" ${dep ? '' : 'disabled'}>${dep ? 'Daftar via WhatsApp' : 'Semua jadwal penuh'}</button>`}
          </form>
        </div>
      </div>`;
  }

  function bookingMessage() {
    const p = pkgById(bk.id), dep = DEPS.find((d) => d.key === bk.key), total = p.price * bk.pax, dp = Math.round(total * T.DP_PERCENT / 100);
    const pickup = T.PICKUPS.find((x) => x.id === bk.pickup);
    return [
      `Halo ${T.name}, saya mau daftar open trip 🏔️`, '',
      `Paket: ${p.name}`,
      `Tanggal: ${longDate(dep.date)} (berangkat ${p.start})`,
      `Peserta: ${bk.pax} orang`,
      `Titik jemput: ${pickup.label}`, '',
      `Total: ${rp(total)}`,
      `DP ${T.DP_PERCENT}%: ${rp(dp)}`, '',
      `Nama: ${bk.name}`,
      `No. WA: ${bk.phone}`, '',
      'Mohon info nomor rekening untuk DP ya, terima kasih!',
    ].join('\n');
  }

  /* ---------------- private trip ---------------- */
  function initPrivate() {
    $('#pv-route').innerHTML = '<option value="">Belum tahu, minta saran</option>' + T.PACKAGES.map((p) => `<option>${esc(p.short)}</option>`).join('');
    const d = new Date(); d.setDate(d.getDate() + 21); $('#pv-date').value = iso(d); $('#pv-date').min = iso(new Date());
    $('#privForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = $('#pv-name').value.trim(), pax = Number($('#pv-pax').value), err = $('#pvErr');
      if (!name) { err.textContent = 'Isi nama dulu.'; err.hidden = false; return; }
      if (!(pax >= 10)) { err.textContent = 'Trip privat minimal 10 orang.'; err.hidden = false; return; }
      err.hidden = true;
      const msg = [`Halo ${T.name}, saya mau tanya trip privat.`, '', `Nama: ${name}`, `Rute: ${$('#pv-route').value || 'minta saran'}`,
        `Tanggal: ${$('#pv-date').value ? longDate(new Date($('#pv-date').value + 'T00:00')) : 'fleksibel'}`, `Jumlah: ${pax} orang`,
        ...($('#pv-note').value.trim() ? [`Catatan: ${$('#pv-note').value.trim()}`] : [])].join('\n');
      if (T.DEMO || !T.WA_NUMBER) {
        $('#pkgBody').innerHTML = `<div class="pk"><div class="pk__grid" style="grid-template-columns:1fr"><div class="bk"><h3 id="pkgTitle">Permintaan trip privat</h3><p class="label-sm">Mode demo · pesan yang akan diterima admin:</p><div class="wa-preview"><div>${esc(msg)}</div></div><button class="btn btn--line" type="button" data-close>Tutup</button></div></div></div>`;
        $('#pkgLayer').hidden = false; document.body.style.overflow = 'hidden'; return;
      }
      window.open(`https://wa.me/${T.WA_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
    });
  }

  /* ---------------- events ---------------- */
  function bind() {
    document.addEventListener('click', (e) => {
      const o = e.target.closest('[data-open]');
      if (o && !o.disabled) { openPkg(o.dataset.open, o.dataset.date); return; }
      if (e.target.closest('[data-close]')) closePkg();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#pkgLayer').hidden) closePkg(); });
    $('#monthSeg').addEventListener('click', (e) => { const b = e.target.closest('[data-m]'); if (!b) return; sched.month = b.dataset.m; renderMonths(); renderRows(); });
    $('#typeSel').addEventListener('change', (e) => { sched.type = e.target.value; renderRows(); });
    $('#moreRows').addEventListener('click', () => {
      sched.all = !sched.all; renderRows();
      if (!sched.all) document.getElementById('jadwal').scrollIntoView({ behavior: 'smooth' });
    });

    $('#pkgBody').addEventListener('click', (e) => {
      const k = e.target.closest('[data-key]'), x = e.target.closest('[data-pax]');
      if (k) { keep(); bk.key = k.dataset.key; const dep = DEPS.find((d) => d.key === bk.key); bk.pax = Math.min(bk.pax, dep.left); renderPkg(); }
      else if (x) { keep(); bk.pax += Number(x.dataset.pax); renderPkg(); }
      else if (e.target.closest('#bkBack')) { bk.sent = ''; renderPkg(); }
    });
    $('#pkgBody').addEventListener('submit', (e) => {
      if (e.target.id !== 'bkForm') return;
      e.preventDefault(); keep();
      const err = $('#bkErr');
      if (!bk.name) { err.textContent = 'Isi nama peserta utama.'; err.hidden = false; return; }
      if (!/^(\+?62|0)8\d{7,12}$/.test(bk.phone.replace(/[\s-]/g, ''))) { err.textContent = 'Nomor WhatsApp belum valid, contoh 0812xxxxxxx.'; err.hidden = false; return; }
      const msg = bookingMessage();
      if (T.DEMO || !T.WA_NUMBER) { bk.sent = msg; renderPkg(); return; }
      window.open(`https://wa.me/${T.WA_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
    });
  }
  function keep() {
    if ($('#bk-name')) { bk.name = $('#bk-name').value.trim(); bk.phone = $('#bk-phone').value.trim(); bk.pickup = $('#bk-pickup').value; }
  }

  function renderFaq() { $('#faqList').innerHTML = T.FAQ.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join(''); }

  if (T.DEMO) { $('#demoBar').hidden = false; $('#demoLink').href = T.DEV_CONTACT_URL; }
  renderNext(); renderMonths(); renderRows(); renderCards(); renderFaq(); initPrivate(); bind();
})();
