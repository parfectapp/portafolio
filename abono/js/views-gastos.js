/* ============ INVERNA · Vista Gastos ============ */
window.Views = window.Views || {};

(function (V) {
  V.gastos = function () {
    const key = App.period;
    const all = Q.expensesMonth(key);
    const cat = App.gastoCat;
    const list = cat ? all.filter(e => e.cat === cat) : all;
    const total = Q.expensesTotal(list);

    const chip = (id, label, on) => `<button class="chip ${on ? 'on' : ''}" data-act="setGastoCat" data-v="${id}">${label}</button>`;
    const chips = `<div class="chip-scroll mt8">
      ${chip('', 'Todos', !cat)}
      ${Data.CATS.map(c => `<button class="chip ${cat === c.id ? 'on' : ''}" data-act="setGastoCat" data-v="${c.id}">${UI.dot(c.color)}${c.label}</button>`).join('')}
    </div>`;

    return `
    <div class="topbar">
      <div><h1>Gastos</h1><div class="sub">${UI.monthLabel(key)}</div></div>
      <div class="spacer"></div>
      <button class="iconbtn primary" data-act="addExpense" aria-label="Nuevo gasto">${UI.icon('plus')}</button>
    </div>

    ${Views.monthNav()}

    <div class="total-card mt12">
      <div><div class="tc-lbl">${cat ? Data.catOf(cat).label : 'Total del mes'}</div><div class="tc-val">${UI.money(total)}</div></div>
      <div class="tc-ic">${UI.icon('money', '', 22)}</div>
    </div>

    ${chips}

    <div class="card mt12 list">
      ${list.length ? list.map(e => {
        const c = Data.catOf(e.cat);
        return `<div class="lrow tap" data-act="editExpense" data-id="${e.id}">
          <span class="lic" style="color:${c.color};background:${UI.hexA(c.color, .12)}">${UI.icon(c.icon, '', 17)}</span>
          <div class="grow"><div class="lt">${UI.esc(e.concept || c.label)}</div><div class="ls">${c.label} · ${UI.date(e.date)}${e.note ? ' · ' + UI.esc(e.note) : ''}${e.photos && e.photos.length ? ` · ${UI.icon('camera', '', 12)} ${e.photos.length}` : ''}</div></div>
          <div class="lr neg">−${UI.money(e.amount)}</div>
        </div>`;
      }).join('') : UI.empty('money', cat ? 'Sin gastos en esta categoría' : 'Sin gastos este mes', 'Toca + para registrar uno.')}
    </div>
    `;
  };
})(window.Views);
