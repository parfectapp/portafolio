/* ============ INVERNA · UI: iconos, formato, componentes ============ */
const UI = (() => {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const initials = n => (n || '?').trim().split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase();

  const ICONS = {
    home:    '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h6v-6h2v6h6V10"/>',
    chart:   '<path d="M4 20V4M4 20h16"/><rect x="7" y="12" width="3" height="5"/><rect x="12" y="8" width="3" height="9"/><rect x="17" y="5" width="3" height="12"/>',
    money:   '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v5M18 9.5v5"/>',
    coin:    '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5c0-1 1-1.7 2.5-1.7s2.5.7 2.5 1.7-1 1.5-2.5 1.5-2.5.5-2.5 1.5 1 1.7 2.5 1.7 2.5-.7 2.5-1.7"/>',
    wallet:  '<path d="M3 7a2 2 0 0 1 2-2h12v4"/><path d="M3 7v10a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2Z"/><circle cx="16.5" cy="13" r="1.3"/>',
    leaf:    '<path d="M11 20c-5 0-8-3-8-8 6 0 9-3 15-3 0 6-3 11-7 11Z"/><path d="M5 19C8 15 12 13 17 12"/>',
    sprout:  '<path d="M12 21v-8M12 13c-4 0-6-2.4-6.4-6 4 .2 6 2 6.4 6Zm0 0c.4-4 2.4-5.8 6.4-6-.4 3.6-2.4 6-6.4 6Z"/>',
    scale:   '<path d="M12 3v18M7 21h10M5 8h14M5 8l-3 6a3 3 0 0 0 6 0L5 8ZM19 8l-3 6a3 3 0 0 0 6 0l-3-6Z"/>',
    cart:    '<circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/><path d="M2 3h2.2l2 12.5a1.6 1.6 0 0 0 1.6 1.3h9.4a1.6 1.6 0 0 0 1.6-1.3L20 7H5.2"/>',
    users:   '<circle cx="9" cy="8" r="3.4"/><path d="M3 20c1-3.6 3.6-5.4 6-5.4s5 1.8 6 5.4"/><path d="M16 5.2A3 3 0 0 1 18 11M17.6 14.8c2 .7 3.4 2.5 3.9 5"/>',
    user:    '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 5-6 8-6s6.5 2 8 6"/>',
    book:    '<path d="M5 4h11a2 2 0 0 1 2 2v14H6a1 1 0 0 1-1-1V4Z"/><path d="M9 4v15M5 19a1 1 0 0 1 1-1h12"/>',
    note:    '<path d="M5 3h10l4 4v14H5Z"/><path d="M15 3v4h4M8 12h8M8 16h6"/>',
    plus:    '<path d="M12 5v14M5 12h14"/>',
    check:   '<path d="M20 6 9 17l-5-5"/>',
    checkc:  '<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.4 2.4 4.6-4.8"/>',
    x:       '<path d="M18 6 6 18M6 6l12 12"/>',
    chevron: '<path d="m9 6 6 6-6 6"/>',
    chevDown:'<path d="m6 9 6 6 6-6"/>',
    chevL:   '<path d="m15 6-6 6 6 6"/>',
    back:    '<path d="M19 12H5M12 19l-7-7 7-7"/>',
    trash:   '<path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13"/>',
    edit:    '<path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="M14 6l4 4"/>',
    cal:     '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/>',
    flask:   '<path d="M9 3h6M10 3v6L5 18a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3"/><path d="M7.5 14h9"/>',
    fuel:    '<rect x="4" y="4" width="10" height="16" rx="2"/><path d="M4 11h10"/><path d="M14 8l3 3v6a2 2 0 0 0 4 0V9l-3-3"/>',
    tool:    '<path d="M14.5 6.5a3.5 3.5 0 0 0-4.7 4.2L4 16.5 7.5 20l5.8-5.8a3.5 3.5 0 0 0 4.2-4.7l-2.3 2.3-2.5-2.5 1.8-2.8Z"/>',
    box:     '<path d="M21 8 12 3 3 8v8l9 5 9-5Z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
    tag:     '<path d="M3 12V4h8l9 9-8 8-9-9Z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    filter:  '<path d="M3 5h18l-7 8v6l-4-2v-4L3 5Z"/>',
    settings:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
    info:    '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    warn:    '<path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v4M12 17h.01"/>',
    phone:   '<path d="M5 4h4l2 5-3 2a12 12 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/>',
    wapp:    '<path d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.6-1.2A9 9 0 1 0 12 3Z"/><path d="M9 8.5c0 4 2.5 6.5 6.5 6.5.6 0 1-.5 1-1l-.2-1.4-2 .6c-1.6-.6-2.4-1.4-3-3l.6-2L10.5 7c-.5 0-1 .4-1 1Z" fill="currentColor" stroke="none"/>',
    share:   '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 11 16 7M8.2 13 16 17"/>',
    download:'<path d="M12 4v11M8 11l4 4 4-4M5 20h14"/>',
    trendUp: '<path d="M3 17l6-6 4 4 7-8"/><path d="M21 11V7h-4"/>',
    list:    '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    clock:   '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    pin:     '<path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z"/><circle cx="12" cy="10" r="2.6"/>',
    shield:  '<path d="M12 3 5 6v5c0 5 3.5 8 7 10 3.5-2 7-5 7-10V6l-7-3Z"/><path d="m9 11.5 2 2 4-4.2"/>',
    droplet: '<path d="M12 3c4 5 6.5 8.5 6.5 12a6.5 6.5 0 0 1-13 0c0-3.5 2.5-7 6.5-12Z"/>',
    camera:  '<path d="M3 8a2 2 0 0 1 2-2h2l1.5-2h7L19 6h0a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><circle cx="12" cy="13" r="3.4"/>',
    key:     '<circle cx="8" cy="8" r="4.5"/><path d="M11.2 11.2 20 20M16 16l2-2M14 18l2-2"/>',
  };
  function icon(name, cls, size) {
    const p = ICONS[name] || ICONS.tag;
    const s = size || 18;
    return `<svg class="ic ${cls || ''}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-3px">${p}</svg>`;
  }
  function logo(size) {
    const s = size || 32;
    return `<svg class="logo" width="${s}" height="${s}" viewBox="0 0 64 64" aria-hidden="true">
      <defs><radialGradient id="ldisc" cx="36%" cy="28%" r="78%"><stop offset="0" stop-color="#5fd06a"/><stop offset="1" stop-color="#138a4b"/></radialGradient></defs>
      <rect width="64" height="64" rx="15" fill="#eef6ec"/>
      <circle cx="32" cy="33.6" r="21" fill="#0a3a1e" opacity=".13"/>
      <circle cx="32" cy="32" r="21" fill="url(#ldisc)"/>
      <ellipse cx="26" cy="24" rx="10" ry="6" fill="#ffffff" opacity=".18"/>
      <path d="M32 43 V32" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
      <path d="M32 36 C25 36 21 31 21 24 C29 24 32 29 32 36 Z" fill="#ffffff"/>
      <path d="M32 32 C39 32 43 27 43 20 C35 20 32 25 32 32 Z" fill="#ffffff"/>
    </svg>`;
  }

  // ---- color utils ----
  function _rgb(hex) { let n = (hex || '#888').replace('#', ''); if (n.length === 3) n = n.split('').map(c => c + c).join(''); return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)]; }
  function hexA(hex, a) { const [r, g, b] = _rgb(hex); return `rgba(${r},${g},${b},${a})`; }
  function lighten(hex, amt) { const [r, g, b] = _rgb(hex); const m = v => Math.round(v + (255 - v) * amt); return `rgb(${m(r)},${m(g)},${m(b)})`; }

  function darken(hex, amt) { const [r, g, b] = _rgb(hex); const m = v => Math.round(v * (1 - amt)); return `rgb(${m(r)},${m(g)},${m(b)})`; }

  // ---- icono 3D (claymorphism: bulto con degradado radial, brillo, sombra interior y relieve) ----
  let _cid = 0;
  function cicon(name, color, size) {
    const s = size || 38; const id = _cid++; const c = color || '#6b7d72';
    const lite = lighten(c, 0.55), dark = darken(c, 0.32);
    const p = ICONS[name] || ICONS.tag;
    return `<span class="cic"><svg width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <clipPath id="cc${id}"><rect width="24" height="24" rx="7.4"/></clipPath>
        <radialGradient id="cg${id}" cx="34%" cy="22%" r="95%"><stop offset="0" stop-color="${lite}"/><stop offset="0.55" stop-color="${c}"/><stop offset="1" stop-color="${dark}"/></radialGradient>
        <filter id="cf${id}" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="0.55" stdDeviation="0.45" flood-color="${dark}" flood-opacity="0.6"/></filter>
      </defs>
      <g clip-path="url(#cc${id})">
        <rect width="24" height="24" fill="url(#cg${id})"/>
        <ellipse cx="12" cy="27" rx="15" ry="7.5" fill="${dark}" opacity="0.5"/>
        <ellipse cx="11.5" cy="2.2" rx="12" ry="5.4" fill="#ffffff" opacity="0.34"/>
        <ellipse cx="7.4" cy="5.6" rx="3.6" ry="2.3" fill="#ffffff" opacity="0.55"/>
      </g>
      <g filter="url(#cf${id})" transform="translate(3.5 3.4) scale(0.71)" fill="none" stroke="#ffffff" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round">${p}</g>
    </svg></span>`;
  }

  // ---- formato ----
  const money = n => '$' + Math.round(n || 0).toLocaleString('es-MX');
  const num = n => Math.round(n || 0).toLocaleString('es-MX');
  const pct = (a, b) => b ? Math.round((a / b) * 100) : 0;

  // peso: kg, o toneladas cuando es grande
  function weight(kg) {
    kg = kg || 0;
    if (kg >= 1000) return (Math.round(kg / 10) / 100).toLocaleString('es-MX', { maximumFractionDigits: 2 }) + ' t';
    return Math.round(kg).toLocaleString('es-MX') + ' kg';
  }
  function ton(kg) { return (Math.round((kg || 0) / 10) / 100).toLocaleString('es-MX', { maximumFractionDigits: 2 }); }

  const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const MESL = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  function date(iso) { if (!iso) return ''; const [y, m, d] = iso.split('-').map(Number); return `${d} ${MES[m - 1]}`; }
  function dateLong(iso) { if (!iso) return ''; const [y, m, d] = iso.split('-').map(Number); return `${d} de ${MESL[m - 1].toLowerCase()}, ${y}`; }
  function monthKey(iso) { return (iso || '').slice(0, 7); }
  function monthLabel(key) { const [y, m] = key.split('-').map(Number); return `${MESL[m - 1]} ${y}`; }
  const todayISO = () => { const d = new Date(); return d.toISOString().slice(0, 10); }; // local-ish, suficiente
  const todayKey = () => todayISO().slice(0, 7);

  // ---- mini barra (desglose) ----
  function bar(value, max, color, label, right) {
    const w = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
    return `<div class="bar-row">
      <div class="bar-top"><span class="bar-lbl">${label}</span><span class="bar-val">${right}</span></div>
      <div class="bar-track"><span style="width:${w}%;background:${color}"></span></div>
    </div>`;
  }

  // ---- badge / chip de calidad/categoría ----
  function dot(color) { return `<span class="dot" style="background:${color}"></span>`; }

  // ---- toast ----
  let toastT;
  function toast(msg) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.innerHTML = msg; el.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2400);
  }

  // ---- sheet / modal ----
  function sheet(html, big) {
    const root = document.getElementById('sheet-root');
    root.innerHTML = `<div class="sheet-bg" data-act="closeBg"><div class="sheet ${big ? 'big' : ''}"><div class="grab"></div>${html}</div></div>`;
    requestAnimationFrame(() => root.querySelector('.sheet-bg')?.classList.add('in'));
  }
  function modal(html) {
    const root = document.getElementById('sheet-root');
    root.innerHTML = `<div class="modal-bg" data-act="closeBg"><div class="modal">${html}</div></div>`;
    requestAnimationFrame(() => root.querySelector('.modal-bg')?.classList.add('in'));
  }
  function closeSheet() { document.getElementById('sheet-root').innerHTML = ''; }

  // ---- fotos: comprime una imagen del usuario a JPEG pequeño (data URL) ----
  function compressImage(file, maxDim, quality) {
    maxDim = maxDim || 1100; quality = quality || 0.5;
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        let w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
        const scale = Math.min(1, maxDim / Math.max(w, h));
        w = Math.max(1, Math.round(w * scale)); h = Math.max(1, Math.round(h * scale));
        const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        try { resolve(cv.toDataURL('image/jpeg', quality)); } catch (e) { reject(e); }
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen')); };
      img.src = url;
    });
  }

  // ---- estado vacío ----
  function empty(ic, title, sub) {
    return `<div class="empty"><div class="empty-ic">${icon(ic, '', 30)}</div><div class="empty-t">${title}</div>${sub ? `<div class="empty-s">${sub}</div>` : ''}</div>`;
  }

  return {
    esc, initials, icon, logo, hexA, lighten, cicon,
    money, num, pct, weight, ton,
    date, dateLong, monthKey, monthLabel, todayISO, todayKey, MESL,
    bar, dot, toast, sheet, modal, closeSheet, empty, compressImage,
  };
})();
