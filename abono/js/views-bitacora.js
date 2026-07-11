/* ============ INVERNA · Vista Bitácora + Notas ============ */
window.Views = window.Views || {};

(function (V) {
  V.bitacora = function () {
    const seg = App.bitSeg;
    const head = `
    <div class="topbar">
      <div><h1>Bitácora</h1><div class="sub">Registro diario y notas</div></div>
      <div class="spacer"></div>
      <button class="iconbtn primary" data-act="${seg === 'notas' ? 'addNote' : 'addLog'}" aria-label="Agregar">${UI.icon('plus')}</button>
    </div>

    <div class="seg mt8">
      <button class="${seg === 'bitacora' ? 'on' : ''}" data-act="setBitSeg" data-v="bitacora">${UI.icon('book', '', 16)} Bitácora</button>
      <button class="${seg === 'notas' ? 'on' : ''}" data-act="setBitSeg" data-v="notas">${UI.icon('note', '', 16)} Notas</button>
    </div>`;

    if (seg === 'notas') return head + notesList();
    return head + logList();
  };

  function logList() {
    const list = Q.byDateDesc(App.db.log);
    if (!list.length) return `<div class="card mt12">${UI.empty('book', 'Bitácora vacía', 'Anota riegos, fumigaciones, incidencias… Toca +.')}</div>`;
    return `<div class="card mt12 list">${list.map(l => {
      const t = Data.tagOf(l.tag);
      return `<div class="lrow tap top" data-act="editLog" data-id="${l.id}">
        <span class="lic" style="color:${t.color};background:${UI.hexA(t.color, .12)}">${UI.dot(t.color)}</span>
        <div class="grow"><div class="row between"><span class="lt">${t.label}</span><span class="ls">${UI.date(l.date)}</span></div>
          <div class="ls log-text">${UI.esc(l.text)}</div>${l.photos && l.photos.length ? `<div class="ls">${UI.icon('camera', '', 12)} ${l.photos.length} foto${l.photos.length > 1 ? 's' : ''}</div>` : ''}</div>
      </div>`;
    }).join('')}</div>`;
  }

  function notesList() {
    const list = App.db.notes.slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    if (!list.length) return `<div class="card mt12">${UI.empty('note', 'Sin notas', 'Guarda pendientes, ideas o recordatorios. Toca +.')}</div>`;
    return `<div class="notes-grid mt12">${list.map(n => `
      <div class="note-card tap" data-act="editNote" data-id="${n.id}">
        <div class="note-t">${UI.esc(n.title || 'Sin título')}</div>
        <div class="note-x">${UI.esc(n.text || '').slice(0, 220)}</div>
      </div>`).join('')}</div>`;
  }
})(window.Views);
