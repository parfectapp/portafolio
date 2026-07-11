/* ============ INVERNA · Vista Clientes / Pedidos / Por cobrar ============ */
window.Views = window.Views || {};

(function (V) {
  function orderBadge(o) {
    if (o.status === 'pedido') return `<span class="badge amber">${UI.icon('clock', '', 12)} Pedido</span>`;
    const bal = Q.balance(o);
    if (bal > 0) return `<span class="badge warn">Por cobrar ${UI.money(bal)}</span>`;
    return `<span class="badge green">${UI.icon('check', '', 12)} Pagado</span>`;
  }

  function orderRow(o, showClient) {
    return `<div class="lrow tap" data-act="openOrder" data-id="${o.id}">
      <span class="lic" style="color:${o.status === 'entregado' ? '#178a4b' : '#c4790f'};background:${UI.hexA(o.status === 'entregado' ? '#178a4b' : '#c4790f', .12)}">${UI.icon('cart', '', 17)}</span>
      <div class="grow">
        <div class="lt">${showClient ? UI.esc(Q.clientName(o.clientId)) : UI.esc(o.product)}</div>
        <div class="ls">${showClient ? UI.esc(o.product) + ' · ' : ''}${UI.weight(o.kg)} · ${UI.date(o.date)}</div>
        <div class="mt4">${orderBadge(o)}</div>
      </div>
      <div class="lr pos">${UI.money(o.total)}</div>
    </div>`;
  }
  V.orderRow = orderRow;

  V.clientes = function () {
    const seg = App.cliSeg;
    const recv = Q.receivableTotal();
    const sales = Q.salesMonth(App.period);

    const head = `
    <div class="topbar">
      <div><h1>Clientes</h1><div class="sub">Pedidos, ventas y cobranza</div></div>
      <div class="spacer"></div>
      <button class="iconbtn primary" data-act="${seg === 'clientes' ? 'addClient' : 'addOrder'}" aria-label="Agregar">${UI.icon('plus')}</button>
    </div>

    <div class="stat-grid mt8">
      <div class="stat" style="--c:#c4790f" data-act="goReceivable"><div class="stat-ic">${UI.icon('wallet', '', 18)}</div><div class="stat-val">${UI.money(recv)}</div><div class="stat-lbl">Por cobrar</div></div>
      <div class="stat" style="--c:#178a4b"><div class="stat-ic">${UI.icon('trendUp', '', 18)}</div><div class="stat-val">${UI.money(sales)}</div><div class="stat-lbl">Ventas · ${UI.monthLabel(App.period).split(' ')[0]}</div></div>
    </div>

    <div class="seg mt12">
      <button class="${seg === 'clientes' ? 'on' : ''}" data-act="setCliSeg" data-v="clientes">${UI.icon('users', '', 16)} Clientes</button>
      <button class="${seg === 'pedidos' ? 'on' : ''}" data-act="setCliSeg" data-v="pedidos">${UI.icon('cart', '', 16)} Pedidos</button>
    </div>`;

    if (seg === 'clientes') return head + clientesList();
    return head + pedidosList();
  };

  function clientesList() {
    const cs = App.db.clients.slice().sort((a, b) => Q.clientBalance(b.id) - Q.clientBalance(a.id) || a.name.localeCompare(b.name));
    if (!cs.length) return `<div class="card mt12">${UI.empty('users', 'Sin clientes todavía', 'Toca + para agregar tu primer cliente.')}</div>`;
    return `<div class="card mt12 list">${cs.map(c => {
      const bal = Q.clientBalance(c.id);
      const n = Q.clientOrders(c.id).length;
      return `<div class="lrow tap" data-act="openClient" data-id="${c.id}">
        <span class="lic" style="color:#178a4b;background:${UI.hexA('#178a4b', .12)}">${UI.initials(c.name)}</span>
        <div class="grow"><div class="lt">${UI.esc(c.name)}</div><div class="ls">${n} pedido${n === 1 ? '' : 's'}${c.phone ? ' · ' + UI.esc(c.phone) : ''}</div></div>
        ${bal > 0 ? `<div class="lr"><span class="badge warn">${UI.money(bal)}</span></div>` : `<div class="lr muted2">${UI.icon('chevron', '', 16)}</div>`}
      </div>`;
    }).join('')}</div>`;
  }

  function pedidosList() {
    const fil = App.pedFilter;
    let list = Q.ordersDesc();
    if (fil === 'pedido') list = list.filter(o => o.status === 'pedido');
    else if (fil === 'cobrar') list = list.filter(Q.isReceivable);

    const chip = (id, label) => `<button class="chip ${fil === id ? 'on' : ''}" data-act="setPedFilter" data-v="${id}">${label}</button>`;
    const chips = `<div class="chip-scroll mt12">${chip('todos', 'Todos')}${chip('pedido', 'Pendientes')}${chip('cobrar', 'Por cobrar')}</div>`;

    return chips + `<div class="card mt8 list">${list.length ? list.map(o => orderRow(o, true)).join('')
      : UI.empty('cart', fil === 'cobrar' ? '¡Nada por cobrar!' : fil === 'pedido' ? 'Sin pedidos pendientes' : 'Sin pedidos', fil === 'todos' ? 'Toca + para registrar un pedido o venta.' : '')}</div>`;
  }

  /* ---------------- sheet de cliente ---------------- */
  V.clientSheet = function (id) {
    const c = Q.clientById(id); if (!c) return '';
    const orders = Q.clientOrders(id);
    const bal = Q.clientBalance(id);
    const sold = Q.clientTotalSold(id);
    const tel = (c.phone || '').replace(/\D/g, '');
    return `<div class="sheet-head"><div><div class="h2">${UI.esc(c.name)}</div>${c.note ? `<div class="small muted">${UI.esc(c.note)}</div>` : ''}</div>
      <button class="iconbtn" data-act="editClient" data-id="${c.id}">${UI.icon('edit')}</button></div>
      ${tel ? `<div class="btn-row mt8">
        <a class="btn btn-ghost" href="https://wa.me/52${tel}" target="_blank" rel="noopener">${UI.icon('wapp')} WhatsApp</a>
        <a class="btn btn-ghost" href="tel:${tel}">${UI.icon('phone')} Llamar</a></div>` : ''}
      <div class="paybox mt12">
        <div class="row between"><span>Total vendido</span><b>${UI.money(sold)}</b></div>
        <div class="row between saldo"><span>Por cobrar</span><b class="${bal > 0 ? 'warn-tx' : ''}">${UI.money(bal)}</b></div>
      </div>
      <div class="flbl mt16">Pedidos</div>
      <div class="list">${orders.length ? orders.map(o => Views.orderRow(o, false)).join('') : `<div class="small muted py8">Sin pedidos aún.</div>`}</div>
      <button class="btn btn-primary mt12" data-act="addOrderFor" data-id="${c.id}">${UI.icon('plus')} Nuevo pedido</button>
      <button class="btn btn-ghost mt8" data-act="closeSheet">Cerrar</button>`;
  };

  /* ---------------- sheet de pedido / venta ---------------- */
  V.orderSheet = function (id) {
    const o = App.db.orders.find(x => x.id === id); if (!o) return '';
    const bal = Q.balance(o);
    return `<div class="sheet-head"><div><div class="h2">${UI.esc(Q.clientName(o.clientId))}</div><div class="small muted">${UI.date(o.date)} · ${UI.esc(o.product)}</div></div>
      <button class="iconbtn" data-act="editOrder" data-id="${o.id}">${UI.icon('edit')}</button></div>

      <div class="paybox mt8">
        <div class="row between"><span class="muted">Cantidad</span><b>${UI.weight(o.kg)}</b></div>
        <div class="row between"><span class="muted">Precio</span><b>${UI.money(o.price)}/kg</b></div>
        <div class="row between"><span>Total</span><b>${UI.money(o.total)}</b></div>
        <div class="row between"><span>Pagado</span><b>${UI.money(o.paid || 0)}</b></div>
        <div class="row between saldo"><span>Saldo</span><b class="${bal > 0 ? 'warn-tx' : ''}">${UI.money(bal)}</b></div>
      </div>
      ${o.note ? `<p class="small muted mt8">${UI.icon('note', '', 14)} ${UI.esc(o.note)}</p>` : ''}
      <div class="mt12">${orderBadge(o)}</div>

      ${o.status === 'pedido' ? `<button class="btn btn-primary mt12" data-act="markDelivered" data-id="${o.id}">${UI.icon('checkc')} Marcar como entregado</button>` : ''}
      ${bal > 0 ? `<button class="btn ${o.status === 'pedido' ? 'btn-ghost' : 'btn-primary'} mt8" data-act="openPayment" data-id="${o.id}">${UI.icon('coin')} Registrar pago</button>` : ''}
      <button class="btn btn-ghost mt8" data-act="closeSheet">Cerrar</button>`;
  };
})(window.Views);
