/* ============ INVERNA · Formularios (alta / edición en sheet) ============ */
const Forms = (() => {
  const today = () => UI.todayISO();

  const f = (label, inner, hint) => `<label class="field"><span class="flbl">${label}</span>${inner}${hint ? `<span class="fhint">${hint}</span>` : ''}</label>`;
  const fblock = (label, inner, hint) => `<div class="field"><span class="flbl">${label}</span>${inner}${hint ? `<span class="fhint">${hint}</span>` : ''}</div>`;
  const inp = (id, attrs = '', val = '') => `<input class="input" id="${id}" ${attrs} value="${val != null && val !== '' ? UI.esc(val) : ''}">`;
  const ta = (id, val = '', ph = '') => `<textarea class="ta" id="${id}" placeholder="${ph}">${val ? UI.esc(val) : ''}</textarea>`;
  const dlist = () => `<datalist id="prods">${App.db.products.map(p => `<option value="${UI.esc(p)}"></option>`).join('')}</datalist>`;

  function pick(g, items, sel) {
    return `<div class="pick" data-g="${g}">${items.map(it =>
      `<button type="button" class="chip ${it.id === sel ? 'on' : ''}" data-pick="${g}" data-v="${it.id}"${it.color ? ` style="--c:${it.color}"` : ''}>${it.color ? UI.dot(it.color) : ''}${it.label}</button>`
    ).join('')}</div>`;
  }

  const head = (title, id, delAct) => `<div class="sheet-head"><div class="h2">${title}</div>${id && delAct ? `<button class="iconbtn danger" data-act="${delAct}" data-id="${id}">${UI.icon('trash')}</button>` : ''}</div>`;
  const saveBtn = (act, id, label) => `<button class="btn btn-primary mt8" data-act="${act}" data-id="${id || ''}">${UI.icon('check')} ${label}</button>`;

  /* ---------------- fotos (recibo, corte, planta…) ---------------- */
  let photos = [];                                   // fotos del formulario abierto (data URLs)
  const setPhotos = arr => { photos = Array.isArray(arr) ? arr.slice() : []; };
  const getPhotos = () => photos;
  function thumbs() {
    if (!photos.length) return '';
    return photos.map((src, i) => `<div class="photo-thumb">
        <img src="${src}" data-act="zoomPhoto" data-i="${i}" alt="foto">
        <button type="button" class="photo-del" data-act="delPhoto" data-i="${i}" aria-label="Quitar">${UI.icon('x', '', 13)}</button>
      </div>`).join('');
  }
  function photoField(hint) {
    return fblock('Fotos (opcional)',
      `<div class="photos" id="photos-wrap">${thumbs()}</div>
       <label class="photo-add">${UI.icon('camera', '', 17)} Agregar foto<input type="file" id="photo-input" accept="image/*" hidden></label>`,
      hint || 'Toma o sube una foto: recibo, factura, corte o la planta.');
  }

  /* ---------------- gasto ---------------- */
  function expense(e = {}) {
    const isEdit = !!e.id;
    setPhotos(e.photos);
    return head(isEdit ? 'Editar gasto' : 'Nuevo gasto', e.id, 'delExpense')
      + fblock('Categoría', pick('cat', Data.CATS, e.cat || 'insumos'))
      + f('Fecha', inp('e-date', 'type="date"', e.date || today()))
      + f('Concepto', inp('e-concept', 'placeholder="Ej. Fertilizante NPK"', e.concept))
      + f('Monto (MXN)', inp('e-amount', 'type="number" inputmode="decimal" placeholder="0"', e.amount))
      + f('Nota (opcional)', ta('e-note', e.note, 'Detalle, lote, proveedor…'))
      + photoField('Foto del recibo o la factura.')
      + saveBtn('saveExpense', e.id, isEdit ? 'Guardar cambios' : 'Registrar gasto');
  }

  /* ---------------- corte / producción ---------------- */
  function harvest(h = {}) {
    const isEdit = !!h.id;
    setPhotos(h.photos);
    return head(isEdit ? 'Editar corte' : 'Nuevo corte', h.id, 'delHarvest')
      + f('Fecha del corte', inp('h-date', 'type="date"', h.date || today()))
      + f('Cultivo', inp('h-product', 'list="prods" placeholder="Ej. Jitomate"', h.product || App.db.products[0] || '') + dlist())
      + fblock('Cantidad',
          `<div class="row gap8"><input class="input" id="h-qty" type="number" inputmode="decimal" placeholder="0" value="${h.kg != null ? h.kg : ''}" style="flex:1">${pick('unit', [{ id: 'kg', label: 'kg' }, { id: 't', label: 'ton' }], 'kg')}</div>`,
          'Anota en kilos o en toneladas.')
      + fblock('Calidad', pick('quality', Data.QUALITIES, h.quality || 'primera'))
      + f('Nota (opcional)', ta('h-note', h.note, 'Lote, observaciones…'))
      + photoField('Foto del corte o de la fruta.')
      + saveBtn('saveHarvest', h.id, isEdit ? 'Guardar cambios' : 'Registrar corte');
  }

  /* ---------------- cliente ---------------- */
  function client(c = {}) {
    const isEdit = !!c.id;
    return head(isEdit ? 'Editar cliente' : 'Nuevo cliente', c.id, 'delClient')
      + f('Nombre', inp('c-name', 'placeholder="Ej. Central de Abastos"', c.name))
      + f('Teléfono / WhatsApp (opcional)', inp('c-phone', 'type="tel" inputmode="tel" placeholder="10 dígitos"', c.phone))
      + f('Nota (opcional)', ta('c-note', c.note, 'Dirección, bodega, condiciones…'))
      + saveBtn('saveClient', c.id, isEdit ? 'Guardar cambios' : 'Guardar cliente');
  }

  /* ---------------- pedido / venta ---------------- */
  function order(o = {}, fixedClient) {
    const isEdit = !!o.id;
    const cs = App.db.clients;
    if (!cs.length) {
      return head('Nuevo pedido') + UI.empty('users', 'Primero agrega un cliente', 'Necesitas al menos un cliente para registrar un pedido o venta.')
        + `<button class="btn btn-primary mt8" data-act="addClient">${UI.icon('plus')} Agregar cliente</button>`;
    }
    const cid = o.clientId || fixedClient || cs[0].id;
    const opts = cs.map(c => `<option value="${c.id}" ${c.id === cid ? 'selected' : ''}>${UI.esc(c.name)}</option>`).join('');
    const total = (o.kg && o.price) ? o.kg * o.price : 0;
    return head(isEdit ? 'Editar pedido' : 'Nuevo pedido', o.id, 'delOrder')
      + f('Cliente', `<select class="input" id="o-client" ${fixedClient ? 'disabled' : ''}>${opts}</select>`)
      + f('Fecha', inp('o-date', 'type="date"', o.date || today()))
      + f('Cultivo', inp('o-product', 'list="prods" placeholder="Ej. Jitomate"', o.product || App.db.products[0] || '') + dlist())
      + `<div class="row gap8">
          ${f('Cantidad (kg)', inp('o-kg', 'type="number" inputmode="decimal" placeholder="0"', o.kg))}
          ${f('Precio $/kg', inp('o-price', 'type="number" inputmode="decimal" placeholder="0"', o.price))}
        </div>`
      + `<div class="total-line"><span>Total</span><b id="o-total">${UI.money(total)}</b></div>`
      + fblock('Estado', pick('status', [{ id: 'pedido', label: 'Pedido', color: '#c4790f' }, { id: 'entregado', label: 'Entregado', color: '#178a4b' }], o.status || 'pedido'))
      + f('Nota (opcional)', ta('o-note', o.note, ''))
      + saveBtn('saveOrder', o.id, isEdit ? 'Guardar cambios' : 'Registrar pedido');
  }

  /* ---------------- pago / abono ---------------- */
  function payment(o) {
    const bal = Q.balance(o);
    return head('Registrar pago')
      + `<div class="paybox">
          <div class="row between"><span class="muted">${UI.esc(Q.clientName(o.clientId))}</span><span class="small muted">${UI.date(o.date)}</span></div>
          <div class="row between mt8"><span>Total</span><b>${UI.money(o.total)}</b></div>
          <div class="row between"><span>Ya pagado</span><b>${UI.money(o.paid || 0)}</b></div>
          <div class="row between saldo"><span>Saldo</span><b>${UI.money(bal)}</b></div>
        </div>`
      + f('Abono (MXN)', inp('p-amount', 'type="number" inputmode="decimal"', bal), 'Deja el saldo completo o anota un abono parcial.')
      + `<div class="btn-row mt8">
          <button class="btn btn-ghost" data-act="payFull" data-id="${o.id}">${UI.icon('checkc')} Saldar todo</button>
          <button class="btn btn-primary" data-act="savePayment" data-id="${o.id}">${UI.icon('check')} Registrar</button>
        </div>`;
  }

  /* ---------------- bitácora ---------------- */
  function log(l = {}) {
    const isEdit = !!l.id;
    setPhotos(l.photos);
    return head(isEdit ? 'Editar registro' : 'Registro de bitácora', l.id, 'delLog')
      + f('Fecha', inp('l-date', 'type="date"', l.date || today()))
      + fblock('Tipo', pick('tag', Data.LOGTAGS, l.tag || 'nota'))
      + f('¿Qué pasó?', ta('l-text', l.text, 'Riego, fumigación, incidencia, observación…'))
      + photoField('Foto de la planta, plaga o lo que observaste.')
      + saveBtn('saveLog', l.id, isEdit ? 'Guardar cambios' : 'Agregar a bitácora');
  }

  /* ---------------- nota ---------------- */
  function note(n = {}) {
    const isEdit = !!n.id;
    return head(isEdit ? 'Editar nota' : 'Nueva nota', n.id, 'delNote')
      + f('Título', inp('n-title', 'placeholder="Ej. Pendientes"', n.title))
      + f('Contenido', ta('n-text', n.text, 'Escribe lo que quieras recordar…'))
      + saveBtn('saveNote', n.id, isEdit ? 'Guardar cambios' : 'Guardar nota');
  }

  /* ---------------- trabajo / tarea ---------------- */
  function task(t = {}) {
    const isEdit = !!t.id;
    return head(isEdit ? 'Editar trabajo' : 'Nuevo trabajo', t.id, 'delTask')
      + f('¿Qué trabajo?', inp('t-title', 'placeholder="Ej. Tutoreo y bajado de planta"', t.title))
      + fblock('Estado', pick('status', Data.TASKST, t.status || 'pendiente'))
      + f('Fecha', inp('t-date', 'type="date"', t.date || today()))
      + f('Costo del trabajo (MXN, opcional)', inp('t-cost', 'type="number" inputmode="decimal" placeholder="0"', t.cost))
      + f('Nota (opcional)', ta('t-note', t.note, 'Quién, surcos, detalles…'))
      + saveBtn('saveTask', t.id, isEdit ? 'Guardar cambios' : 'Agregar trabajo');
  }

  /* ---------------- riego ---------------- */
  function irrigation(r = {}) {
    const isEdit = !!r.id;
    return head(isEdit ? 'Editar riego' : 'Nuevo riego', r.id, 'delIrrig')
      + f('Fecha', inp('r-date', 'type="date"', r.date || today()))
      + f('Duración (min)', inp('r-min', 'type="number" inputmode="decimal" placeholder="0"', r.minutes))
      + fblock('Agua aplicada',
          `<div class="row gap8"><input class="input" id="r-water" type="number" inputmode="decimal" placeholder="0" value="${r.water != null ? r.water : ''}" style="flex:1">${pick('wunit', [{ id: 'm³', label: 'm³' }, { id: 'L', label: 'L' }], r.wunit || 'm³')}</div>`)
      + fblock('Fertirriego aplicado',
          `<div class="row gap8"><input class="input" id="r-fert" type="number" inputmode="decimal" placeholder="0" value="${r.fert != null ? r.fert : ''}" style="flex:1">${pick('funit', [{ id: 'L', label: 'L' }, { id: 'kg', label: 'kg' }], r.funit || 'L')}</div>`)
      + f('Nota (opcional)', ta('r-note', r.note, 'Lote, fórmula, observaciones…'))
      + saveBtn('saveIrrig', r.id, isEdit ? 'Guardar cambios' : 'Registrar riego');
  }

  /* ---------------- aplicación foliar ---------------- */
  function application(a = {}) {
    const isEdit = !!a.id;
    return head(isEdit ? 'Editar aplicación' : 'Aplicación foliar', a.id, 'delApp')
      + f('Fecha', inp('a-date', 'type="date"', a.date || today()))
      + f('Producto', inp('a-product', 'placeholder="Ej. Foliar Ca-B"', a.product))
      + f('Dosis', inp('a-dose', 'placeholder="Ej. 300 ml/100 L"', a.dose))
      + f('Costo (MXN)', inp('a-cost', 'type="number" inputmode="decimal" placeholder="0"', a.cost))
      + f('Nota (opcional)', ta('a-note', a.note, 'Objetivo, plaga, lote…'))
      + saveBtn('saveApp', a.id, isEdit ? 'Guardar cambios' : 'Registrar aplicación');
  }

  /* ---------------- inventario ---------------- */
  function invItem(i = {}) {
    const isEdit = !!i.id;
    return head(isEdit ? 'Editar artículo' : 'Nuevo artículo', i.id, 'delInv')
      + fblock('Tipo', pick('kind', Data.INVKINDS, i.kind || 'insumo'))
      + f('Nombre', inp('i-name', 'placeholder="Ej. Fertilizante NPK"', i.name))
      + `<div class="row gap8">
          ${f('Cantidad', inp('i-qty', 'type="number" inputmode="decimal" placeholder="0"', i.qty))}
          ${f('Unidad', inp('i-unit', 'placeholder="kg, L, sacos, cajas…"', i.unit))}
        </div>`
      + f('Nota (opcional)', ta('i-note', i.note, ''))
      + saveBtn('saveInv', i.id, isEdit ? 'Guardar cambios' : 'Guardar artículo');
  }

  /* ---------------- ciclo agrícola ---------------- */
  function cycle(c = {}, isNew) {
    return head(isNew ? 'Nuevo ciclo agrícola' : 'Ciclo agrícola')
      + f('Nombre del ciclo', inp('cy-name', 'placeholder="Ej. Ciclo 2026-B"', c.name))
      + f('Cultivo', inp('cy-crop', 'placeholder="Ej. Jitomate saladet"', c.crop))
      + f('Variedad / semilla', inp('cy-variety', 'placeholder="Ej. Mosquetero"', c.variety))
      + `<div class="row gap8">
          ${f('Inicio', inp('cy-start', 'type="date"', c.start))}
          ${f('Fin (opcional)', inp('cy-end', 'type="date"', c.end))}
        </div>`
      + `<span class="fhint">Los ciclos son de duración variable (jitomate, aguacate…). Deja "Fin" vacío si sigue en curso. Solo se suman aquí los gastos y ventas con fecha dentro de este rango.</span>`
      + saveBtn(isNew ? 'saveNewCycle' : 'saveCycle', '', isNew ? 'Empezar ciclo' : 'Guardar ciclo');
  }

  return { expense, harvest, client, order, payment, log, note, task, irrigation, application, invItem, cycle, getPhotos, setPhotos, thumbs };
})();
