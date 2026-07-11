/* ============ ABONO · Vista Resumen (dashboard) ============ */
window.Views = window.Views || {};

(function (V) {
  function monthNav() {
    return `<div class="monthnav">
      <button class="mn-btn" data-act="prevMonth" aria-label="Mes anterior">${UI.icon('chevL')}</button>
      <div class="mn-lbl">${UI.monthLabel(App.period)}</div>
      <button class="mn-btn" data-act="nextMonth" aria-label="Mes siguiente">${UI.icon('chevron')}</button>
    </div>`;
  }
  V.monthNav = monthNav;

  function statTile(ic, label, value, color, sub, act) {
    return `<div class="stat" ${act ? `data-act="${act}"` : ''} style="--c:${color}">
      <div class="stat-ic">${UI.icon(ic, '', 18)}</div>
      <div class="stat-val">${value}</div>
      <div class="stat-lbl">${label}</div>
      ${sub ? `<div class="stat-sub">${sub}</div>` : ''}
    </div>`;
  }

  function recent() {
    const items = [];
    App.db.expenses.forEach(e => { const c = Data.catOf(e.cat); items.push({ date: e.date, icon: c.icon, color: c.color, title: e.concept || c.label, sub: c.label, right: '−' + UI.money(e.amount), rcls: 'neg' }); });
    App.db.harvests.forEach(h => { const q = Data.qualOf(h.quality); items.push({ date: h.date, icon: 'sprout', color: q.color, title: h.product, sub: 'Corte · ' + q.label, right: UI.weight(h.kg), rcls: '' }); });
    App.db.orders.forEach(o => { items.push({ date: o.date, icon: 'cart', color: o.status === 'entregado' ? '#178a4b' : '#c4790f', title: Q.clientName(o.clientId), sub: (o.status === 'entregado' ? 'Venta' : 'Pedido') + ' · ' + o.product, right: UI.money(o.total), rcls: 'pos' }); });
    return items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)).slice(0, 6);
  }

  /* ---------------- landing / pantalla de inicio ---------------- */
  V.landing = function () {
    const feat = (ic, color, t, d) => `<div class="lnd-feat">
      <div class="lnd-ft"><span class="lnd-fi" style="color:${color}">${UI.icon(ic, '', 18)}</span>${t}</div>
      <div class="lnd-fd">${d}</div></div>`;

    const star = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.6 5.7 6.2.6-4.7 4.1 1.4 6.1L12 16.9 6.5 19.6l1.4-6.1L3.2 9.3l6.2-.6Z" fill="#ffce3a"/></svg>`;
    const stars = star.repeat(5);

    const apple = `<svg class="sb-ic" viewBox="0 0 24 24" aria-hidden="true"><path fill="#fff" d="M17.05 12.7c-.03-2.6 2.13-3.85 2.22-3.91-1.21-1.77-3.09-2.01-3.76-2.04-1.6-.16-3.12.94-3.93.94-.81 0-2.06-.92-3.39-.89-1.74.03-3.35 1.01-4.25 2.57-1.81 3.14-.46 7.79 1.3 10.34.86 1.25 1.88 2.65 3.22 2.6 1.29-.05 1.78-.83 3.34-.83 1.55 0 1.99.83 3.35.81 1.38-.02 2.26-1.27 3.11-2.53.98-1.45 1.38-2.85 1.4-2.93-.03-.01-2.69-1.03-2.72-4.09ZM14.79 5.3c.71-.86 1.19-2.05 1.06-3.24-1.02.04-2.26.68-2.99 1.54-.66.76-1.23 1.97-1.08 3.13 1.14.09 2.3-.58 3.01-1.43Z"/></svg>`;
    const play = `<svg class="sb-ic" viewBox="0 0 24 24" aria-hidden="true"><path fill="#00d7fe" d="M3.6 1.8C3.4 2 3.3 2.3 3.3 2.7v18.6c0 .4.1.7.3.9l10.4-10.2L3.6 1.8Z"/><path fill="#00f076" d="M3.6 1.8 14 12l3.2-3.2L5.9.9C5.1.5 4.2.9 3.6 1.8Z"/><path fill="#ffce00" d="M14 12l3.2 3.2 3.5-2c.9-.5.9-1.6 0-2.1l-3.5-2L14 12Z"/><path fill="#ff3b30" d="M3.6 22.2c.6.9 1.5 1.2 2.3.8l11.3-6.6L14 12 3.6 22.2Z"/></svg>`;
    const badge = (ic, top, name) => `<a class="store-badge" data-act="enterApp" role="button">${ic}<span class="sb-tx"><small>${top}</small><b>${name}</b></span></a>`;

    const award = (ic, color, b, s) => `<div class="award"><span class="aw-ic" style="--c:${color}">${UI.icon(ic, '', 21)}</span><b>${b}</b><span>${s}</span></div>`;

    const phone = inner => `<div class="phone"><div class="phone-screen"><span class="phone-notch"></span>${inner}</div></div>`;
    const s1 = `<div class="pm">
      <div class="pm-top">ABONO</div>
      <div class="pm-card"><div class="pm-eyebrow">Utilidad del mes</div><div class="pm-big">$20,800</div>
        <div class="pm-split"><span><i>Ventas</i><b class="pos">$37,920</b></span><span><i>Gastos</i><b class="neg">$17,120</b></span></div></div>
      <div class="pm-grid">
        <div class="pm-card pm-mini"><div class="pm-mv">3.02 t</div><div class="pm-ml">Cortes</div></div>
        <div class="pm-card pm-mini"><div class="pm-mv">$10,320</div><div class="pm-ml">Por cobrar</div></div></div>
      <div class="pm-card">
        <div class="pm-br"><span>Mano de obra</span><b>$7,200</b></div><div class="pm-bar"><span style="width:100%;background:#c4790f"></span></div>
        <div class="pm-br mt"><span>Agroquímicos</span><b>$6,950</b></div><div class="pm-bar"><span style="width:92%;background:#3a92e0"></span></div>
        <div class="pm-br mt"><span>Insumos</span><b>$1,340</b></div><div class="pm-bar"><span style="width:20%;background:#178a4b"></span></div></div>
    </div>`;
    const s2 = `<div class="pm">
      <div class="pm-top">Trabajos</div>
      <div class="pm-card"><div class="pm-eyebrow">Costo de trabajos</div><div class="pm-big" style="color:var(--text)">$3,000</div></div>
      <div class="pm-card">
        <div class="pm-li"><div class="grow"><div class="pm-lt">Tutoreo y bajado</div><span class="pm-bd" style="--c:#3a92e0">En proceso</span></div><b class="neg">$1,800</b></div>
        <div class="pm-li"><div class="grow"><div class="pm-lt">Deshoje sanitario</div><span class="pm-bd" style="--c:#c4790f">Pendiente</span></div></div>
        <div class="pm-li"><div class="grow"><div class="pm-lt">Poda de brotes</div><span class="pm-bd" style="--c:#178a4b">Hecho</span></div><b class="neg">$1,200</b></div>
        <div class="pm-li"><div class="grow"><div class="pm-lt">Revisión de goteros</div><span class="pm-bd" style="--c:#c4790f">Pendiente</span></div></div></div>
    </div>`;
    const s3 = `<div class="pm">
      <div class="pm-top">Cortes</div>
      <div class="pm-card pm-green"><div class="pm-eyebrow">Producción del mes</div><div class="pm-big">3.02 t</div></div>
      <div class="pm-grid">
        <div class="pm-pill" style="--c:#178a4b"><div class="pm-pl">Primera</div><div class="pm-pv">2.81 t</div></div>
        <div class="pm-pill" style="--c:#c4790f"><div class="pm-pl">Segunda</div><div class="pm-pv">210 kg</div></div></div>
      <div class="pm-card">
        <div class="pm-li"><div class="pm-lt grow">Jitomate · Primera</div><b>820 kg</b></div>
        <div class="pm-li"><div class="pm-lt grow">Jitomate · Primera</div><b>760 kg</b></div>
        <div class="pm-li"><div class="pm-lt grow">Pepino · Primera</div><b>540 kg</b></div></div>
    </div>`;

    return `<div class="lnd">
      <section class="lnd-hero">
        <h1 class="lnd-logo">ABONO</h1>
        <div class="lnd-tag">Control de tu invernadero</div>
        <div class="lnd-meta">Gastos · Trabajos · Riego · Producción · Ventas</div>
        <span class="lnd-beta">Beta</span>
        <div class="lnd-ctas">
          <button class="btn btn-primary" data-act="goAuth" data-mode="signup">${UI.icon('sprout')} Crear cuenta gratis</button>
          <button class="btn lnd-cta-ghost" data-act="goAuth" data-mode="login">${UI.icon('user')} Ya tengo cuenta · Iniciar sesión</button>
        </div>

        <div class="lnd-stores">
          ${badge(apple, 'Descárgala en', 'App Store')}
          ${badge(play, 'Disponible en', 'Google Play')}
        </div>
        <div class="lnd-rating"><span class="lr-stars">${stars}</span><span class="lr-txt">4.9 · productores la usan</span></div>

        <div class="lnd-hint">Desliza para conocer más ${UI.icon('chevDown', '', 16)}</div>
      </section>

      <section class="lnd-body">
        <div class="lnd-eyebrow">Así se ve en tu teléfono</div>
        <h2 class="lnd-h2">Fácil de llenar, fácil de leer</h2>
        <div class="lnd-phones"><div class="lnd-phones-track">${phone(s1)}${phone(s2)}${phone(s3)}${phone(s1)}${phone(s2)}${phone(s3)}</div></div>

        <div class="lnd-eyebrow mt24">Todo tu invernadero, en un lugar</div>
        <h2 class="lnd-h2">Lleva el control sin complicarte</h2>
        <div class="lnd-feats">
          ${feat('money', '#c4790f', 'Gastos y compras', 'Agroquímicos, insumos, gasolina, equipos y mano de obra.')}
          ${feat('tool', '#178a4b', 'Trabajos', 'Pendientes, en proceso y hechos, con el costo de cada uno.')}
          ${feat('droplet', '#3a92e0', 'Riego y fertirriego', 'Frecuencia, cantidades de agua y fertirriego aplicado.')}
          ${feat('flask', '#8a6df0', 'Aplicaciones foliares', 'Producto, dosis y costo de cada aplicación.')}
          ${feat('sprout', '#178a4b', 'Cortes por calidad', 'Producción por día en kg o toneladas, por calidad.')}
          ${feat('users', '#c4790f', 'Clientes e inventario', 'Pedidos, ventas, precio de venta, por cobrar e inventario.')}
        </div>

        <div class="lnd-awards-eyebrow">Reconocimientos</div>
        <div class="lnd-awards">
          ${award('checkc', '#178a4b', '100%', 'Funciona sin internet')}
          ${award('shield', '#3a92e0', 'Privado', 'Datos solo en tu equipo')}
          ${award('pin', '#c4790f', 'Morelia', 'Hecho en México')}
        </div>

        <div class="lnd-card2">
          <div class="lnd-c2-t">${UI.icon('trendUp')} Sabe si ganaste</div>
          <p class="lnd-c2-d">ABONO junta tus ventas y tus gastos del mes y te muestra tu <b>utilidad</b> de un vistazo.</p>
        </div>

        <button class="btn btn-primary lnd-cta2" data-act="goAuth" data-mode="signup">${UI.icon('check')} Crear cuenta gratis</button>

        <div class="lnd-foot">
          ${UI.logo(30)}
          <div class="lnd-foot-t">ABONO · v1 · Hecho para tu invernadero</div>
          <div class="lnd-foot-s">${UI.icon('info', '', 13)} Tus datos se guardan solo en este teléfono.</div>
        </div>
      </section>
    </div>`;
  };

  /* ---------------- crear cuenta / iniciar sesión ---------------- */
  V.auth = function () {
    const signup = App.authMode === 'signup';
    const busy = App.authBusy;
    return `<div class="lnd">
      <section class="auth">
        <button class="auth-back" data-act="go" data-route="landing">${UI.icon('back')} Volver</button>
        <div class="auth-card">
          <div class="center mb16">${UI.logo(56)}
            <div class="h2 mt8">${signup ? 'Crea tu cuenta' : 'Inicia sesión'}</div>
            <div class="small muted">${signup ? 'Para guardar y respaldar tu invernadero en la nube.' : 'Entra a tu invernadero desde cualquier teléfono.'}</div></div>
          ${App.authErr ? `<div class="auth-err">${UI.icon('warn', '', 14)} ${App.authErr}</div>` : ''}
          <label class="field"><span class="flbl">Correo</span><input class="input" id="au-email" type="email" inputmode="email" autocomplete="email" placeholder="tucorreo@ejemplo.com"></label>
          <label class="field"><span class="flbl">Contraseña</span><input class="input" id="au-pw" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" placeholder="Mínimo 6 caracteres"></label>
          <button class="btn btn-primary mt8" data-act="doAuth"${busy ? ' disabled' : ''}>${busy ? 'Conectando…' : (UI.icon(signup ? 'sprout' : 'check') + ' ' + (signup ? 'Crear cuenta' : 'Entrar'))}</button>
          ${signup ? '' : `<button class="auth-forgot" data-act="resetPw">¿Olvidaste tu contraseña?</button>`}
          <div class="auth-toggle">${signup ? '¿Ya tienes cuenta?' : '¿Eres nuevo?'} <button data-act="setAuthMode" data-mode="${signup ? 'login' : 'signup'}">${signup ? 'Inicia sesión' : 'Crea una cuenta'}</button></div>
        </div>
        <div class="auth-note">${UI.icon('shield', '', 12)} Tus datos se respaldan en la nube de forma segura.</div>
      </section>
    </div>`;
  };

  V.recovery = function () {
    const busy = App.authBusy;
    return `<div class="lnd">
      <section class="auth">
        <div class="auth-card">
          <div class="center mb16">${UI.logo(56)}
            <div class="h2 mt8">Nueva contraseña</div>
            <div class="small muted">Escribe la nueva contraseña para tu cuenta.</div></div>
          ${App.authErr ? `<div class="auth-err">${UI.icon('warn', '', 14)} ${App.authErr}</div>` : ''}
          <label class="field"><span class="flbl">Nueva contraseña</span><input class="input" id="rec-pw" type="password" autocomplete="new-password" placeholder="Mínimo 6 caracteres"></label>
          <label class="field"><span class="flbl">Repite la contraseña</span><input class="input" id="rec-pw2" type="password" autocomplete="new-password" placeholder="Otra vez la misma"></label>
          <button class="btn btn-primary mt8" data-act="doUpdatePw"${busy ? ' disabled' : ''}>${busy ? 'Guardando…' : (UI.icon('key') + ' Guardar contraseña')}</button>
          <div class="auth-toggle"><button data-act="goAuth" data-mode="login">Cancelar</button></div>
        </div>
        <div class="auth-note">${UI.icon('shield', '', 12)} Tu cuenta y tus datos siguen seguros.</div>
      </section>
    </div>`;
  };

  V.checkEmail = function () {
    const email = App.pendingEmail || 'tu correo';
    return `<div class="lnd">
      <section class="auth">
        <div class="auth-card">
          <div class="center mb16">${UI.logo(56)}
            <div class="h2 mt8">Revisa tu correo</div>
            <div class="small muted">Te enviamos un enlace a <b>${UI.esc(email)}</b> para confirmar tu cuenta. Ábrelo desde este teléfono y entrarás solo.</div></div>
          <button class="btn btn-primary mt8" data-act="resendEmail">${UI.icon('share')} Reenviar correo</button>
          <div class="auth-toggle">¿Ya confirmaste? <button data-act="goAuth" data-mode="login">Inicia sesión</button></div>
        </div>
        <div class="auth-note">${UI.icon('shield', '', 12)} Confirmar tu correo protege tu cuenta.</div>
      </section>
    </div>`;
  };

  V.home = function () {
    const key = App.period;
    const s = Q.monthSummary(key);
    const byCat = Q.expensesByCat(key);
    const maxCat = byCat.length ? byCat[0].total : 0;
    const byProd = Q.harvestByProduct(key);
    const maxProd = byProd.length ? byProd[0].kg : 0;
    const name = App.db.meta.name || 'Mi invernadero';
    const profitColor = s.profit >= 0 ? 'var(--brand)' : 'var(--danger)';

    return `
    <div class="topbar">
      <div><h1>ABONO</h1><div class="sub">${UI.esc(name)}</div></div>
      <div class="spacer"></div>
      <button class="iconbtn" data-act="openSettings" aria-label="Ajustes">${UI.icon('settings')}</button>
    </div>

    ${App.db.cycle && App.db.cycle.crop ? `<div class="cycle-banner" data-act="go" data-route="rentabilidad">
      <span class="cb-ic">${UI.icon('sprout', '', 17)}</span>
      <div class="grow"><div class="cb-t">${UI.esc(App.db.cycle.crop)}</div><div class="cb-s">${App.db.cycle.variety ? 'Semilla ' + UI.esc(App.db.cycle.variety) + ' · ' : ''}${App.db.cycle.start ? UI.date(App.db.cycle.start) + ' – ' + (App.db.cycle.end ? UI.date(App.db.cycle.end) : 'en curso') : 'Define las fechas'}</div></div>
      ${Q.taskCount('pendiente') > 0 ? `<span class="badge warn">${Q.taskCount('pendiente')} pend.</span>` : ''}${UI.icon('chevron', '', 16)}
    </div>` : ''}

    ${monthNav()}

    <div class="balance-card mt12">
      <div class="bc-head"><span class="eyebrow">Utilidad del mes</span></div>
      <div class="bc-big" style="color:${profitColor}">${s.profit < 0 ? '−' : ''}${UI.money(Math.abs(s.profit))}</div>
      <div class="bc-split">
        <div><div class="bc-k">${UI.icon('trendUp')} Ventas</div><div class="bc-v pos">${UI.money(s.sales)}</div></div>
        <div class="bc-div"></div>
        <div><div class="bc-k">${UI.icon('money')} Gastos</div><div class="bc-v neg">${UI.money(s.exp)}</div></div>
      </div>
    </div>

    <div class="stat-grid mt12">
      ${statTile('sprout', 'Cortes del mes', UI.weight(s.kg), '#178a4b', byProd.length ? byProd.length + ' cultivo' + (byProd.length > 1 ? 's' : '') : 'Sin cortes', 'goCortes')}
      ${statTile('wallet', 'Por cobrar', UI.money(s.receivable), '#c4790f', s.receivable > 0 ? 'Toca para ver' : 'Al corriente', 'goReceivable')}
    </div>

    <div class="section-head mt20"><h3 class="h3">Gastos por categoría</h3><button class="link" data-act="go" data-route="gastos">Ver todos</button></div>
    ${byCat.length ? `<div class="card mt8">${byCat.map(r => UI.bar(r.total, maxCat, r.cat.color, `${UI.dot(r.cat.color)}${r.cat.label}`, UI.money(r.total))).join('')}</div>`
      : `<div class="card mt8">${UI.empty('money', 'Sin gastos este mes', 'Registra tu primer gasto con el botón +.')}</div>`}

    <div class="section-head mt20"><h3 class="h3">Producción por cultivo</h3><button class="link" data-act="go" data-route="cortes">Ver cortes</button></div>
    ${byProd.length ? `<div class="card mt8">${byProd.map(r => UI.bar(r.kg, maxProd, '#178a4b', `${UI.icon('sprout', '', 15)} ${UI.esc(r.product)}`, UI.weight(r.kg))).join('')}</div>`
      : `<div class="card mt8">${UI.empty('sprout', 'Sin cortes este mes', 'Anota tu primer corte con el botón +.')}</div>`}

    <div class="section-head mt20"><h3 class="h3">Últimos movimientos</h3></div>
    <div class="card mt8 list">
      ${recent().length ? recent().map(it => `
        <div class="lrow">
          <span class="lic" style="color:${it.color};background:${UI.hexA(it.color, .12)}">${UI.icon(it.icon, '', 17)}</span>
          <div class="grow"><div class="lt">${UI.esc(it.title)}</div><div class="ls">${UI.esc(it.sub)} · ${UI.date(it.date)}</div></div>
          <div class="lr ${it.rcls}">${it.right}</div>
        </div>`).join('')
      : UI.empty('list', 'Aún no hay movimientos', 'Empieza registrando un gasto, corte o venta.')}
    </div>
    `;
  };

  /* ---------------- ajustes ---------------- */
  V.settings = function () {
    const p = App.db.products;
    const u = App.userName || 'Mi cuenta';
    const row = (act, ic, color, label, sub, danger) => `<div class="set-row${danger ? ' danger' : ''}" data-act="${act}">
      <span class="set-ic" style="--c:${color}">${UI.icon(ic, '', 19)}</span>
      <div class="grow"><div class="set-t">${label}</div>${sub ? `<div class="set-s">${sub}</div>` : ''}</div></div>`;
    return `<div class="sheet-head"><div class="h2">Ajustes</div><button class="iconbtn" data-act="closeSheet" aria-label="Cerrar">${UI.icon('x')}</button></div>

      <div class="set-acct">
        <span class="set-av">${UI.initials(u)}</span>
        <div class="grow"><div class="set-acct-n">${UI.esc(u)}</div><div class="set-acct-s">${UI.esc(App.userEmail || 'Sesión iniciada')} · respaldo en la nube</div></div>
      </div>

      <div class="set-grp">Mi invernadero</div>
      <div class="card">
        <span class="flbl">Nombre</span>
        <div class="row gap8"><input class="input" id="set-name" value="${UI.esc(App.db.meta.name)}" style="flex:1"><button class="btn btn-sm btn-primary" data-act="saveName" style="width:auto" aria-label="Guardar">${UI.icon('check')}</button></div>
        <div class="flbl mt12">Cultivos</div>
        <div class="prod-wrap">
          ${p.map(x => `<span class="prod-chip">${UI.esc(x)}<button data-act="delProduct" data-v="${UI.esc(x)}" aria-label="Quitar">${UI.icon('x', '', 13)}</button></span>`).join('') || '<span class="small muted">Aún no hay cultivos.</span>'}
        </div>
        <div class="row gap8 mt8"><input class="input" id="set-prod" placeholder="Agregar cultivo" style="flex:1"><button class="btn btn-sm btn-ghost" data-act="addProduct" style="width:auto" aria-label="Agregar">${UI.icon('plus')}</button></div>
      </div>

      <div class="set-grp">Datos</div>
      <div class="card set-list">
        ${row('exportData', 'download', '#3a92e0', 'Exportar mis datos', 'Guarda un respaldo (.json)')}
        ${row('resetDemo', 'info', '#c4790f', 'Cargar datos de ejemplo', 'Para ver cómo se usa la app')}
      </div>

      <div class="set-grp">Cuenta</div>
      <div class="card set-list">
        ${row('seeLanding', 'home', '#178a4b', 'Ver pantalla de inicio')}
        ${row('logout', 'user', '#6b7d72', 'Cerrar sesión')}
        ${row('wipeAll', 'trash', '#cf3b2e', 'Borrar todo', 'Empieza de cero · no se puede deshacer', true)}
      </div>

      <div class="center mt20">${UI.logo(26)}
        <div class="tiny muted mt4">ABONO · v1 · Hecho para tu invernadero</div>
        <div class="tiny muted2 mt4">${UI.icon('info', '', 11)} Tus datos se guardan solo en este teléfono</div></div>`;
  };
})(window.Views);
