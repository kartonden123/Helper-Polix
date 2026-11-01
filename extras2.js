/* Polix Helper 1.6: быстрые кнопки в поиске, заметки, рапорт, таймеры, фильтры, настройки, история запросов, горячие клавиши. */
(function () {
  const X = window.PHX, S = window.PH;
  if (!X || !S) return;
  const $ = (s) => document.querySelector(s);
  const { LS, gate, copy, favs, cas, updateCaseBadge, byCode, caseText } = X;

  const css = document.createElement('style');
  css.textContent = `
  .row{grid-template-columns:64px 1fr auto auto!important}
  .qa{display:flex;gap:6px}
  .qb{width:30px;height:30px;border-radius:9px;border:1px solid var(--line);background:rgba(255,255,255,.07);color:#ddd;cursor:pointer;font-size:14px;transition:.15s;padding:0}
  .qb:hover{border-color:rgba(var(--acc-rgb),.7);color:#fff}
  .qb.on{background:rgba(var(--acc-rgb),.22);border-color:rgba(var(--acc-rgb),.7);color:#fff}
  .qb.lock{opacity:.55}
  .fbar{display:flex;gap:6px;flex-wrap:wrap;padding:6px 8px 2px}
  .fchip{background:rgba(255,255,255,.07);border:1px solid var(--line);color:#d6d0da;border-radius:999px;padding:3px 11px;font-size:12px;cursor:pointer}
  .fchip.on{background:rgba(var(--acc-rgb),.2);border-color:rgba(var(--acc-rgb),.6);color:#fff}
  .note-box{width:100%;min-height:64px;resize:vertical;background:rgba(255,255,255,.06);border:1px solid var(--line);border-radius:10px;color:var(--text);font:inherit;font-size:13px;padding:8px 10px;outline:none;user-select:text}
  .note-box:focus{border-color:rgba(var(--acc-rgb),.6)}
  .fld{width:100%;background:rgba(255,255,255,.06);border:1px solid var(--line);border-radius:10px;color:var(--text);font:inherit;font-size:13px;padding:7px 10px;outline:none;margin-bottom:8px;user-select:text}
  .tm-row{display:flex;justify-content:space-between;align-items:center;padding:8px 12px;border-radius:10px;background:rgba(255,255,255,.05);margin-bottom:6px}
  .tm-row b{font-size:18px;font-variant-numeric:tabular-nums}
  .tm-row.done b{color:#ff7b7b}
  .rng{width:100%;accent-color:var(--accent)}
  .set-row{margin:12px 0 4px;font-size:12px;color:var(--muted)}
  .hq{display:flex;gap:6px;flex-wrap:wrap;padding:0 12px 10px}
  `;
  document.head.appendChild(css);

  const prem = (title, hint) => { if (!S.premium) { gate(title, hint); return false; } return true; };

  /* ===== 1. Подсказку убираем, добавляем историю запросов ===== */
  const qHist = () => LS.get('ph_q', []);
  const _render2 = render;
  render = function () {
    _render2();
    if (view === 'home' && !q.value.trim()) {
      const e = list.querySelector('.empty'); if (e) e.remove();
      if (S.premium && qHist().length) {
        list.insertAdjacentHTML('beforeend', '<div class="sec">Недавние запросы</div><div class="hq">' + qHist().map((t) => `<span class="chip" data-hq="${esc(t)}">🔎 ${esc(t)}</span>`).join('') + '</div>');
        list.querySelectorAll('[data-hq]').forEach((c) => (c.onclick = (ev) => { ev.stopPropagation(); q.value = c.dataset.hq; render(); q.focus(); }));
      }
    }
    addFilters();
  };
  // запоминаем запрос, когда пользователь открыл статью
  const _openArt2 = openArt;
  openArt = function (a) {
    _openArt2(a);
    const t = q.value.trim();
    if (S.premium && t && t.length > 1) { const h = qHist().filter((x) => x !== t); h.unshift(t); LS.set('ph_q', h.slice(0, 8)); }
    addNote(a);
  };

  /* ===== 2. Фильтры результатов (Premium) ===== */
  const FILTERS = [['all', 'Все'], ['w45', '⭐4–5'], ['rec', 'Судимость'], ['fine', 'Со штрафом'], ['pr', 'С тюрьмой']];
  let curF = 'all';
  const pass = (a) => curF === 'all' || (curF === 'w45' && a.wanted >= 4) || (curF === 'rec' && a.record) || (curF === 'fine' && a.fine) || (curF === 'pr' && a.prison);
  function applyFilter() {
    list.querySelectorAll('.row').forEach((r) => { const a = results[+r.dataset.i]; r.style.display = !a || pass(a) ? '' : 'none'; });
    list.querySelectorAll('.fchip').forEach((c) => c.classList.toggle('on', c.dataset.f === curF));
  }
  function addFilters() {
    if (view !== 'home' || !q.value.trim() || !results.length || list.querySelector('.fbar')) return;
    const bar = document.createElement('div'); bar.className = 'fbar';
    bar.innerHTML = FILTERS.map(([k, l]) => `<span class="fchip${k === curF ? ' on' : ''}" data-f="${k}">${l}${S.premium || k === 'all' ? '' : ' 🔒'}</span>`).join('');
    list.insertBefore(bar, list.firstChild);
    bar.querySelectorAll('.fchip').forEach((c) => (c.onclick = (ev) => {
      ev.stopPropagation();
      if (c.dataset.f !== 'all' && !prem('Фильтры результатов', 'Показывать только статьи с розыском 4–5, судимостью, штрафом или тюрьмой.')) return;
      curF = c.dataset.f; applyFilter();
    }));
    applyFilter();
  }

  /* ===== 3. Быстрые кнопки «в избранное» и «в дело» в каждой строке ===== */
  function decorate() {
    list.querySelectorAll('.row:not([data-qa])').forEach((r) => {
      r.dataset.qa = '1';
      const a = results[+r.dataset.i]; if (!a) return;
      const isF = favs().includes(a.code), isC = cas().includes(a.code), lk = S.premium ? '' : ' lock';
      const box = document.createElement('div'); box.className = 'qa';
      box.innerHTML = `<button class="qb${isF ? ' on' : ''}${lk}" data-k="f" title="В избранное (Ctrl+D)">${isF ? '⭐' : '☆'}</button><button class="qb${isC ? ' on' : ''}${lk}" data-k="c" title="В дело (Ctrl+B)">${isC ? '✔' : '＋'}</button>`;
      r.appendChild(box);
      box.querySelectorAll('.qb').forEach((b) => (b.onclick = (ev) => { ev.stopPropagation(); quick(a, b.dataset.k, b); }));
    });
  }
  function quick(a, k, btn) {
    if (!S.premium) return gate(k === 'f' ? 'Избранное' : 'Калькулятор дела', 'Добавляйте статьи прямо из поиска.');
    if (k === 'f') { const f = favs(); const on = f.includes(a.code); LS.set('ph_fav', on ? f.filter((c) => c !== a.code) : [a.code, ...f]); if (btn) { btn.classList.toggle('on', !on); btn.textContent = on ? '☆' : '⭐'; } }
    else { const c = cas(); const on = c.includes(a.code); LS.set('ph_case', on ? c.filter((x) => x !== a.code) : [...c, a.code]); updateCaseBadge(); if (btn) { btn.classList.toggle('on', !on); btn.textContent = on ? '＋' : '✔'; } }
  }
  new MutationObserver(decorate).observe(list, { childList: true, subtree: true });
  decorate();

  /* ===== 4. Горячие клавиши: Ctrl+D избранное, Ctrl+B в дело, Ctrl+1..9 открыть n-й результат ===== */
  document.addEventListener('keydown', (e) => {
    if (!e.ctrlKey || view !== 'home' || !results.length) return;
    const vis = [...list.querySelectorAll('.row')].filter((r) => r.style.display !== 'none');
    const rowSel = list.querySelector('.row.sel') || vis[0];
    const a = rowSel ? results[+rowSel.dataset.i] : null;
    const k = e.key.toLowerCase();
    if (k === 'd' && a) { e.preventDefault(); quick(a, 'f', rowSel.querySelector('[data-k=f]')); }
    else if (k === 'b' && a) { e.preventDefault(); quick(a, 'c', rowSel.querySelector('[data-k=c]')); }
    else if (/^[1-9]$/.test(e.key)) { const r = vis[+e.key - 1]; if (r) { e.preventDefault(); openArt(results[+r.dataset.i]); } }
  });

  /* ===== 5. Заметки к статьям (Premium) ===== */
  const notes = () => LS.get('ph_notes', {});
  function addNote(a) {
    const det = list.querySelector('.det'); if (!det) return;
    if (!S.premium) { det.insertAdjacentHTML('beforeend', '<div class="note" style="margin-top:12px">📝 Заметки к статьям: функция Premium 🔒</div>'); return; }
    det.insertAdjacentHTML('beforeend', `<div class="lbl" style="margin-top:14px;color:var(--muted);font-size:11px">📝 МОЯ ЗАМЕТКА</div><textarea class="note-box" id="noteBox" placeholder="Например: «звонить в департамент перед задержанием»">${esc(notes()[a.code] || '')}</textarea>`);
    const nb = $('#noteBox'); let t;
    nb.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { const n = notes(); if (nb.value.trim()) n[a.code] = nb.value; else delete n[a.code]; LS.set('ph_notes', n); }, 400); });
    nb.addEventListener('keydown', (e) => e.stopPropagation());
  }

  /* ===== 6. Рапорт из дела (Premium) ===== */
  window.PHX_caseExtra = function (items) {
    if (!items.length) return;
    const det = list.querySelector('.det'); if (!det) return;
    det.insertAdjacentHTML('beforeend', `<div class="sec" style="padding-left:0">Рапорт</div><input class="fld" id="rpWho" placeholder="Нарушитель (имя, статик)"><input class="fld" id="rpWhere" placeholder="Место и время (необязательно)"><div class="actions"><button class="abtn" id="rpTxt">📄 Рапорт текстом</button><button class="abtn" id="rpDs">💬 Для Discord</button></div>`);
    ['#rpWho', '#rpWhere'].forEach((s) => $(s).addEventListener('keydown', (e) => e.stopPropagation()));
    const build = (md) => {
      const who = $('#rpWho').value.trim() || '—', where = $('#rpWhere').value.trim() || '—';
      const w = Math.max(0, ...items.map((a) => a.wanted || 0)), pr = items.reduce((s, a) => s + (a.prison || 0), 0), fn = items.reduce((s, a) => s + X.fineNum(a), 0);
      const arts = items.map((a) => `ст. ${a.code.replace(/^(ДК|АК) /, '')} — ${a.title || a.codeTitle || ''}`).join(md ? '\n> ' : '\n');
      if (md) return `**Рапорт о задержании**\n**Нарушитель:** ${who}\n**Место/время:** ${where}\n**Статьи:**\n> ${arts}\n**Розыск:** ${w ? '⭐'.repeat(w) : '—'} | **Залог:** ${w ? BAIL[w] : '—'}\n**Срок:** ${pr ? 'до ' + pr + ' мес.' : '—'} | **Штраф:** ${fn ? 'до $' + fn : '—'}\n**Судимость:** ${items.some((a) => a.record) ? 'да' : 'нет'}`;
      return `РАПОРТ О ЗАДЕРЖАНИИ\nНарушитель: ${who}\nМесто/время: ${where}\nСтатьи:\n${arts}\nРозыск: ${w ? '⭐'.repeat(w) : '—'}; залог: ${w ? BAIL[w] : '—'}\nСрок: ${pr ? 'до ' + pr + ' мес.' : '—'}; штраф: ${fn ? 'до $' + fn : '—'}\nСудимость: ${items.some((a) => a.record) ? 'да' : 'нет'}`;
    };
    $('#rpTxt').onclick = () => copy(build(false), $('#rpTxt'));
    $('#rpDs').onclick = () => copy(build(true), $('#rpDs'));
  };

  /* ===== 7. Таймеры (Premium) ===== */
  let timers = LS.get('ph_timers', []).filter((t) => t.end > Date.now() - 60000);
  const saveT = () => LS.set('ph_timers', timers);
  function beep() { try { const c = new (window.AudioContext || window.webkitAudioContext)(); [0, 0.25, 0.5].forEach((d) => { const o = c.createOscillator(), g = c.createGain(); o.frequency.value = 880; g.gain.value = 0.15; o.connect(g); g.connect(c.destination); o.start(c.currentTime + d); o.stop(c.currentTime + d + 0.15); }); } catch (e) {} }
  const fmt = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
  function timerBadge() { const n = timers.filter((t) => t.end > Date.now()).length; const b = $('#timerN'); if (b) { b.textContent = n; b.style.display = n ? '' : 'none'; } }
  function openTimers() {
    if (!prem('Таймеры', 'Отсчёт времени для задержаний, КД и ожиданий: звуковой сигнал по окончании.')) return;
    view = 'memo'; panel.classList.add('on');
    const draw = () => {
      if (!$('#tmList')) return;
      $('#tmList').innerHTML = timers.length ? timers.map((t, i) => `<div class="tm-row${t.end <= Date.now() ? ' done' : ''}"><span>${esc(t.name)}</span><b>${t.end <= Date.now() ? 'ВЫШЛО' : fmt(t.end - Date.now())}</b><button class="xbtn" data-i="${i}">✕</button></div>`).join('') : '<div class="empty">Нет запущенных таймеров</div>';
      $('#tmList').querySelectorAll('.xbtn').forEach((b) => (b.onclick = () => { timers.splice(+b.dataset.i, 1); saveT(); timerBadge(); draw(); }));
    };
    list.innerHTML = backBtn() + `<div class="det"><h2>⏱ Таймеры</h2><div class="actions">${[5, 10, 15, 30, 60].map((m) => `<button class="abtn" data-m="${m}">${m} мин</button>`).join('')}</div>
      <div style="display:flex;gap:8px;margin-bottom:12px"><input class="fld" id="tmMin" type="number" min="1" max="600" placeholder="Своё время, минут" style="margin:0"><button class="abtn" id="tmGo">▶ Старт</button></div><div id="tmList"></div></div>`;
    $('#bk').onclick = goBack; $('#cnt').textContent = '';
    $('#tmMin').addEventListener('keydown', (e) => e.stopPropagation());
    const add = (m) => { m = Math.min(600, Math.max(1, +m || 0)); if (!m) return; timers.push({ name: m + ' мин', end: Date.now() + m * 60000, fired: false }); saveT(); timerBadge(); draw(); };
    list.querySelectorAll('[data-m]').forEach((b) => (b.onclick = () => add(b.dataset.m)));
    $('#tmGo').onclick = () => add($('#tmMin').value);
    draw(); const iv = setInterval(() => { if (!$('#tmList')) return clearInterval(iv); draw(); }, 1000);
  }
  setInterval(() => {
    let ch = false;
    timers.forEach((t) => { if (t.end <= Date.now() && !t.fired) { t.fired = true; ch = true; beep(); const h = $('#tabhint'); if (h) { h.innerHTML = '⏱ Таймер «' + esc(t.name) + '» вышел'; setTimeout(() => { h.innerHTML = 'Alt+Q — показать / скрыть · <b>Esc</b> — назад'; }, 8000); } } });
    if (ch) saveT(); timerBadge();
  }, 1000);

  /* ===== 8. Настройки (Premium): тема, размер текста, прозрачность, положение ===== */
  function hexRgb(h) { const m = /^#?([0-9a-f]{6})$/i.exec(h || ''); if (!m) return null; const n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function openSettings() {
    view = 'memo'; panel.classList.add('on');
    const cur = LS.get('ph_theme', 'scarlet'), zoom = LS.get('ph_zoom', 100), op = LS.get('ph_op', 100), neon = !!LS.get('ph_neon', false), blurOn = !!LS.get('ph_snap', false), acc = LS.get('ph_acc', '#ff4d6d');
    const ver = (window.overlay && window.overlay.version) || '';
    const tierName = S.admin ? 'Главный Администратор' : S.ultra ? 'Ультра Премиум' : S.premium ? 'Premium' : 'Обычный доступ';
    const lock = (t) => `<div class="set-row lockrow">🔒 ${t}</div>`;
    const premBlock = S.premium ? `
      <div class="set-sec">⭐ Premium</div>
      <div class="set-row">Тема</div><div class="sw">${Object.keys(X.THEMES).map((k) => `<button class="swb${k === cur && !(S.ultra && LS.get('ph_accOn', false)) ? ' on' : ''}" data-t="${k}"><i style="background:${X.THEMES[k][0]}"></i>${X.THEMES[k][2]}</button>`).join('')}</div>
      <div class="set-row">Прозрачность фона: <b id="ov">${op}%</b> <small>(текст остаётся чётким)</small></div><input class="rng" id="or" type="range" min="25" max="100" step="5" value="${op}">
      <div class="set-row">Положение окна</div><div class="actions"><button class="abtn" data-p="left">◀ Слева</button><button class="abtn" data-p="center">● По центру</button><button class="abtn" data-p="right">Справа ▶</button></div>`
      : lock('Темы, прозрачность фона и положение окна доступны с Premium.');
    const ultraBlock = S.ultra ? `
      <div class="set-sec">💎 Ультра Премиум</div>
      <div class="actions"><button class="abtn${blurOn ? ' on' : ''}" id="blurWin">${blurOn ? '✔ Размытие фона' : '🌫 Размытие фона'}</button><button class="abtn${neon ? ' on' : ''}" id="blurBtn">${neon ? '✔ Неоновая рамка' : '✨ Неоновая рамка'}</button></div>
      <div class="set-row">Свой цвет оформления <input type="color" id="accPick" value="${esc(acc)}" style="vertical-align:middle;margin-left:8px;width:42px;height:26px;border:0;background:none;cursor:pointer"> <button class="mini" id="accOn">${LS.get('ph_accOn', false) ? '✔ включён' : 'применить'}</button></div>
      <div class="set-row"><small>Размытие берётся со снимка экрана в момент открытия меню. ИИ: 10 вопросов в день.</small></div>`
      : (S.premium ? lock('Ультра Премиум: неоновая рамка, свой цвет, ИИ на 10 вопросов в день. Выдаёт администрация.') : '');
    list.innerHTML = backBtn() + `<div class="det"><h2>⚙ Настройки</h2>
      <div class="about"><img src="logo.png" alt=""><div><b>Polix Helper <span style="color:var(--accent)">by KATO</span></b><small>Версия ${esc(ver)} · ${esc(tierName)}</small></div></div>
      <div class="actions"><button class="abtn" id="updChk">🔄 Проверить обновления</button><button class="abtn" id="autoBtn">🚀 Автозапуск с Windows…</button><button class="abtn" id="ntBtn">🔔 Проверить уведомления</button><button class="abtn${LS.get('ph_autohide', false) ? ' on' : ''}" id="ahBtn">${LS.get('ph_autohide', false) ? '✔ Скрывать при клике мимо' : 'Скрывать при клике мимо'}</button></div><div class="set-row" id="updRes"></div>
      <div class="set-row">Размер текста: <b id="zv">${zoom}%</b></div><input class="rng" id="zr" type="range" min="80" max="140" step="5" value="${zoom}">
      ${premBlock}${ultraBlock}</div>`;
    $('#bk').onclick = goBack; $('#cnt').textContent = '';
    if (window.overlay.autostartGet) window.overlay.autostartGet().then((on) => { const b = $('#autoBtn'); if (b) { b.textContent = on ? '✔ Автозапуск с Windows включён' : '🚀 Включить автозапуск с Windows'; b.classList.toggle('on', !!on); b.onclick = () => window.overlay.autostartSet(!on).then(() => openSettings()); } });
    $('#updChk').onclick = async () => {
      const r = $('#updRes'), b = $('#updChk'); b.disabled = true; r.textContent = 'Проверяю…';
      const res = window.overlay.checkUpdate ? await window.overlay.checkUpdate() : { state: 'error' };
      b.disabled = false;
      const M = { latest: '✅ У вас последняя версия ' + (res.current || ver), available: '⬇ Доступна версия ' + res.version + '. Карточка с кнопкой «Скачать» вверху меню.', downloading: '⬇ Версия ' + res.version + ' скачивается…', ready: '✅ Версия ' + res.version + ' скачана. Нажмите «Установить» вверху меню.', dev: 'Режим разработки: проверка недоступна.', error: '⚠ Не удалось проверить. Проверьте интернет.' };
      r.textContent = M[res.state] || M.error;
    };
    $('#ahBtn').onclick = () => { const on = !LS.get('ph_autohide', false); LS.set('ph_autohide', on); if (window.overlay.setAutohide) window.overlay.setAutohide(on); openSettings(); };
    $('#ntBtn').onclick = () => { if (window.overlay.notifyTest) window.overlay.notifyTest(); };
    $('#zr').oninput = (e) => { LS.set('ph_zoom', +e.target.value); $('#zv').textContent = e.target.value + '%'; applyZoom(); };
    if (!S.premium) return;
    list.querySelectorAll('.swb').forEach((b) => (b.onclick = () => { LS.set('ph_theme', b.dataset.t); LS.set('ph_accOn', false); X.applyTheme(b.dataset.t); openSettings(); }));
    $('#or').oninput = (e) => { LS.set('ph_op', +e.target.value); $('#ov').textContent = e.target.value + '%'; applyLook(); };
    list.querySelectorAll('[data-p]').forEach((b) => (b.onclick = () => { LS.set('ph_pos', b.dataset.p); applyPos(); }));
    if (!S.ultra) return;
    $('#blurWin').onclick = () => { LS.set('ph_snap', !blurOn); if (window.overlay.setBlur) window.overlay.setBlur(!blurOn); openSettings(); };
    $('#blurBtn').onclick = () => { LS.set('ph_neon', !LS.get('ph_neon', false)); applyLook(); openSettings(); };
    $('#accPick').oninput = (e) => { LS.set('ph_acc', e.target.value); if (LS.get('ph_accOn', false)) X.applyTheme(); };
    $('#accOn').onclick = () => { LS.set('ph_accOn', !LS.get('ph_accOn', false)); X.applyTheme(); openSettings(); };
  }
  const applyZoom = () => { document.body.style.zoom = String(LS.get('ph_zoom', 100) / 100); };
  // прозрачность касается только фона панелей, текст всегда непрозрачный
  const applyLook = () => {
    const a = S.premium ? Math.min(1, Math.max(0.25, LS.get('ph_op', 100) / 100)) : 1;
    document.documentElement.style.setProperty('--glass', `linear-gradient(180deg,rgba(34,31,39,${a}) 0%,rgba(22,20,26,${a}) 100%)`);
    document.documentElement.style.setProperty('--solid', `rgba(27,23,29,${Math.max(a, 0.5)})`);
    document.documentElement.classList.toggle('neon', !!(S.ultra && LS.get('ph_neon', false)));
  };
  window.PHX_applyLook = applyLook;
  const applyPos = () => { if (window.overlay && window.overlay.setPosition) window.overlay.setPosition(LS.get('ph_pos', 'center')); };

  /* ===== Кнопки в панели ===== */
  const th = $('#themeBtn'); if (th) th.remove();
  const imm = $('#immBtn');
  if (imm) {
    imm.insertAdjacentHTML('beforebegin', '<button class="ib" id="timerBtn" title="Таймеры (Premium)">⏱<i class="badge" id="timerN" style="display:none"></i></button><button class="ib" id="setBtn" title="Настройки (Premium)">⚙</button>');
    $('#timerBtn').onclick = openTimers; $('#setBtn').onclick = openSettings;
  }
  timerBadge();

  /* ===== Админ-панель: выдача и снятие Premium, в том числе по Discord ID ===== */
  openAdmin = async function () {
    view = 'memo'; panel.classList.add('on');
    list.innerHTML = backBtn() + '<div class="det"><h2>👑 Кто пользуется</h2><p class="t">Загрузка…</p></div>';
    $('#bk').onclick = goBack; $('#cnt').textContent = '';
    const d = await window.overlay.adminUsers();
    if (!d || d.error) { list.innerHTML = backBtn() + `<div class="det"><h2>👑 Кто пользуется</h2><p class="t">${esc((d && d.error) || 'Ошибка')}</p></div>`; $('#bk').onclick = goBack; return; }
    const isMe = (u) => u.id === (S.id || '');
    list.innerHTML = backBtn() + `<div class="det"><h2>👑 Кто пользуется</h2>
      <div class="adm-top"><div><small>Всего</small><b>${d.total}</b></div><div><small>В сети</small><b style="color:#3ddc84">${d.online}</b></div><div><small>За 24 часа</small><b>${d.day}</b></div><div><small>За 7 дней</small><b>${d.week}</b></div></div>
      <div style="display:flex;gap:8px;margin-bottom:6px"><input class="fld" id="gId" placeholder="Discord ID человека" style="margin:0"><button class="abtn" id="gOn">⭐ Выдать</button><button class="abtn" id="gOff">Снять</button></div>
      <div id="gMsg" style="font-size:12px;min-height:18px;margin-bottom:10px;color:var(--muted)"></div>
      ${d.users.map((u) => `<div class="adm-row"><span class="dot${u.online ? ' on' : ''}"></span><span>${esc(u.name)}${u.premium ? '<span class="prem-tag">Premium</span>' : ''}<br><small>${esc(u.id)}</small></span><small>v${esc(u.version || '?')}</small><small>${ago(u.last_seen)}</small>${isMe(u) ? '<small>∞ всегда</small>' : `<button class="prem-btn${u.premium ? ' on' : ''}" data-id="${esc(u.id)}" data-p="${u.premium ? 1 : 0}">${u.premium ? '⭐ снять' : '☆ выдать'}</button>`}</div>`).join('') || '<p class="t">Пока никого.</p>'}</div>`;
    $('#bk').onclick = goBack;
    $('#gId').addEventListener('keydown', (e) => e.stopPropagation());
    const msg = (t, ok) => { const m = $('#gMsg'); m.textContent = t; m.style.color = ok ? '#8ee6a8' : '#ff9d9d'; };
    const set = async (id, on, again) => {
      if (!/^\d{5,25}$/.test(id)) return msg('Введите Discord ID: только цифры (ПКМ по человеку → Копировать ID).', false);
      msg('Отправляю…', true);
      const r = await window.overlay.adminPremium(id, on);
      if (!r || r.error) return msg('Ошибка: ' + ((r && r.error) || 'нет ответа от сервера'), false);
      msg(on ? 'Premium выдан: ' + id + '. У человека включится при следующем открытии меню.' : 'Premium снят: ' + id, true);
      if (again) setTimeout(openAdmin, 700);
    };
    $('#gOn').onclick = () => set($('#gId').value.trim(), true, true);
    $('#gOff').onclick = () => set($('#gId').value.trim(), false, true);
    list.querySelectorAll('.prem-btn').forEach((b) => (b.onclick = () => set(b.dataset.id, b.dataset.p !== '1', true)));
  };

  /* ===== Premium обновляется при каждом открытии меню и раз в 5 минут ===== */
  function refreshStatus() {
    if (!(window.overlay && window.overlay.authState)) return;
    window.overlay.authState().then((s) => {
      const was = S.premium; S.premium = !!(s && s.premium); S.admin = !!(s && s.admin);
      X.applyTheme(LS.get('ph_theme', 'scarlet'));
      const b = $('#admBtn'); if (b) { b.style.display = S.admin ? '' : 'none'; if (S.admin) b.onclick = openAdmin; }
      if (was !== S.premium && view === 'home' && !q.value.trim()) render();
    });
  }
  if (window.overlay && window.overlay.onShow) window.overlay.onShow(refreshStatus);
  setInterval(refreshStatus, 5 * 60 * 1000);
  const b0 = $('#admBtn'); if (b0) b0.onclick = openAdmin;
  applyZoom(); applyLook(); applyPos();
  render();
})();
