/* ============ INVERNA/ABONO · Producción: Más hub + Trabajos, Riego, Aplicaciones, Inventario ============ */
window.Views = window.Views || {};

(function (V) {
  const back = `<button class="iconbtn" data-act="go" data-route="mas" aria-label="Atrás">${UI.icon('back')}</button>`;

  /* ---------------- Más (hub) ---------------- */
  V.mas = function () {
    const cy = App.db.cycle || {};
    const link = (route, ic, color, title, sub) => `<div class="lrow tap" data-act="go" data-route="${route}">
      <span class="lic" style="color:${color};background:${UI.hexA(color, .12)}">${UI.icon(ic, '', 18)}</span>
      <div class="grow"><div class="lt">${title}</div><div class="ls">${sub}</div></div>
      <span class="muted2">${UI.icon('chevron', '', 16)}</span></div>`;
    return `
    <div class="topbar"><div><h1>Más</h1><div class="sub">Ciclo y controles</div></div></div>

    <div class="card mt8 tap" data-act="openCycle">
      <div class="row between"><span class="eyebrow">Ciclo agrícola</span>${UI.icon('edit', '', 16)}</div>
      <div class="h2 mt4">${UI.esc(cy.crop || 'Sin definir')}</div>
      <div class="small muted">${cy.variety ? 'Semilla ' + UI.esc(cy.variety) : ''}${cy.start ? ' · ' + UI.date(cy.start) + ' – ' + (cy.end ? UI.date(cy.end) : 'en curso') : ''}</div>
    </div>

    <div class="card mt12 list">
      ${link('rentabilidad', 'chart', '#0e6c39', 'Ciclo agrícola', 'Ventas − gastos, costo por kilo y margen')}
      ${link('tareas', 'tool', '#178a4b', 'Trabajos', 'Pendientes, en proceso, hechos · costo')}
      ${link('riego', 'droplet', '#3a92e0', 'Riego y fertirriego', 'Frecuencia, agua y fertirriego')}
      ${link('aplicaciones', 'flask', '#8a6df0', 'Aplicaciones foliares', 'Producto, dosis y costo')}
      ${link('inventario', 'box', '#c4790f', 'Inventario', 'Insumos y producto')}
      ${link('bitacora', 'book', '#6b7d72', 'Bitácora y notas', 'Riegos, fumigaciones, recordatorios')}
    </div>

    <button class="btn btn-ghost mt12" data-act="openSettings">${UI.icon('settings')} Ajustes</button>`;
  };

  /* ---------------- Trabajos ---------------- */
  V.tareas = function () {
    const fil = App.taskFilter;
    let list = Q.tasksAll();
    if (fil !== 'todos') list = list.filter(t => t.status === fil);
    const chip = (id, label) => `<button class="chip ${fil === id ? 'on' : ''}" data-act="setTaskFilter" data-v="${id}">${label}</button>`;
    return `
    <div class="topbar">${back}<div><h1>Trabajos</h1><div class="sub">${Q.taskCount('pendiente')} pend. · ${Q.taskCount('proceso')} en proceso · ${Q.taskCount('hecho')} hechos</div></div>
      <div class="spacer"></div><button class="iconbtn primary" data-act="addTask" aria-label="Nuevo trabajo">${UI.icon('plus')}</button></div>

    <div class="total-card mt8"><div><div class="tc-lbl">Costo de trabajos</div><div class="tc-val">${UI.money(Q.tasksCost())}</div></div><div class="tc-ic">${UI.icon('tool', '', 22)}</div></div>

    <div class="chip-scroll mt12">${chip('todos', 'Todos')}${chip('pendiente', 'Pendientes')}${chip('proceso', 'En proceso')}${chip('hecho', 'Hechos')}</div>

    <div class="card mt8 list">
      ${list.length ? list.map(t => { const s = Data.stOf(t.status);
        return `<div class="lrow tap" data-act="editTask" data-id="${t.id}">
          <span class="lic" style="color:${s.color};background:${UI.hexA(s.color, .12)}">${UI.icon('tool', '', 17)}</span>
          <div class="grow"><div class="lt">${UI.esc(t.title)}</div><div class="ls">${UI.date(t.date)}${t.note ? ' · ' + UI.esc(t.note) : ''}</div>
            <div class="mt4"><span class="badge" style="background:${UI.hexA(s.color, .16)};color:${s.color}">${s.label}</span></div></div>
          ${t.cost > 0 ? `<div class="lr neg">${UI.money(t.cost)}</div>` : ''}
        </div>`; }).join('') : UI.empty('tool', fil === 'todos' ? 'Sin trabajos' : 'Nada en este estado', 'Toca + para agregar un trabajo.')}
    </div>`;
  };

  /* ---------------- Riego ---------------- */
  V.riego = function () {
    const key = App.period;
    const list = Q.irrigMonth(key);
    return `
    <div class="topbar">${back}<div><h1>Riego</h1><div class="sub">${UI.monthLabel(key)}</div></div>
      <div class="spacer"></div><button class="iconbtn primary" data-act="addIrrig" aria-label="Nuevo riego">${UI.icon('plus')}</button></div>
    ${Views.monthNav()}
    <div class="stat-grid mt12">
      <div class="stat" style="--c:#3a92e0"><div class="stat-ic">${UI.icon('droplet', '', 18)}</div><div class="stat-val">${UI.num(Q.waterMonth(key))}</div><div class="stat-lbl">Agua aplicada</div></div>
      <div class="stat" style="--c:#178a4b"><div class="stat-ic">${UI.icon('flask', '', 18)}</div><div class="stat-val">${UI.num(Q.fertMonth(key))}</div><div class="stat-lbl">Fertirriego (L)</div></div>
    </div>
    <div class="card mt12 list">
      ${list.length ? list.map(r => `<div class="lrow tap" data-act="editIrrig" data-id="${r.id}">
        <span class="lic" style="color:#3a92e0;background:${UI.hexA('#3a92e0', .12)}">${UI.icon('droplet', '', 17)}</span>
        <div class="grow"><div class="lt">${UI.date(r.date)} · ${r.minutes || 0} min</div>
          <div class="ls">Agua ${UI.num(r.water || 0)} ${UI.esc(r.wunit || '')} · Fertirriego ${UI.num(r.fert || 0)} ${UI.esc(r.funit || '')}${r.note ? ' · ' + UI.esc(r.note) : ''}</div></div>
      </div>`).join('') : UI.empty('droplet', 'Sin riegos este mes', 'Toca + para registrar un riego.')}
    </div>`;
  };

  /* ---------------- Aplicaciones foliares ---------------- */
  V.aplicaciones = function () {
    const key = App.period;
    const list = Q.appsMonth(key);
    return `
    <div class="topbar">${back}<div><h1>Aplicaciones</h1><div class="sub">Foliares · ${UI.monthLabel(key)}</div></div>
      <div class="spacer"></div><button class="iconbtn primary" data-act="addApp" aria-label="Nueva aplicación">${UI.icon('plus')}</button></div>
    ${Views.monthNav()}
    <div class="total-card mt12"><div><div class="tc-lbl">Costo de aplicaciones</div><div class="tc-val">${UI.money(Q.appsCost(key))}</div></div><div class="tc-ic">${UI.icon('flask', '', 22)}</div></div>
    <div class="card mt12 list">
      ${list.length ? list.map(a => `<div class="lrow tap" data-act="editApp" data-id="${a.id}">
        <span class="lic" style="color:#8a6df0;background:${UI.hexA('#8a6df0', .12)}">${UI.icon('flask', '', 17)}</span>
        <div class="grow"><div class="lt">${UI.esc(a.product)}</div><div class="ls">${UI.date(a.date)}${a.dose ? ' · ' + UI.esc(a.dose) : ''}${a.note ? ' · ' + UI.esc(a.note) : ''}</div></div>
        ${a.cost > 0 ? `<div class="lr neg">${UI.money(a.cost)}</div>` : ''}
      </div>`).join('') : UI.empty('flask', 'Sin aplicaciones este mes', 'Toca + para registrar una aplicación.')}
    </div>`;
  };

  /* ---------------- Ciclo agrícola (rentabilidad, acotada por fecha inicio–fin) ---------------- */
  V.rentabilidad = function () {
    const cy = App.db.cycle || {};
    const c = Q.cycleSummary(cy);
    const profitColor = c.profit >= 0 ? 'var(--brand)' : 'var(--danger)';
    const maxCost = Math.max(c.gastos, c.trabajos, c.aplic, 1);
    const maxQ = c.byQ.length ? Math.max(...c.byQ.map(r => r.kg)) : 1;
    const m2 = n => '$' + (Math.round((n || 0) * 100) / 100).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const rango = cy.start ? `${UI.date(cy.start)} – ${cy.end ? UI.date(cy.end) : 'en curso'}` : 'Define las fechas del ciclo';
    const hist = (App.db.cycles || []).slice().reverse();
    return `
    <div class="topbar">${back}<div><h1>Ciclo agrícola</h1><div class="sub">${UI.esc(cy.crop || 'Sin definir')}${cy.variety ? ' · ' + UI.esc(cy.variety) : ''}</div></div>
      <div class="spacer"></div><button class="iconbtn" data-act="openCycle" aria-label="Editar ciclo">${UI.icon('edit')}</button>
      <button class="iconbtn" data-act="exportCSV" aria-label="Exportar">${UI.icon('download')}</button></div>

    <div class="card mt8 tap" data-act="openCycle">
      <div class="row between"><span class="eyebrow">${UI.esc(cy.name || 'Ciclo actual')}</span>${UI.icon('cal', '', 16)}</div>
      <div class="small muted mt4">${rango}</div>
    </div>

    <div class="balance-card mt8">
      <span class="eyebrow">Ventas − Gastos del ciclo</span>
      <div class="bc-big" style="color:${profitColor}">${c.profit < 0 ? '−' : ''}${UI.money(Math.abs(c.profit))}</div>
      <div class="bc-split">
        <div><div class="bc-k">${UI.icon('trendUp')} Ventas</div><div class="bc-v pos">${UI.money(c.sales)}</div></div>
        <div class="bc-div"></div>
        <div><div class="bc-k">${UI.icon('money')} Inversión</div><div class="bc-v neg">${UI.money(c.costs)}</div></div>
      </div>
    </div>

    <div class="stat-grid mt12">
      <div class="stat" style="--c:#c4790f"><div class="stat-ic">${UI.icon('scale', '', 18)}</div><div class="stat-val">${m2(c.costPerKg)}</div><div class="stat-lbl">Costo por kilo</div></div>
      <div class="stat" style="--c:#178a4b"><div class="stat-ic">${UI.icon('coin', '', 18)}</div><div class="stat-val">${m2(c.avgPrice)}</div><div class="stat-lbl">Precio venta/kg</div></div>
      <div class="stat" style="--c:#3a92e0"><div class="stat-ic">${UI.icon('sprout', '', 18)}</div><div class="stat-val">${UI.weight(c.kg)}</div><div class="stat-lbl">Producción</div></div>
      <div class="stat" style="--c:#8a6df0"><div class="stat-ic">${UI.icon('chart', '', 18)}</div><div class="stat-val">${Math.round(c.margin * 100)}%</div><div class="stat-lbl">Margen</div></div>
    </div>

    <div class="section-head mt20"><h3 class="h3">Inversión del ciclo</h3><span class="small muted">${UI.money(c.costs)}</span></div>
    <div class="card mt8">
      ${UI.bar(c.gastos, maxCost, '#c4790f', UI.dot('#c4790f') + 'Gastos y compras', UI.money(c.gastos))}
      ${UI.bar(c.trabajos, maxCost, '#178a4b', UI.dot('#178a4b') + 'Mano de obra / trabajos', UI.money(c.trabajos))}
      ${UI.bar(c.aplic, maxCost, '#8a6df0', UI.dot('#8a6df0') + 'Aplicaciones foliares', UI.money(c.aplic))}
    </div>

    ${c.byQ.length ? `<div class="section-head mt20"><h3 class="h3">Producción por calidad</h3><span class="small muted">${UI.weight(c.kg)}</span></div>
      <div class="card mt8">${c.byQ.map(r => UI.bar(r.kg, maxQ, r.q.color, UI.dot(r.q.color) + r.q.label, UI.weight(r.kg))).join('')}</div>` : ''}

    <button class="btn btn-ghost mt16" data-act="exportCSV">${UI.icon('download')} Exportar ciclo a Excel (.csv)</button>
    <button class="btn btn-ghost mt8" data-act="closeCycle">${UI.icon('checkc')} Cerrar ciclo y empezar uno nuevo</button>

    ${hist.length ? `<div class="section-head mt20"><h3 class="h3">Ciclos anteriores</h3></div>
      <div class="card mt8 list">${hist.map(h => `<div class="lrow tap" data-act="viewCycle" data-id="${h.id}">
        <span class="lic" style="color:#6b7d72;background:${UI.hexA('#6b7d72', .12)}">${UI.icon('cal', '', 17)}</span>
        <div class="grow"><div class="lt">${UI.esc(h.name || h.crop || 'Ciclo')}</div><div class="ls">${UI.esc(h.crop || '')}${h.start ? ' · ' + UI.date(h.start) + ' – ' + (h.end ? UI.date(h.end) : '—') : ''}</div></div>
        <span class="muted2">${UI.icon('chevron', '', 16)}</span>
      </div>`).join('')}</div>` : ''}`;
  };

  /* ---------------- ficha de un ciclo cerrado (historial) ---------------- */
  V.cycleSheet = function (cy) {
    const c = Q.cycleSummary(cy);
    const profitColor = c.profit >= 0 ? 'var(--brand)' : 'var(--danger)';
    const rango = cy.start ? `${UI.date(cy.start)} – ${cy.end ? UI.date(cy.end) : '—'}` : '';
    return `<div class="sheet-head"><div class="h2">${UI.esc(cy.name || cy.crop || 'Ciclo')}</div>
      <button class="iconbtn danger" data-act="delCycle" data-id="${cy.id}">${UI.icon('trash')}</button></div>
    <div class="small muted mb12">${UI.esc(cy.crop || '')}${cy.variety ? ' · ' + UI.esc(cy.variety) : ''}${rango ? ' · ' + rango : ''}</div>
    <div class="balance-card">
      <span class="eyebrow">Ventas − Gastos</span>
      <div class="bc-big" style="color:${profitColor}">${c.profit < 0 ? '−' : ''}${UI.money(Math.abs(c.profit))}</div>
      <div class="bc-split">
        <div><div class="bc-k">${UI.icon('trendUp')} Ventas</div><div class="bc-v pos">${UI.money(c.sales)}</div></div>
        <div class="bc-div"></div>
        <div><div class="bc-k">${UI.icon('money')} Inversión</div><div class="bc-v neg">${UI.money(c.costs)}</div></div>
      </div>
    </div>
    <div class="stat-grid mt12">
      <div class="stat" style="--c:#178a4b"><div class="stat-ic">${UI.icon('sprout', '', 18)}</div><div class="stat-val">${UI.weight(c.kg)}</div><div class="stat-lbl">Producción</div></div>
      <div class="stat" style="--c:#8a6df0"><div class="stat-ic">${UI.icon('chart', '', 18)}</div><div class="stat-val">${Math.round(c.margin * 100)}%</div><div class="stat-lbl">Margen</div></div>
    </div>
    <button class="btn btn-ghost mt16" data-act="closeSheet">Cerrar</button>`;
  };

  /* ---------------- Inventario ---------------- */
  V.inventario = function () {
    const kind = App.invKind;
    const list = Q.invBy(kind);
    const seg = `<div class="seg mt8">
      <button class="${kind === 'insumo' ? 'on' : ''}" data-act="setInvKind" data-v="insumo">${UI.icon('box', '', 16)} Insumos</button>
      <button class="${kind === 'producto' ? 'on' : ''}" data-act="setInvKind" data-v="producto">${UI.icon('sprout', '', 16)} Producto</button></div>`;
    return `
    <div class="topbar">${back}<div><h1>Inventario</h1><div class="sub">Insumos y producto</div></div>
      <div class="spacer"></div><button class="iconbtn primary" data-act="addInv" aria-label="Nuevo artículo">${UI.icon('plus')}</button></div>
    ${seg}
    <div class="card mt12 list">
      ${list.length ? list.map(i => { const k = Data.kindOf(i.kind);
        return `<div class="lrow tap" data-act="editInv" data-id="${i.id}">
          <span class="lic" style="color:${k.color};background:${UI.hexA(k.color, .12)}">${UI.icon(i.kind === 'producto' ? 'sprout' : 'box', '', 17)}</span>
          <div class="grow"><div class="lt">${UI.esc(i.name)}</div>${i.note ? `<div class="ls">${UI.esc(i.note)}</div>` : ''}</div>
          <div class="lr">${UI.num(i.qty)} <span class="muted2" style="font-weight:700;font-size:12px">${UI.esc(i.unit || '')}</span></div>
        </div>`; }).join('') : UI.empty('box', kind === 'insumo' ? 'Sin insumos' : 'Sin producto', 'Toca + para agregar.')}
    </div>`;
  };
})(window.Views);
