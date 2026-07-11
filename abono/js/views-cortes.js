/* ============ INVERNA · Vista Cortes / Producción ============ */
window.Views = window.Views || {};

(function (V) {
  V.cortes = function () {
    const key = App.period;
    const list = Q.harvestsMonth(key);
    const totalKg = Q.harvestKg(list);
    const byQ = Q.harvestByQuality(key);

    return `
    <div class="topbar">
      <div><h1>Cortes</h1><div class="sub">${UI.monthLabel(key)}</div></div>
      <div class="spacer"></div>
      <button class="iconbtn primary" data-act="addHarvest" aria-label="Nuevo corte">${UI.icon('plus')}</button>
    </div>

    ${Views.monthNav()}

    <div class="total-card green mt12">
      <div><div class="tc-lbl">Producción del mes</div><div class="tc-val">${UI.weight(totalKg)}</div>${totalKg >= 1000 ? `<div class="tc-sub">${UI.num(totalKg)} kg</div>` : ''}</div>
      <div class="tc-ic">${UI.icon('sprout', '', 22)}</div>
    </div>

    ${byQ.length ? `<div class="qrow mt12">${byQ.map(r => `
      <div class="qpill" style="--c:${r.q.color}">
        <div class="qp-lbl">${UI.dot(r.q.color)}${r.q.label}</div>
        <div class="qp-val">${UI.weight(r.kg)}</div>
        <div class="qp-pct">${UI.pct(r.kg, totalKg)}%</div>
      </div>`).join('')}</div>` : ''}

    <div class="card mt12 list">
      ${list.length ? list.map(h => {
        const q = Data.qualOf(h.quality);
        return `<div class="lrow tap" data-act="editHarvest" data-id="${h.id}">
          <span class="lic" style="color:${q.color};background:${UI.hexA(q.color, .12)}">${UI.icon('sprout', '', 17)}</span>
          <div class="grow"><div class="lt">${UI.esc(h.product)}</div><div class="ls">${q.label} · ${UI.date(h.date)}${h.note ? ' · ' + UI.esc(h.note) : ''}${h.photos && h.photos.length ? ` · ${UI.icon('camera', '', 12)} ${h.photos.length}` : ''}</div></div>
          <div class="lr">${UI.weight(h.kg)}</div>
        </div>`;
      }).join('') : UI.empty('sprout', 'Sin cortes este mes', 'Toca + para anotar un corte.')}
    </div>
    `;
  };
})(window.Views);
