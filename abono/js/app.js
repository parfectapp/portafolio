/* ============ INVERNA · App shell, router y acciones ============ */
const App = (() => {
  let userId = null;
  let userEmail = '';
  let db = Store.empty();

  const state = { period: UI.todayKey(), gastoCat: '', cliSeg: 'clientes', pedFilter: 'todos', bitSeg: 'bitacora', taskFilter: 'todos', invKind: 'insumo', authMode: 'signup', authErr: null, authBusy: false, pendingEmail: '' };
  let route = 'landing';

  let syncT = null;
  function save() {
    if (!userId) return;
    db._savedAt = Date.now();                                 // marca de tiempo para saber cuál copia es la más nueva
    Store.save(userId, db);                                   // caché local (instantáneo, offline)
    if (Cloud.enabled()) { clearTimeout(syncT); syncT = setTimeout(() => Cloud.saveData(userId, db).catch(() => {}), 800); } // respaldo en la nube (con pausa)
  }
  const REC_KEYS = ['expenses', 'harvests', 'orders', 'clients', 'tasks', 'irrigations', 'applications', 'inventory', 'log', 'notes'];
  function countRecords(d) { return d ? REC_KEYS.reduce((s, k) => s + ((d[k] || []).length), 0) : 0; }
  // Busca datos de versiones ANTERIORES (guardados solo en el dispositivo, antes de la nube, o de cuando la app se llamaba AGROFIN/INVERNA) para recuperarlos.
  function findLegacyData() {
    let best = null, bestN = 0;
    try {
      for (const k of Object.keys(localStorage)) {
        if (k === 'inverna_v1' || k.indexOf('inverna_db__') === 0 || k.indexOf('agrofin_cache__') === 0) {
          try { const d = JSON.parse(localStorage.getItem(k)); const n = countRecords(d); if (n > bestN) { bestN = n; best = d; } } catch (e) {}
        }
      }
    } catch (e) {}
    return bestN > 0 ? best : null;
  }
  async function loadUser() {
    let cloud = null;
    if (Cloud.enabled()) { try { cloud = await Cloud.loadData(userId); } catch (e) {} }
    const cache = Store.load(userId);                          // null si no hay nada en este dispositivo
    // Elige la copia MÁS NUEVA (evita que la nube vieja borre cambios hechos sin internet).
    let data;
    if (cloud && cache) data = ((cache._savedAt || 0) > (cloud._savedAt || 0)) ? cache : cloud;
    else data = cloud || cache;
    if (countRecords(data) === 0) { const legacy = findLegacyData(); if (legacy) data = legacy; } // recupera datos de versiones viejas
    db = { ...Store.empty(), ...(data || {}) };
    Store.save(userId, db);
    if (Cloud.enabled()) { Cloud.saveData(userId, db).catch(() => {}); } // respalda en la nube (incluye lo recuperado / lo más nuevo)
  }
  function flushSync() { // sube de inmediato lo pendiente (al cerrar / cambiar de app)
    if (!userId || !Cloud.enabled()) return;
    clearTimeout(syncT);
    Cloud.saveData(userId, db).catch(() => {});
  }
  async function boot() {
    /* portfolio preview: estado demo sin login, vista elegible con ?view= */
    const _pq = new URLSearchParams(location.search);
    if (_pq.get('demo')) {
      userId = 'demo-preview';
      db = Store.empty(); try { Data.seed(db); } catch (e) {}
      route = _pq.get('view') || 'home';
      document.body.classList.remove('landing');
      render();
      return;
    }
    Cloud.init();
    // Llega desde el enlace del correo para poner nueva contraseña
    const recovery = /type=recovery/.test(location.hash || '') || /type=recovery/.test(location.search || '');
    Cloud.onRecovery(u => { if (u) { userId = u.id; userEmail = u.email || ''; } route = 'recovery'; render(); });
    if (recovery) { route = 'recovery'; render(); return; }
    const confirmed = /type=signup/.test(location.hash || '') || /type=signup/.test(location.search || ''); // llega desde el correo de confirmación
    if (Cloud.enabled()) {
      try {
        const u = await Cloud.sessionUser();
        if (u) {
          userId = u.id; userEmail = u.email || ''; await loadUser(); route = 'home';
          if (confirmed) { try { history.replaceState(null, '', location.pathname); } catch (e) {} setTimeout(() => UI.toast('¡Correo confirmado! Bienvenido a ABONO'), 350); }
        }
      } catch (e) {}
    }
    render();
  }
  function go(r) { route = r; window.scrollTo(0, 0); render(); }

  function shiftMonth(key, d) { let [y, m] = key.split('-').map(Number); m += d; while (m < 1) { m += 12; y--; } while (m > 12) { m -= 12; y++; } return y + '-' + String(m).padStart(2, '0'); }

  const MAS_ROUTES = ['mas', 'rentabilidad', 'tareas', 'riego', 'aplicaciones', 'inventario', 'bitacora'];
  function tabbar() {
    const on = r => ((r === 'mas' ? MAS_ROUTES.includes(route) : route === r) ? 'on' : '');
    const t = (r, ic, lb) => `<button class="${on(r)}" data-act="go" data-route="${r}">${UI.icon(ic)}<span>${lb}</span></button>`;
    return `<nav class="tabbar t5">
      ${t('home', 'home', 'Resumen')}
      ${t('gastos', 'money', 'Gastos')}
      ${t('cortes', 'sprout', 'Cortes')}
      ${t('clientes', 'users', 'Clientes')}
      ${t('mas', 'list', 'Más')}
    </nav>`;
  }

  function render() {
    const root = document.getElementById('root');
    const full = (route === 'landing' || route === 'auth' || route === 'recovery' || route === 'checkEmail');
    document.body.classList.toggle('landing', full);
    if (route === 'landing') { root.innerHTML = `<div class="fadein">${Views.landing()}</div>`; return; }
    if (route === 'auth') { root.innerHTML = `<div class="fadein">${Views.auth()}</div>`; return; }
    if (route === 'recovery') { root.innerHTML = `<div class="fadein">${Views.recovery()}</div>`; return; }
    if (route === 'checkEmail') { root.innerHTML = `<div class="fadein">${Views.checkEmail()}</div>`; return; }
    if (!userId) { route = 'landing'; root.innerHTML = `<div class="fadein">${Views.landing()}</div>`; return; }
    const view = Views[route] || Views.home;
    root.innerHTML = `<div class="screen"><div class="fadein">${view()}</div></div>` + tabbar();
  }

  // ---- lectura de campos ----
  const val = id => (document.getElementById(id)?.value || '').trim();
  const numv = id => { const v = parseFloat(document.getElementById(id)?.value); return isNaN(v) ? 0 : v; };
  const sheetPick = g => document.querySelector(`.pick[data-g="${g}"] .chip.on`)?.dataset.v;
  const addProductIfNew = p => { if (p && !db.products.includes(p)) db.products.push(p); };
  const find = (k, id) => db[k].find(x => x.id === id);
  const renderPhotos = () => { const w = document.getElementById('photos-wrap'); if (w) w.innerHTML = Forms.thumbs(); }; // refresca solo las miniaturas (no pierde lo escrito)

  function confirmDel(kind, id, label) {
    UI.modal(`<div class="h3 mb8">¿Eliminar ${label}?</div><p class="muted small mb16">No se puede deshacer.</p>
      <div class="btn-row"><button class="btn btn-ghost" data-act="closeSheet">Cancelar</button>
      <button class="btn btn-danger" data-act="doDelete" data-kind="${kind}" data-id="${id}">Eliminar</button></div>`);
  }

  /* ============ acciones ============ */
  const A = {
    go: el => go(el.dataset.route),
    goAuth: el => { state.authMode = (el && el.dataset.mode) || 'signup'; state.authErr = null; state.authBusy = false; go('auth'); },
    setAuthMode: el => { state.authMode = el.dataset.mode; state.authErr = null; render(); },
    async doAuth() {
      const fail = m => { state.authErr = m; state.authBusy = false; render(); };
      if (!Cloud.enabled()) return fail('Necesitas internet para entrar la primera vez.');
      const signup = state.authMode === 'signup';
      const email = val('au-email').toLowerCase(), pw = val('au-pw');
      if (!/^\S+@\S+\.\S+$/.test(email)) return fail('Escribe un correo válido');
      if (pw.length < 6) return fail('La contraseña necesita 6 caracteres o más');
      state.authErr = null; state.authBusy = true; render();
      try {
        if (signup) {
          await Cloud.signUp(email, pw);
          const u = await Cloud.sessionUser();
          if (!u) { state.pendingEmail = email; state.authErr = null; state.authBusy = false; go('checkEmail'); return; } // verificación de correo activada
          userId = u.id; userEmail = u.email || email; db = Store.empty(); Store.save(userId, db); Cloud.saveData(userId, db).catch(() => {});
          state.authBusy = false; UI.toast('¡Cuenta creada!'); go('home');
        } else {
          await Cloud.signIn(email, pw);
          const u = await Cloud.sessionUser();
          userId = u.id; userEmail = u.email || email; await loadUser();
          state.authBusy = false; go('home');
        }
      } catch (e) {
        const m = (e && e.message) || '';
        if (/already|registered|exists/i.test(m)) return fail('Ese correo ya tiene cuenta. Inicia sesión.');
        if (/Invalid login|credentials/i.test(m)) return fail('Correo o contraseña incorrectos');
        if (/not confirmed/i.test(m)) return fail('Confirma tu correo antes de entrar (revisa tu bandeja).');
        return fail(m || 'No se pudo. Intenta de nuevo.');
      }
    },
    async resetPw() {
      const email = val('au-email').toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(email)) { state.authErr = 'Escribe tu correo arriba y vuelve a tocar aquí.'; return render(); }
      try { await Cloud.resetPassword(email); state.authErr = null; UI.toast('Te enviamos un correo para restablecerla'); }
      catch (e) { state.authErr = 'No se pudo enviar el correo'; render(); }
    },
    async resendEmail() {
      if (!state.pendingEmail) return;
      try { await Cloud.resendConfirmation(state.pendingEmail); UI.toast('Te reenviamos el correo de confirmación'); }
      catch (e) { UI.toast('No se pudo reenviar el correo'); }
    },
    async doUpdatePw() {
      const fail = m => { state.authErr = m; state.authBusy = false; render(); };
      const pw = val('rec-pw'), pw2 = val('rec-pw2');
      if (pw.length < 6) return fail('La contraseña necesita 6 caracteres o más');
      if (pw !== pw2) return fail('Las contraseñas no coinciden');
      state.authErr = null; state.authBusy = true; render();
      try {
        await Cloud.updatePassword(pw);
        try { history.replaceState(null, '', location.pathname); } catch (e) {} // limpia el #token del enlace
        const u = await Cloud.sessionUser();
        if (u) { userId = u.id; userEmail = u.email || ''; await loadUser(); }
        state.authBusy = false; UI.toast('Contraseña actualizada'); go(userId ? 'home' : 'auth');
      } catch (e) {
        const m = (e && e.message) || '';
        if (/session|expired|missing|token/i.test(m)) return fail('El enlace ya expiró. Pide otro correo para restablecer tu contraseña.');
        return fail(m || 'No se pudo actualizar la contraseña.');
      }
    },
    async logout() { UI.closeSheet(); await Cloud.signOut(); userId = null; userEmail = ''; db = Store.empty(); state.authErr = null; go('landing'); },
    seeLanding: () => { UI.closeSheet(); go('landing'); },
    goCortes: () => go('cortes'),
    goReceivable: () => { state.cliSeg = 'pedidos'; state.pedFilter = 'cobrar'; go('clientes'); },
    closeSheet: () => UI.closeSheet(),
    closeBg: (el, ev) => { if (ev.target === el) UI.closeSheet(); },
    pick: el => { const g = el.closest('.pick'); if (!g) return; g.querySelectorAll('[data-pick]').forEach(b => b.classList.remove('on')); el.classList.add('on'); },

    /* ---- fotos en formularios ---- */
    async onPhotoPick(el) {
      const files = Array.from(el.files || []);
      el.value = '';                                   // permite volver a elegir la misma foto
      const photos = Forms.getPhotos();
      for (const file of files) {
        if (!file.type || file.type.indexOf('image/') !== 0) continue;
        if (photos.length >= 6) { UI.toast('Máximo 6 fotos'); break; }
        try { photos.push(await UI.compressImage(file)); } catch (e) { UI.toast('No se pudo agregar la foto'); }
      }
      renderPhotos();
    },
    delPhoto(el) { Forms.getPhotos().splice(+el.dataset.i, 1); renderPhotos(); },
    zoomPhoto(el) { const src = Forms.getPhotos()[+el.dataset.i]; if (src) UI.modal(`<img class="photo-full" src="${src}" alt="foto"><div class="btn-row mt12"><button class="btn btn-ghost" data-act="closeSheet">Cerrar</button></div>`); },

    prevMonth: () => { state.period = shiftMonth(state.period, -1); render(); },
    nextMonth: () => { state.period = shiftMonth(state.period, 1); render(); },
    setGastoCat: el => { state.gastoCat = el.dataset.v; render(); },
    setCliSeg: el => { state.cliSeg = el.dataset.v; render(); },
    setPedFilter: el => { state.pedFilter = el.dataset.v; render(); },
    setBitSeg: el => { state.bitSeg = el.dataset.v; render(); },
    openSettings: () => UI.sheet(Views.settings()),

    /* ---- gastos ---- */
    addExpense: () => UI.sheet(Forms.expense()),
    editExpense: el => { const e = find('expenses', el.dataset.id); if (e) UI.sheet(Forms.expense(e)); },
    saveExpense(el) {
      const id = el.dataset.id;
      const amount = numv('e-amount');
      if (amount <= 0) return UI.toast('Anota el monto del gasto');
      const data = { cat: sheetPick('cat') || 'otros', date: val('e-date') || UI.todayISO(), concept: val('e-concept'), amount, note: val('e-note'), photos: Forms.getPhotos() };
      if (id) Object.assign(find('expenses', id), data);
      else db.expenses.push({ id: Store.uid(), ...data });
      save(); UI.closeSheet(); UI.toast(id ? 'Gasto actualizado' : 'Gasto registrado'); render();
    },
    delExpense: el => confirmDel('expenses', el.dataset.id, 'este gasto'),

    /* ---- cortes ---- */
    addHarvest: () => UI.sheet(Forms.harvest()),
    editHarvest: el => { const h = find('harvests', el.dataset.id); if (h) UI.sheet(Forms.harvest(h)); },
    saveHarvest(el) {
      const id = el.dataset.id;
      const product = val('h-product');
      const qty = numv('h-qty');
      if (!product) return UI.toast('¿Qué cultivo cortaste?');
      if (qty <= 0) return UI.toast('Anota la cantidad');
      const kg = (sheetPick('unit') === 't') ? qty * 1000 : qty;
      addProductIfNew(product);
      const data = { date: val('h-date') || UI.todayISO(), product, kg, quality: sheetPick('quality') || 'primera', note: val('h-note'), photos: Forms.getPhotos() };
      if (id) Object.assign(find('harvests', id), data);
      else db.harvests.push({ id: Store.uid(), ...data });
      save(); UI.closeSheet(); UI.toast(id ? 'Corte actualizado' : 'Corte registrado'); render();
    },
    delHarvest: el => confirmDel('harvests', el.dataset.id, 'este corte'),

    /* ---- clientes ---- */
    addClient: () => UI.sheet(Forms.client()),
    editClient: el => { const c = find('clients', el.dataset.id); if (c) UI.sheet(Forms.client(c)); },
    openClient: el => UI.sheet(Views.clientSheet(el.dataset.id)),
    saveClient(el) {
      const id = el.dataset.id;
      const name = val('c-name');
      if (name.length < 2) return UI.toast('Escribe el nombre del cliente');
      const data = { name, phone: val('c-phone'), note: val('c-note') };
      if (id) Object.assign(find('clients', id), data);
      else db.clients.push({ id: Store.uid(), ...data, createdAt: Date.now() });
      save(); UI.closeSheet(); UI.toast(id ? 'Cliente actualizado' : 'Cliente guardado'); render();
    },
    delClient: el => confirmDel('clients', el.dataset.id, 'este cliente'),

    /* ---- pedidos / ventas ---- */
    addOrder: () => UI.sheet(Forms.order()),
    addOrderFor: el => UI.sheet(Forms.order({}, el.dataset.id)),
    editOrder: el => { const o = find('orders', el.dataset.id); if (o) UI.sheet(Forms.order(o)); },
    openOrder: el => UI.sheet(Views.orderSheet(el.dataset.id)),
    saveOrder(el) {
      const id = el.dataset.id;
      const clientId = document.getElementById('o-client')?.value;
      const product = val('o-product');
      const kg = numv('o-kg'), price = numv('o-price');
      if (!clientId) return UI.toast('Elige un cliente');
      if (!product) return UI.toast('¿Qué cultivo?');
      if (kg <= 0) return UI.toast('Anota la cantidad');
      if (price <= 0) return UI.toast('Anota el precio por kg');
      addProductIfNew(product);
      const total = Math.round(kg * price);
      const data = { clientId, date: val('o-date') || UI.todayISO(), product, kg, price, total, status: sheetPick('status') || 'pedido', note: val('o-note') };
      if (id) Object.assign(find('orders', id), data);
      else db.orders.push({ id: Store.uid(), ...data, paid: 0, createdAt: Date.now() });
      save(); UI.closeSheet(); UI.toast(id ? 'Pedido actualizado' : 'Pedido registrado'); render();
    },
    delOrder: el => confirmDel('orders', el.dataset.id, 'este pedido'),
    markDelivered(el) { const o = find('orders', el.dataset.id); if (!o) return; o.status = 'entregado'; save(); UI.toast('Marcado como entregado'); UI.sheet(Views.orderSheet(o.id)); render(); },

    /* ---- pagos ---- */
    openPayment: el => { const o = find('orders', el.dataset.id); if (o) UI.sheet(Forms.payment(o)); },
    savePayment(el) {
      const o = find('orders', el.dataset.id); if (!o) return;
      const amt = numv('p-amount');
      if (amt <= 0) return UI.toast('Anota el abono');
      o.paid = Math.min(o.total, (o.paid || 0) + amt);
      save(); UI.closeSheet(); UI.toast('Pago registrado'); render();
    },
    payFull(el) { const o = find('orders', el.dataset.id); if (!o) return; o.paid = o.total; save(); UI.closeSheet(); UI.toast('Saldo liquidado'); render(); },

    /* ---- bitácora ---- */
    addLog: () => UI.sheet(Forms.log()),
    editLog: el => { const l = find('log', el.dataset.id); if (l) UI.sheet(Forms.log(l)); },
    saveLog(el) {
      const id = el.dataset.id;
      const text = val('l-text');
      if (!text) return UI.toast('Escribe qué pasó');
      const data = { date: val('l-date') || UI.todayISO(), tag: sheetPick('tag') || 'nota', text, photos: Forms.getPhotos() };
      if (id) Object.assign(find('log', id), data);
      else db.log.push({ id: Store.uid(), ...data });
      save(); UI.closeSheet(); UI.toast(id ? 'Registro actualizado' : 'Agregado a la bitácora'); render();
    },
    delLog: el => confirmDel('log', el.dataset.id, 'este registro'),

    /* ---- notas ---- */
    addNote: () => UI.sheet(Forms.note()),
    editNote: el => { const n = find('notes', el.dataset.id); if (n) UI.sheet(Forms.note(n)); },
    saveNote(el) {
      const id = el.dataset.id;
      const title = val('n-title'), text = val('n-text');
      if (!title && !text) return UI.toast('Escribe algo en la nota');
      if (id) Object.assign(find('notes', id), { title, text, updatedAt: Date.now() });
      else db.notes.push({ id: Store.uid(), title, text, updatedAt: Date.now() });
      save(); UI.closeSheet(); UI.toast(id ? 'Nota actualizada' : 'Nota guardada'); render();
    },
    delNote: el => confirmDel('notes', el.dataset.id, 'esta nota'),

    /* ---- ciclo agrícola ---- */
    openCycle: () => UI.sheet(Forms.cycle(db.cycle || {})),
    saveCycle() {
      const id = (db.cycle && db.cycle.id) || Store.uid();
      db.cycle = { id, name: val('cy-name') || 'Ciclo actual', crop: val('cy-crop'), variety: val('cy-variety'), start: val('cy-start'), end: val('cy-end') };
      save(); UI.closeSheet(); UI.toast('Ciclo guardado'); render();
    },
    closeCycle: () => UI.modal(`<div class="h3 mb8">¿Cerrar este ciclo y empezar uno nuevo?</div><p class="muted small mb16">El ciclo actual pasa al historial (sus números quedan guardados). Los gastos y ventas que ya anotaste NO se borran; solo dejarán de contarse en el ciclo nuevo si quedan fuera de sus fechas.</p>
      <div class="btn-row"><button class="btn btn-ghost" data-act="closeSheet">Cancelar</button><button class="btn btn-primary" data-act="doCloseCycle">Empezar ciclo nuevo</button></div>`),
    doCloseCycle() {
      if (!db.cycles) db.cycles = [];
      if (db.cycle && db.cycle.crop) db.cycles.push({ ...db.cycle, id: db.cycle.id || Store.uid() });
      db.cycle = { id: Store.uid(), name: '', crop: (db.cycle && db.cycle.crop) || '', variety: (db.cycle && db.cycle.variety) || '', start: UI.todayISO(), end: '' };
      UI.sheet(Forms.cycle(db.cycle, true));
    },
    saveNewCycle() {
      db.cycle = { id: db.cycle.id, name: val('cy-name') || 'Ciclo actual', crop: val('cy-crop'), variety: val('cy-variety'), start: val('cy-start'), end: val('cy-end') };
      save(); UI.closeSheet(); UI.toast('¡Nuevo ciclo iniciado!'); go('rentabilidad');
    },
    viewCycle: el => { const cy = db.cycles.find(c => c.id === el.dataset.id); if (cy) UI.sheet(Views.cycleSheet(cy)); },
    delCycle: el => confirmDel('cycles', el.dataset.id, 'este ciclo del historial'),

    /* ---- trabajos ---- */
    setTaskFilter: el => { state.taskFilter = el.dataset.v; render(); },
    addTask: () => UI.sheet(Forms.task()),
    editTask: el => { const t = find('tasks', el.dataset.id); if (t) UI.sheet(Forms.task(t)); },
    saveTask(el) {
      const id = el.dataset.id;
      const title = val('t-title'); if (!title) return UI.toast('¿Qué trabajo es?');
      const data = { title, status: sheetPick('status') || 'pendiente', date: val('t-date') || UI.todayISO(), cost: numv('t-cost'), note: val('t-note') };
      if (id) Object.assign(find('tasks', id), data); else db.tasks.push({ id: Store.uid(), ...data });
      save(); UI.closeSheet(); UI.toast(id ? 'Trabajo actualizado' : 'Trabajo agregado'); render();
    },
    delTask: el => confirmDel('tasks', el.dataset.id, 'este trabajo'),

    /* ---- riego ---- */
    addIrrig: () => UI.sheet(Forms.irrigation()),
    editIrrig: el => { const r = find('irrigations', el.dataset.id); if (r) UI.sheet(Forms.irrigation(r)); },
    saveIrrig(el) {
      const id = el.dataset.id;
      const data = { date: val('r-date') || UI.todayISO(), minutes: numv('r-min'), water: numv('r-water'), wunit: sheetPick('wunit') || 'm³', fert: numv('r-fert'), funit: sheetPick('funit') || 'L', note: val('r-note') };
      if (id) Object.assign(find('irrigations', id), data); else db.irrigations.push({ id: Store.uid(), ...data });
      save(); UI.closeSheet(); UI.toast(id ? 'Riego actualizado' : 'Riego registrado'); render();
    },
    delIrrig: el => confirmDel('irrigations', el.dataset.id, 'este riego'),

    /* ---- aplicaciones foliares ---- */
    addApp: () => UI.sheet(Forms.application()),
    editApp: el => { const a = find('applications', el.dataset.id); if (a) UI.sheet(Forms.application(a)); },
    saveApp(el) {
      const id = el.dataset.id;
      const product = val('a-product'); if (!product) return UI.toast('¿Qué producto aplicaste?');
      const data = { date: val('a-date') || UI.todayISO(), product, dose: val('a-dose'), cost: numv('a-cost'), note: val('a-note') };
      if (id) Object.assign(find('applications', id), data); else db.applications.push({ id: Store.uid(), ...data });
      save(); UI.closeSheet(); UI.toast(id ? 'Aplicación actualizada' : 'Aplicación registrada'); render();
    },
    delApp: el => confirmDel('applications', el.dataset.id, 'esta aplicación'),

    /* ---- inventario ---- */
    setInvKind: el => { state.invKind = el.dataset.v; render(); },
    addInv: () => UI.sheet(Forms.invItem({ kind: state.invKind })),
    editInv: el => { const i = find('inventory', el.dataset.id); if (i) UI.sheet(Forms.invItem(i)); },
    saveInv(el) {
      const id = el.dataset.id;
      const name = val('i-name'); if (!name) return UI.toast('Escribe el nombre');
      const data = { name, kind: sheetPick('kind') || 'insumo', qty: numv('i-qty'), unit: val('i-unit'), note: val('i-note') };
      if (id) Object.assign(find('inventory', id), data); else db.inventory.push({ id: Store.uid(), ...data });
      save(); UI.closeSheet(); UI.toast(id ? 'Artículo actualizado' : 'Artículo guardado'); render();
    },
    delInv: el => confirmDel('inventory', el.dataset.id, 'este artículo'),

    /* ---- borrado genérico ---- */
    doDelete(el) { const k = el.dataset.kind; db[k] = db[k].filter(x => x.id !== el.dataset.id); save(); UI.closeSheet(); UI.toast('Eliminado'); render(); },

    /* ---- ajustes ---- */
    saveName() { db.meta.name = val('set-name') || 'Mi invernadero'; save(); UI.toast('Nombre guardado'); render(); },
    addProduct() { const v = val('set-prod'); if (!v) return; addProductIfNew(v); save(); UI.sheet(Views.settings()); },
    delProduct(el) { db.products = db.products.filter(x => x !== el.dataset.v); save(); UI.sheet(Views.settings()); },
    exportCSV() {
      try {
        const cy = db.cycle || {}, c = Q.cycleSummary(cy);
        const esc = v => { v = (v == null ? '' : String(v)); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
        const L = []; const row = (...a) => L.push(a.map(esc).join(','));
        row('ABONO · Resumen del ciclo agrícola');
        row('Ciclo', cy.name || ''); row('Cultivo', cy.crop || ''); row('Variedad', cy.variety || '');
        row('Inicio', cy.start || ''); row('Fin', cy.end || 'En curso');
        row('');
        row('Concepto', 'Monto');
        row('Gastos y compras', Math.round(c.gastos));
        row('Mano de obra / trabajos', Math.round(c.trabajos));
        row('Aplicaciones foliares', Math.round(c.aplic));
        row('INVERSIÓN TOTAL', Math.round(c.costs));
        row('Ventas', Math.round(c.sales));
        row('UTILIDAD', Math.round(c.profit));
        row('Por cobrar', Math.round(c.receivable));
        row('Producción (kg)', Math.round(c.kg));
        row('Kg vendidos', Math.round(c.kgSold));
        row('Costo por kilo', Math.round(c.costPerKg * 100) / 100);
        row('Precio venta por kilo', Math.round(c.avgPrice * 100) / 100);
        row('Margen %', Math.round(c.margin * 100));
        row('');
        row('GASTOS'); row('Fecha', 'Categoría', 'Concepto', 'Monto');
        Q.byDateDesc(Q.inCycle(db.expenses, cy)).forEach(e => row(e.date, Data.catOf(e.cat).label, e.concept, e.amount));
        row('');
        row('TRABAJOS'); row('Fecha', 'Trabajo', 'Estado', 'Costo');
        Q.byDateDesc(Q.inCycle(db.tasks, cy)).forEach(t => row(t.date, t.title, Data.stOf(t.status).label, t.cost || 0));
        row('');
        row('APLICACIONES FOLIARES'); row('Fecha', 'Producto', 'Dosis', 'Costo');
        Q.byDateDesc(Q.inCycle(db.applications, cy)).forEach(a => row(a.date, a.product, a.dose, a.cost || 0));
        row('');
        row('RIEGOS'); row('Fecha', 'Min', 'Agua', 'Unidad', 'Fertirriego', 'Unidad');
        Q.byDateDesc(Q.inCycle(db.irrigations, cy)).forEach(r => row(r.date, r.minutes || 0, r.water || 0, r.wunit || '', r.fert || 0, r.funit || ''));
        row('');
        row('CORTES'); row('Fecha', 'Cultivo', 'Calidad', 'kg');
        Q.byDateDesc(Q.inCycle(db.harvests, cy)).forEach(h => row(h.date, h.product, Data.qualOf(h.quality).label, h.kg));
        row('');
        row('VENTAS / PEDIDOS'); row('Fecha', 'Cliente', 'Cultivo', 'kg', 'Precio/kg', 'Total', 'Estado', 'Pagado');
        Q.byDateDesc(Q.inCycle(db.orders, cy)).forEach(o => row(o.date, Q.clientName(o.clientId), o.product, o.kg, o.price, o.total, o.status, o.paid || 0));
        row('');
        row('INVENTARIO'); row('Tipo', 'Nombre', 'Cantidad', 'Unidad');
        db.inventory.forEach(i => row(Data.kindOf(i.kind).label, i.name, i.qty, i.unit || ''));
        const blob = new Blob(['﻿' + L.join('\n')], { type: 'text/csv;charset=utf-8' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'agrofin-ciclo.csv'; a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        UI.toast('Ciclo exportado a Excel (.csv)');
      } catch (e) { UI.toast('No se pudo exportar'); }
    },
    exportData() {
      try {
        const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'inverna-datos.json'; a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        UI.toast('Datos exportados');
      } catch (e) { UI.toast('No se pudo exportar'); }
    },
    resetDemo: () => UI.modal(`<div class="h3 mb8">¿Cargar datos de ejemplo?</div><p class="muted small mb16">Reemplaza lo que tengas ahora por datos de muestra para que veas cómo funciona la app.</p>
      <div class="btn-row"><button class="btn btn-ghost" data-act="closeSheet">Cancelar</button><button class="btn btn-danger" data-act="doReset">Cargar ejemplo</button></div>`),
    doReset() { db = Store.empty(); Data.seed(db); save(); UI.closeSheet(); state.period = UI.todayKey(); go('home'); UI.toast('Ejemplo recargado'); },
    wipeAll: () => UI.modal(`<div class="h3 mb8">¿Borrar todo?</div><p class="muted small mb16">Se eliminan todos tus gastos, cortes, clientes y notas de este teléfono. No se puede deshacer.</p>
      <div class="btn-row"><button class="btn btn-ghost" data-act="closeSheet">Cancelar</button><button class="btn btn-danger" data-act="doWipe">Borrar todo</button></div>`),
    doWipe() { db = Store.empty(); db.meta.cleared = true; save(); UI.closeSheet(); state.period = UI.todayKey(); go('home'); UI.toast('Listo, empezamos de cero'); },
  };

  /* ---- delegación de eventos ---- */
  document.addEventListener('click', ev => {
    const pk = ev.target.closest('[data-pick]');
    if (pk) { A.pick(pk); return; }
    const el = ev.target.closest('[data-act]');
    if (!el) return;
    const fn = A[el.dataset.act];
    if (fn) { ev.preventDefault(); fn(el, ev); }
  });

  // selección de fotos (input file)
  document.addEventListener('change', ev => { if (ev.target && ev.target.id === 'photo-input') A.onPhotoPick(ev.target); });

  // total en vivo del pedido
  document.addEventListener('input', ev => {
    if (ev.target.id === 'o-kg' || ev.target.id === 'o-price') {
      const kg = parseFloat(document.getElementById('o-kg')?.value) || 0;
      const pr = parseFloat(document.getElementById('o-price')?.value) || 0;
      const t = document.getElementById('o-total'); if (t) t.textContent = UI.money(kg * pr);
    }
  });

  document.addEventListener('DOMContentLoaded', boot);
  if (document.readyState !== 'loading') boot();

  // Respaldar en la nube al cerrar la app o cambiar de pestaña (evita perder lo recién capturado).
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushSync(); });
  window.addEventListener('pagehide', flushSync);

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }

  return {
    save, go, render,
    get db() { return db; },
    get authMode() { return state.authMode; },
    get authErr() { return state.authErr; },
    get authBusy() { return state.authBusy; },
    get userEmail() { return userEmail; },
    get userName() { return userEmail ? userEmail.split('@')[0] : ''; },
    get pendingEmail() { return state.pendingEmail; },
    get route() { return route; },
    get period() { return state.period; },
    get gastoCat() { return state.gastoCat; },
    get cliSeg() { return state.cliSeg; },
    get pedFilter() { return state.pedFilter; },
    get bitSeg() { return state.bitSeg; },
    get taskFilter() { return state.taskFilter; },
    get invKind() { return state.invKind; },
  };
})();
