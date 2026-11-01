/* Режим покера (♠): калькулятор шансов Texas Hold'em. Доступен Главному Администратору и роли ДПВ. */
(function () {
  const S = window.PH, X = window.PHX;
  if (!S || !X) return;
  const $ = (s) => document.querySelector(s);
  const RANKS = '23456789TJQKA';
  const SUITS = [['♠', '#e6e1e9'], ['♥', '#ff5c75'], ['♦', '#ff8a5c'], ['♣', '#7be0a0']];   // 0..3
  const cname = (c) => RANKS[(c >> 2) - 0] + SUITS[c & 3][0];   // c = rankIndex*4 + suit
  const rankOf = (c) => c >> 2, suitOf = (c) => c & 3;

  /* ---------- оценка руки: 7 карт -> число (больше = сильнее) ---------- */
  function score7(cards) {
    const rc = new Array(13).fill(0), sc = [[], [], [], []];
    for (const c of cards) { rc[rankOf(c)]++; sc[suitOf(c)].push(rankOf(c)); }
    const straightHigh = (mask) => {   // mask: 13 бит по рангам
      for (let hi = 12; hi >= 4; hi--) { let ok = true; for (let k = 0; k < 5; k++) if (!(mask >> (hi - k) & 1)) { ok = false; break; } if (ok) return hi; }
      if ((mask & 1) && (mask >> 1 & 1) && (mask >> 2 & 1) && (mask >> 3 & 1) && (mask >> 12 & 1)) return 3;   // колесо A-2-3-4-5
      return -1;
    };
    let fs = -1; for (let s = 0; s < 4; s++) if (sc[s].length >= 5) fs = s;
    const pack = (cat, arr) => { let v = cat; for (let i = 0; i < 5; i++) v = v * 16 + (arr[i] === undefined ? 0 : arr[i] + 1); return v; };
    if (fs >= 0) {
      let m = 0; for (const r of sc[fs]) m |= 1 << r;
      const h = straightHigh(m); if (h >= 0) return pack(8, [h]);
    }
    const quads = [], trips = [], pairs = [], singles = [];
    for (let r = 12; r >= 0; r--) { if (rc[r] === 4) quads.push(r); else if (rc[r] === 3) trips.push(r); else if (rc[r] === 2) pairs.push(r); else if (rc[r] === 1) singles.push(r); }
    if (quads.length) { const k = [...trips, ...pairs, ...singles].sort((a, b) => b - a)[0]; return pack(7, [quads[0], k]); }
    if (trips.length && (trips.length > 1 || pairs.length)) { const p = trips.length > 1 ? Math.max(trips[1], pairs[0] === undefined ? -1 : pairs[0]) : pairs[0]; return pack(6, [trips[0], p]); }
    if (fs >= 0) return pack(5, sc[fs].sort((a, b) => b - a).slice(0, 5));
    let m = 0; for (let r = 0; r < 13; r++) if (rc[r]) m |= 1 << r;
    const h = straightHigh(m); if (h >= 0) return pack(4, [h]);
    if (trips.length) return pack(3, [trips[0], ...singles.concat(pairs).sort((a, b) => b - a).slice(0, 2)]);
    if (pairs.length >= 2) { const rest = [...pairs.slice(2), ...singles].sort((a, b) => b - a); return pack(2, [pairs[0], pairs[1], rest[0]]); }
    if (pairs.length === 1) return pack(1, [pairs[0], ...singles.slice(0, 3)]);
    return pack(0, singles.slice(0, 5));
  }

  /* ---------- шанс выигрыша: Монте-Карло ---------- */
  function equity(hole, board, opps, sims) {
    const used = new Set([...hole, ...board]);
    const deck = []; for (let c = 0; c < 52; c++) if (!used.has(c)) deck.push(c);
    let win = 0, tie = 0;
    const need = 5 - board.length;
    for (let i = 0; i < sims; i++) {
      // частичная перетасовка
      const take = need + opps * 2;
      for (let k = 0; k < take; k++) { const j = k + ((Math.random() * (deck.length - k)) | 0); const t = deck[k]; deck[k] = deck[j]; deck[j] = t; }
      const full = board.concat(deck.slice(0, need));
      const mine = score7(hole.concat(full));
      let best = -1, cnt = 0;
      for (let o = 0; o < opps; o++) {
        const sc = score7([deck[need + o * 2], deck[need + o * 2 + 1]].concat(full));
        if (sc > best) { best = sc; cnt = 1; } else if (sc === best) cnt++;
      }
      if (mine > best) win++; else if (mine === best) tie += 1 / (cnt + 1);
    }
    return (win + tie) / sims;
  }

  /* ---------- интерфейс ---------- */
  const css = document.createElement('style');
  css.textContent = `
  .pk-slots{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:8px 0}
  .pk-slot{width:46px;height:60px;border-radius:9px;border:1px dashed var(--line);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:17px;background:rgba(255,255,255,.04);cursor:pointer}
  .pk-slot.f{border-style:solid;background:rgba(255,255,255,.1)}
  .pk-slot.cur{border-color:var(--accent);box-shadow:0 0 10px rgba(var(--acc-rgb),.5)}
  .pk-grid{display:grid;grid-template-columns:20px repeat(13,1fr);gap:3px;margin:10px 0}
  .pk-grid b{font-size:15px;display:flex;align-items:center;justify-content:center}
  .pk-grid button{background:rgba(255,255,255,.07);border:1px solid var(--line);color:#eee;border-radius:6px;padding:4px 0;font:inherit;font-size:12px;cursor:pointer}
  .pk-grid button:hover{border-color:var(--accent)}.pk-grid button:disabled{opacity:.2;cursor:default}
  .pk-in{display:flex;gap:10px;flex-wrap:wrap;margin:6px 0}.pk-in label{font-size:12px;color:var(--muted);display:flex;flex-direction:column;gap:3px}
  .pk-in input{width:92px;background:rgba(255,255,255,.07);border:1px solid var(--line);border-radius:8px;color:#fff;padding:5px 8px;font:inherit;user-select:text}
  .pk-res{margin-top:12px;padding:14px;border-radius:14px;background:rgba(255,255,255,.06);border:1px solid var(--line)}
  .pk-res .big{font-size:30px;font-weight:800}.pk-adv{font-size:17px;font-weight:700;margin-top:4px}
  .pk-bar{height:8px;border-radius:6px;background:rgba(255,255,255,.1);overflow:hidden;margin:8px 0}.pk-bar i{display:block;height:100%;background:var(--accent)}
  `;
  document.head.appendChild(css);

  let hole = [], board = [], opps = 2, pot = 0, call = 0, res = null;
  const isUsed = (c) => hole.includes(c) || board.includes(c);
  const fmt = (c) => `<span style="color:${SUITS[suitOf(c)][1]}">${RANKS[rankOf(c)]}${SUITS[suitOf(c)][0]}</span>`;

  function advice(eq) {
    const o = opps, fair = 1 / (o + 1);
    if (call <= 0) {
      if (eq > Math.max(0.62, fair + 0.25)) return ['Ставка / рейз', '#3ddc84'];
      if (eq > fair + 0.08) return ['Чек или небольшая ставка', '#ffd36b'];
      return ['Чек', '#c9c2cf'];
    }
    const need = call / (pot + call);
    if (eq > Math.max(0.65, need + 0.25)) return ['Рейз', '#3ddc84'];
    if (eq > need + 0.03) return ['Колл', '#ffd36b'];
    return ['Фолд', '#ff7b7b'];
  }

  function draw() {
    const root = $('#pkRoot'); if (!root) return;
    const slot = (arr, i, lab) => `<div class="pk-slot${arr[i] !== undefined ? ' f' : ''}" data-s="${lab}${i}">${arr[i] !== undefined ? fmt(arr[i]) : ''}</div>`;
    let grid = '';
    for (let s = 0; s < 4; s++) {
      grid += `<b style="color:${SUITS[s][1]}">${SUITS[s][0]}</b>`;
      for (let r = 0; r < 13; r++) { const c = r * 4 + s; grid += `<button data-c="${c}"${isUsed(c) ? ' disabled' : ''}>${RANKS[r]}</button>`; }
    }
    root.innerHTML = `<div class="set-row">Твои карты</div><div class="pk-slots">${slot(hole, 0, 'h')}${slot(hole, 1, 'h')}<span style="width:14px"></span>${[0, 1, 2, 3, 4].map((i) => slot(board, i, 'b')).join('')}</div>
      <div class="pk-grid">${grid}</div>
      <div class="pk-in"><label>Оппонентов<input id="pkO" type="number" min="1" max="8" value="${opps}"></label><label>Банк<input id="pkP" type="number" min="0" value="${pot || ''}"></label><label>Нужно доплатить<input id="pkC" type="number" min="0" value="${call || ''}"></label></div>
      <div class="actions"><button class="abtn on" id="pkGo">♠ Посчитать</button><button class="abtn" id="pkClr">Сбросить</button><button class="abtn" id="pkShot">📷 Снимок экрана</button></div>
      <div id="pkOut">${res ? resHtml() : ''}</div>`;
    root.querySelectorAll('.pk-grid button').forEach((b) => (b.onclick = () => { const c = +b.dataset.c; if (hole.length < 2) hole.push(c); else if (board.length < 5) board.push(c); res = null; draw(); }));
    root.querySelectorAll('.pk-slot.f').forEach((s) => (s.onclick = () => { const k = s.dataset.s; const i = +k.slice(1); if (k[0] === 'h') hole.splice(i, 1); else board.splice(i, 1); res = null; draw(); }));
    ['pkO', 'pkP', 'pkC'].forEach((id) => $('#' + id).addEventListener('keydown', (e) => e.stopPropagation()));
    $('#pkGo').onclick = go; $('#pkClr').onclick = () => { hole = []; board = []; res = null; draw(); };
    $('#pkShot').onclick = async () => {
      const o = $('#pkOut'); o.innerHTML = '<p class="t">Делаю снимок…</p>';
      const r = window.overlay.pokerShot ? await window.overlay.pokerShot() : null;
      o.innerHTML = `<p class="t">${r && r.path ? 'Снимок сохранён: ' + esc(r.path) : 'Не удалось сделать снимок'}</p>`;
    };
  }
  function resHtml() {
    const [txt, col] = advice(res.eq);
    return `<div class="pk-res"><div class="big">${(res.eq * 100).toFixed(1)}%</div><div class="pk-bar"><i style="width:${(res.eq * 100).toFixed(0)}%"></i></div>
      <div class="pk-adv" style="color:${col}">${txt}</div>
      <p class="t" style="margin:6px 0 0;font-size:12px">${res.need !== null ? `Нужный шанс по pot odds: ${(res.need * 100).toFixed(1)}%. ` : ''}Оценка против ${opps} случайн. рук, ${res.sims} симуляций. Подсказка математическая и не учитывает поведение игроков.</p></div>`;
  }
  function go() {
    if (hole.length < 2) { $('#pkOut').innerHTML = '<p class="t">Выберите две свои карты.</p>'; return; }
    if (board.length === 1 || board.length === 2) { $('#pkOut').innerHTML = '<p class="t">На столе должно быть 0, 3, 4 или 5 карт.</p>'; return; }
    opps = Math.min(8, Math.max(1, +$('#pkO').value || 1)); pot = Math.max(0, +$('#pkP').value || 0); call = Math.max(0, +$('#pkC').value || 0);
    const sims = 6000;
    res = { eq: equity(hole, board, opps, sims), sims, need: call > 0 ? call / (pot + call) : null };
    $('#pkOut').innerHTML = resHtml();
  }
  function openPoker() {
    if (!S.poker) return X.gate('Режим покера', 'Доступен Главному Администратору и роли ДПВ.');
    view = 'memo'; panel.classList.add('on');
    list.innerHTML = backBtn() + `<div class="det"><h2>♠ Режим покера</h2><p class="t">Texas Hold'em: выберите карты, число оппонентов, банк и ставку, и хелпер посчитает шанс и подскажет действие.</p><div id="pkRoot"></div></div>`;
    $('#bk').onclick = goBack; $('#cnt').textContent = '';
    draw();
  }

  const imm = $('#immBtn');
  if (imm && !$('#pokerBtn')) {
    imm.insertAdjacentHTML('beforebegin', '<button class="ib" id="pokerBtn" title="Режим покера (Alt+P)" style="display:none">♠</button>');
    $('#pokerBtn').onclick = openPoker;
  }
  document.addEventListener('keydown', (e) => { if (e.altKey && (e.key === 'p' || e.key === 'з') && S.poker) { e.preventDefault(); openPoker(); } });
  window.PHX_poker = { score7, equity };
})();
