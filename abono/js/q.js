/* ============ INVERNA · Consultas y agregaciones ============ */
const Q = (() => {
  const db = () => App.db;

  const inMonth = (arr, key) => arr.filter(x => UI.monthKey(x.date) === key);
  const byDateDesc = arr => arr.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  // ---- gastos ----
  const sum = (arr, f) => arr.reduce((s, x) => s + (f ? f(x) : x), 0);
  function expensesMonth(key) { return byDateDesc(inMonth(db().expenses, key)); }
  function expensesTotal(arr) { return sum(arr, x => x.amount); }
  function expensesByCat(key) {
    const m = inMonth(db().expenses, key);
    return Data.CATS.map(c => ({ cat: c, total: sum(m.filter(e => e.cat === c.id), x => x.amount) }))
      .filter(r => r.total > 0).sort((a, b) => b.total - a.total);
  }

  // ---- cortes / producción ----
  function harvestsMonth(key) { return byDateDesc(inMonth(db().harvests, key)); }
  function harvestKg(arr) { return sum(arr, x => x.kg); }
  function harvestByQuality(key) {
    const m = inMonth(db().harvests, key);
    return Data.QUALITIES.map(q => ({ q, kg: sum(m.filter(h => h.quality === q.id), x => x.kg) })).filter(r => r.kg > 0);
  }
  function harvestByProduct(key) {
    const m = inMonth(db().harvests, key);
    const map = {};
    m.forEach(h => { map[h.product] = (map[h.product] || 0) + h.kg; });
    return Object.entries(map).map(([product, kg]) => ({ product, kg })).sort((a, b) => b.kg - a.kg);
  }

  // ---- clientes / pedidos / ventas ----
  const balance = o => Math.max(0, (o.total || 0) - (o.paid || 0));
  const isReceivable = o => o.status === 'entregado' && balance(o) > 0;
  function ordersDesc() { return byDateDesc(db().orders); }
  function pendingOrders() { return byDateDesc(db().orders.filter(o => o.status === 'pedido')); }
  function salesMonth(key) { return sum(inMonth(db().orders.filter(o => o.status === 'entregado'), key), x => x.total); }
  function receivableTotal() { return sum(db().orders.filter(isReceivable), balance); }
  function clientOrders(cid) { return byDateDesc(db().orders.filter(o => o.clientId === cid)); }
  function clientBalance(cid) { return sum(db().orders.filter(o => o.clientId === cid && isReceivable(o)), balance); }
  function clientTotalSold(cid) { return sum(db().orders.filter(o => o.clientId === cid && o.status === 'entregado'), x => x.total); }
  const clientById = cid => db().clients.find(c => c.id === cid);
  const clientName = cid => { const c = clientById(cid); return c ? c.name : 'Cliente'; };

  // ---- trabajos / tareas ----
  function tasksAll() { return byDateDesc(db().tasks); }
  function tasksBy(status) { return byDateDesc(db().tasks.filter(t => t.status === status)); }
  function taskCount(status) { return db().tasks.filter(t => t.status === status).length; }
  function tasksCost() { return sum(db().tasks, x => x.cost || 0); }

  // ---- riegos ----
  function irrigMonth(key) { return byDateDesc(inMonth(db().irrigations, key)); }
  function waterMonth(key) { return sum(inMonth(db().irrigations, key), x => x.water || 0); }
  function fertMonth(key) { return sum(inMonth(db().irrigations, key), x => x.fert || 0); }

  // ---- aplicaciones foliares ----
  function appsMonth(key) { return byDateDesc(inMonth(db().applications, key)); }
  function appsCost(key) { return sum(inMonth(db().applications, key), x => x.cost || 0); }

  // ---- inventario ----
  function invBy(kind) { return db().inventory.filter(i => i.kind === kind).slice().sort((a, b) => a.name.localeCompare(b.name)); }

  // ---- resumen de un ciclo agrícola (ciclos son de duración variable: se acota por fecha inicio–fin) ----
  const inCycle = (arr, cy) => { const s = (cy && cy.start) || '0000-01-01', e = (cy && cy.end) || '9999-12-31'; return arr.filter(x => x.date >= s && x.date <= e); };
  function cycleSummary(cycle) {
    const cy = cycle || db().cycle || {};
    const expenses = inCycle(db().expenses, cy), harvests = inCycle(db().harvests, cy);
    const tasks = inCycle(db().tasks, cy), applications = inCycle(db().applications, cy);
    const orders = inCycle(db().orders, cy);
    const gastos = sum(expenses, x => x.amount);
    const trabajos = sum(tasks, x => x.cost || 0);
    const aplic = sum(applications, x => x.cost || 0);
    const costs = gastos + trabajos + aplic;
    const kg = sum(harvests, x => x.kg);
    const entregados = orders.filter(o => o.status === 'entregado');
    const sales = sum(entregados, x => x.total);
    const kgSold = sum(entregados, x => x.kg);
    const byQ = Data.QUALITIES.map(q => ({ q, kg: sum(harvests.filter(h => h.quality === q.id), x => x.kg) })).filter(r => r.kg > 0);
    return {
      gastos, trabajos, aplic, costs, kg, byQ, sales, kgSold,
      profit: sales - costs,
      costPerKg: kg > 0 ? costs / kg : 0,
      avgPrice: kgSold > 0 ? sales / kgSold : 0,
      margin: sales > 0 ? (sales - costs) / sales : 0,
      receivable: receivableTotal(),
    };
  }

  // ---- resumen del mes ----
  function monthSummary(key) {
    const exp = expensesTotal(inMonth(db().expenses, key));
    const sales = salesMonth(key);
    const kg = harvestKg(inMonth(db().harvests, key));
    return { exp, sales, kg, profit: sales - exp, receivable: receivableTotal() };
  }

  return {
    db, inMonth, byDateDesc, sum,
    expensesMonth, expensesTotal, expensesByCat,
    harvestsMonth, harvestKg, harvestByQuality, harvestByProduct,
    balance, isReceivable, ordersDesc, pendingOrders, salesMonth, receivableTotal,
    clientOrders, clientBalance, clientTotalSold, clientById, clientName,
    tasksAll, tasksBy, taskCount, tasksCost,
    irrigMonth, waterMonth, fertMonth, appsMonth, appsCost, invBy,
    cycleSummary, monthSummary, inCycle,
  };
})();
