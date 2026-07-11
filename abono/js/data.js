/* ============ INVERNA · Catálogos + datos de ejemplo ============ */
const Data = (() => {
  // ---- categorías de gasto ----
  const CATS = [
    { id: 'agro',     label: 'Agroquímicos', icon: 'flask', color: '#3a92e0' },
    { id: 'insumos',  label: 'Insumos',      icon: 'box',   color: '#178a4b' },
    { id: 'gasolina', label: 'Gasolina',     icon: 'fuel',  color: '#e0703a' },
    { id: 'equipos',  label: 'Equipos',      icon: 'tool',  color: '#8a6df0' },
    { id: 'mano',     label: 'Mano de obra', icon: 'users', color: '#c4790f' },
    { id: 'otros',    label: 'Otros',        icon: 'tag',   color: '#6b7d72' },
  ];
  const catOf = id => CATS.find(c => c.id === id) || CATS[CATS.length - 1];

  // ---- calidad del corte ----
  const QUALITIES = [
    { id: 'primera', label: 'Primera', color: '#178a4b' },
    { id: 'segunda', label: 'Segunda', color: '#c4790f' },
    { id: 'tercera', label: 'Tercera', color: '#6b7d72' },
  ];
  const qualOf = id => QUALITIES.find(q => q.id === id) || QUALITIES[0];

  // ---- etiquetas de bitácora ----
  const LOGTAGS = [
    { id: 'riego',     label: 'Riego',      color: '#3a92e0' },
    { id: 'fumiga',    label: 'Fumigación', color: '#8a6df0' },
    { id: 'siembra',   label: 'Siembra',    color: '#178a4b' },
    { id: 'mante',     label: 'Manten.',    color: '#c4790f' },
    { id: 'incidente', label: 'Incidente',  color: '#cf3b2e' },
    { id: 'nota',      label: 'General',    color: '#6b7d72' },
  ];
  const tagOf = id => LOGTAGS.find(t => t.id === id) || LOGTAGS[LOGTAGS.length - 1];

  // ---- estados de trabajo / tarea ----
  const TASKST = [
    { id: 'pendiente', label: 'Pendiente',  color: '#c4790f' },
    { id: 'proceso',   label: 'En proceso', color: '#3a92e0' },
    { id: 'hecho',     label: 'Hecho',      color: '#178a4b' },
  ];
  const stOf = id => TASKST.find(s => s.id === id) || TASKST[0];

  // ---- tipo de inventario ----
  const INVKINDS = [
    { id: 'insumo',   label: 'Insumo',   color: '#3a92e0' },
    { id: 'producto', label: 'Producto', color: '#178a4b' },
  ];
  const kindOf = id => INVKINDS.find(k => k.id === id) || INVKINDS[0];

  // ---- datos de ejemplo (fechas relativas a hoy) ----
  function seed(db) {
    if (db.seeded) return;
    const D = (back) => { const d = new Date(); d.setDate(d.getDate() - back); return d.toISOString().slice(0, 10); };

    db.expenses = [
      { id: Store.uid(), date: D(2),  cat: 'mano',     concept: 'Sueldos semana (3 jornaleros)', amount: 7200, note: '' },
      { id: Store.uid(), date: D(4),  cat: 'agro',     concept: 'Fungicida + foliar',            amount: 2850, note: 'Lote A' },
      { id: Store.uid(), date: D(6),  cat: 'gasolina', concept: 'Diésel bomba de riego',          amount: 950,  note: '' },
      { id: Store.uid(), date: D(9),  cat: 'insumos',  concept: 'Rafia y clips de tutoreo',       amount: 1340, note: '' },
      { id: Store.uid(), date: D(12), cat: 'equipos',  concept: 'Reparación aspersora',           amount: 680,  note: '' },
      { id: Store.uid(), date: D(15), cat: 'agro',     concept: 'Fertilizante NPK',               amount: 4100, note: '' },
    ];

    db.harvests = [
      { id: Store.uid(), date: D(1),  product: 'Jitomate', kg: 820, quality: 'primera', note: '' },
      { id: Store.uid(), date: D(1),  product: 'Jitomate', kg: 210, quality: 'segunda', note: '' },
      { id: Store.uid(), date: D(5),  product: 'Jitomate', kg: 760, quality: 'primera', note: '' },
      { id: Store.uid(), date: D(8),  product: 'Pepino',   kg: 540, quality: 'primera', note: '' },
      { id: Store.uid(), date: D(12), product: 'Jitomate', kg: 690, quality: 'primera', note: '' },
    ];

    const c1 = { id: Store.uid(), name: 'Central de Abastos', phone: '4431234567', note: 'Bodega 14', createdAt: Date.now() };
    const c2 = { id: Store.uid(), name: 'Verdulería Don Beto', phone: '4439876543', note: '', createdAt: Date.now() };
    const c3 = { id: Store.uid(), name: 'Súper La Huerta',    phone: '', note: 'Pedido fijo lunes', createdAt: Date.now() };
    db.clients = [c1, c2, c3];

    const order = (cid, back, product, kg, price, status, paid) => {
      const total = Math.round(kg * price);
      return { id: Store.uid(), clientId: cid, date: D(back), product, kg, price, total, status, paid, note: '', createdAt: Date.now() - back * 1e6 };
    };
    db.orders = [
      order(c1.id, 1, 'Jitomate', 800, 22, 'entregado', 17600),       // pagado
      order(c2.id, 4, 'Jitomate', 500, 24, 'entregado', 6000),        // por cobrar
      order(c1.id, 5, 'Pepino',   520, 16, 'entregado', 0),           // por cobrar completo
      order(c3.id, 0, 'Jitomate', 600, 23, 'pedido',    0),           // pendiente de entregar
    ];

    db.log = [
      { id: Store.uid(), date: D(0), tag: 'riego',  text: 'Riego por goteo 45 min en lote A y B.', },
      { id: Store.uid(), date: D(2), tag: 'fumiga', text: 'Aplicación preventiva contra mosca blanca.', },
      { id: Store.uid(), date: D(7), tag: 'incidente', text: 'Detectada plaga incipiente en surco 3, bajo control.', },
    ];

    db.notes = [
      { id: Store.uid(), title: 'Pendientes', text: 'Cotizar plástico nuevo para túnel 2.\nLlamar al técnico del pozo.', updatedAt: Date.now() },
    ];

    db.cycle = { id: Store.uid(), crop: 'Jitomate saladet', variety: 'Mosquetero', start: D(60), end: '', name: 'Ciclo actual' };

    db.tasks = [
      { id: Store.uid(), title: 'Tutoreo y bajado de planta', date: D(1), status: 'proceso',   cost: 1800, note: 'Surcos 1-6' },
      { id: Store.uid(), title: 'Deshoje sanitario',          date: D(3), status: 'pendiente', cost: 0,    note: '' },
      { id: Store.uid(), title: 'Poda de brotes',             date: D(6), status: 'hecho',     cost: 1200, note: '' },
      { id: Store.uid(), title: 'Revisión de goteros',        date: D(0), status: 'pendiente', cost: 0,    note: 'Túnel 2' },
    ];

    db.irrigations = [
      { id: Store.uid(), date: D(0), minutes: 45, water: 18, wunit: 'm³', fert: 12, funit: 'L', note: 'Lote A y B' },
      { id: Store.uid(), date: D(2), minutes: 40, water: 16, wunit: 'm³', fert: 10, funit: 'L', note: '' },
      { id: Store.uid(), date: D(4), minutes: 45, water: 18, wunit: 'm³', fert: 14, funit: 'L', note: '' },
    ];

    db.applications = [
      { id: Store.uid(), date: D(2), product: 'Foliar Ca-B', dose: '300 ml/100 L', cost: 950, note: 'Preventivo' },
      { id: Store.uid(), date: D(7), product: 'Bioestimulante', dose: '250 ml/100 L', cost: 1280, note: '' },
    ];

    db.inventory = [
      { id: Store.uid(), name: 'Fertilizante NPK', kind: 'insumo', qty: 8, unit: 'sacos', note: '' },
      { id: Store.uid(), name: 'Foliar Ca-B', kind: 'insumo', qty: 5, unit: 'L', note: '' },
      { id: Store.uid(), name: 'Cajas de cosecha', kind: 'insumo', qty: 120, unit: 'cajas', note: '' },
      { id: Store.uid(), name: 'Jitomate Primera', kind: 'producto', qty: 640, unit: 'kg', note: 'En frío' },
    ];

    db.seeded = true;
  }

  return { CATS, catOf, QUALITIES, qualOf, LOGTAGS, tagOf, TASKST, stOf, INVKINDS, kindOf, seed };
})();
