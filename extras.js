/* Polix Helper: дополнительные функции.
   Бесплатно: копирование статьи. Premium: калькулятор дела, избранное, история, темы. */
(function () {
  const $ = (s) => document.querySelector(s);
  const LS = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  const S = window.PH = { premium: false, admin: false };
  const THEMES = {
    scarlet: ['#ff4d6d', '255,77,109', 'Алый'],
    blue: ['#4d9dff', '77,157,255', 'Синий'],
    green: ['#3ddc84', '61,220,132', 'Зелёный'],
    purple: ['#a66bff', '166,107,255', 'Фиолетовый'],
    gold: ['#ffc24d', '255,194,77', 'Золотой']
  };

  const css = document.createElement('style');
  css.textContent = `
  .actions{display:flex;gap:8px;margin:0 0 14px;flex-wrap:wrap}
  .abtn{background:rgba(255,255,255,.07);border:1px solid var(--line);color:#e6e1e9;border-radius:10px;padding:6px 12px;font:inherit;font-size:12.5px;cursor:pointer;transition:.18s}
  .abtn:hover{border-color:rgba(var(--acc-rgb),.6);color:#fff}
  .abtn.on{background:rgba(var(--acc-rgb),.18);border-color:rgba(var(--acc-rgb),.6);color:#fff}
  .abtn.lock{opacity:.75}
  .badge{position:absolute;top:-5px;right:-5px;background:var(--accent);color:#fff;border-radius:9px;min-width:17px;height:17px;font:700 10px/17px "Segoe UI";text-align:center;padding:0 4px;font-style:normal}
  .ib{position:relative}
  .case-row{display:grid;grid-template-columns:56px 1fr auto 26px;gap:10px;align-items:center;padding:8px 10px;border-radius:10px}
  .case-row:nth-child(odd){background:rgba(255,255,255,.04)}
  .case-row b{font-size:14px}
  .case-row span{font-size:12.5px;color:#d6d0da}
  .case-row small{color:var(--muted);font-size:11.5px;white-space:nowrap}
  .xbtn{background:none;border:0;color:var(--muted);cursor:pointer;font-size:14px}.xbtn:hover{color:#ff6b6b}
  .total{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:12px 0}
  .total div{background:rgba(255,255,255,.06);border:1px solid var(--line);border-radius:12px;padding:9px 12px}
  .total small{display:block;color:var(--muted);font-size:11px}.total b{font-size:16px}
  .total .wide{grid-column:1/-1}
  .sw{display:flex;gap:10px;flex-wrap:wrap;margin:6px 0 4px}
  .swb{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.07);border:2px solid transparent;color:#eee;border-radius:12px;padding:8px 14px;font:inherit;cursor:pointer}
  .swb i{width:16px;height:16px;border-radius:50%;display:inline-block}
  .swb.on{border-color:var(--accent)}
  .prem-btn{background:rgba(255,255,255,.07);border:1px solid var(--line);border-radius:8px;color:var(--muted);padding:2px 9px;font-size:11px;cursor:pointer}
  .prem-btn.on{background:rgba(255,196,60,.16);border-color:rgba(255,196,60,.5);color:#ffd36b}
  .prem-tag{display:inline-block;background:rgba(255,196,60,.16);color:#ffd36b;border-radius:6px;padding:0 6px;font-size:10px;margin-left:6px;vertical-align:middle}
  .adm-row{grid-template-columns:12px 1fr auto auto auto!important}
  `;
  document.head.appendChild(css);

  function applyTheme(name) {
    const t = THEMES[S.premium ? name : 'scarlet'] || THEMES.scarlet;
    const r = document.documentElement.style;
    r.setProperty('--accent', t[0]); r.setProperty('--acc-rgb', t[1]);
  }

  function copy(text, btn) {
    const ok = () => { if (btn) { const o = btn.textContent; btn.textContent = '✔ Скопировано'; setTimeout(() => { btn.textContent = o; }, 1300); } };
    try { navigator.clipboard.writeText(text).then(ok, fallback); } catch (e) { fallback(); }
    function fallback() {
      const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} ta.remove(); ok();
    }
  }

  function gate(title, hint) {
    view = 'memo'; panel.classList.add('on');
    list.innerHTML = backBtn() + `<div class="det"><h2>🔒 ${esc(title)}</h2><p class="t">Это функция <b>Premium</b>. ${esc(hint || '')}</p><p class="t">Premium выдаёт автор хелпера. Напишите в канале «предложение-для-улучшение-хелпера».</p></div>`;
    $('#bk').onclick = goBack; $('#cnt').textContent = '';
  }

  const byCode = (c) => ITEMS.find((x) => x.code === c);
  const fineNum = (a) => parseInt(String(a.fine || '').replace(/\D/g, ''), 10) || 0;

  /* ----- Избранное и история ----- */
  const favs = () => LS.get('ph_fav', []);
  const hist = () => LS.get('ph_hist', []);
  const cas = () => LS.get('ph_case', []);
  function updateCaseBadge() { const n = cas().length; const b = $('#caseN'); if (b) { b.textContent = n; b.style.display = n ? '' : 'none'; } }

  function listOf(codes, title, emptyMsg) {
    view = 'memo'; panel.classList.add('on');
    const arr = codes.map(byCode).filter(Boolean);
    results = arr; last = { items: arr, snips: [], words: [] }; sel = 0;
    list.innerHTML = backBtn() + `<div class="sec">${esc(title)}</div>` + (arr.length ? arr.map((a, i) => row(a, i, [])).join('') : `<div class="empty">${esc(emptyMsg)}</div>`);
    $('#bk').onclick = goBack; $('#cnt').textContent = arr.length ? arr.length + ' статей' : '';
    view = 'memo-list';
  }

  /* ----- Калькулятор дела ----- */
  function caseText(items) {
    const w = Math.max(0, ...items.map((a) => a.wanted || 0));
    const pr = items.reduce((s, a) => s + (a.prison || 0), 0);
    const fn = items.reduce((s, a) => s + fineNum(a), 0);
    return `Дело: ст. ${items.map((a) => shortCode(a)).join(', ')}\nРозыск: ${w ? '⭐'.repeat(w) : '—'}\nТюрьма: ${pr ? 'до ' + pr + ' мес.' : '—'}\nШтраф: ${fn ? 'до $' + fn : '—'}\nЗалог: ${w ? BAIL[w] : '—'}\nСудимость: ${items.some((a) => a.record) ? 'да' : 'нет'}`;
  }
  function openCase() {
    if (!S.premium) return gate('Калькулятор дела', 'Складывает статьи в одно дело: розыск, срок, штрафы, залог и судимость.');
    view = 'memo'; panel.classList.add('on');
    const items = cas().map(byCode).filter(Boolean);
    const w = Math.max(0, ...items.map((a) => a.wanted || 0));
    const pr = items.reduce((s, a) => s + (a.prison || 0), 0);
    const fn = items.reduce((s, a) => s + fineNum(a), 0);
    list.innerHTML = backBtn() + `<div class="det"><h2>🧮 Дело</h2><p class="t">Добавляйте статьи кнопкой «➕ В дело» в карточке статьи.</p>
      ${items.length ? items.map((a) => `<div class="case-row"><b>${esc(shortCode(a))}</b><span>${esc((a.title || a.codeTitle || '').slice(0, 70))}</span><small>${a.wanted ? '⭐'.repeat(a.wanted) : ''} ${a.prison ? a.prison + ' мес.' : ''}</small><button class="xbtn" data-r="${esc(a.code)}" title="Убрать">✕</button></div>`).join('') : '<div class="empty">В деле пока ничего нет</div>'}
      ${items.length ? `<div class="total"><div><small>Розыск (макс.)</small><b>${w ? '⭐'.repeat(w) : '—'}</b></div><div><small>Залог</small><b>${w ? BAIL[w] : '—'}</b></div><div><small>Тюрьма (сумма)</small><b>${pr ? 'до ' + pr + ' мес.' : '—'}</b></div><div><small>Штрафы (сумма)</small><b>${fn ? 'до $' + fn : '—'}</b></div><div class="wide"><small>Судимость</small><b style="color:${items.some((a) => a.record) ? '#ff7b7b' : '#8ee6a8'}">${items.some((a) => a.record) ? 'ДА' : 'нет'}</b></div></div>
      <div class="actions"><button class="abtn" id="cpCase">📋 Скопировать итог</button><button class="abtn" id="clCase">🗑 Очистить дело</button></div>` : ''}</div>`;
    $('#bk').onclick = goBack; $('#cnt').textContent = '';
    list.querySelectorAll('.xbtn').forEach((b) => (b.onclick = () => { LS.set('ph_case', cas().filter((c) => c !== b.dataset.r)); updateCaseBadge(); openCase(); }));
    const cp = $('#cpCase'); if (cp) cp.onclick = () => copy(caseText(items), cp);
    const cl = $('#clCase'); if (cl) cl.onclick = () => { LS.set('ph_case', []); updateCaseBadge(); openCase(); };
  }

  /* ----- Темы ----- */
  function openThemes() {
    if (!S.premium) return gate('Темы оформления', 'Выбор акцентного цвета меню.');
    view = 'memo'; panel.classList.add('on');
    const cur = LS.get('ph_theme', 'scarlet');
    list.innerHTML = backBtn() + `<div class="det"><h2>🎨 Тема</h2><p class="t">Выберите цвет оформления.</p><div class="sw">${Object.keys(THEMES).map((k) => `<button class="swb${k === cur ? ' on' : ''}" data-t="${k}"><i style="background:${THEMES[k][0]}"></i>${THEMES[k][2]}</button>`).join('')}</div></div>`;
    $('#bk').onclick = goBack; $('#cnt').textContent = '';
    list.querySelectorAll('.swb').forEach((b) => (b.onclick = () => { LS.set('ph_theme', b.dataset.t); applyTheme(b.dataset.t); openThemes(); }));
  }

  /* ----- Кнопки в панели ----- */
  const imm = $('#immBtn');
  if (imm) {
    imm.insertAdjacentHTML('beforebegin', '<button class="ib" id="caseBtn" title="Дело: калькулятор (Premium)">🧮<i class="badge" id="caseN" style="display:none"></i></button><button class="ib" id="themeBtn" title="Тема (Premium)">🎨</button>');
    $('#caseBtn').onclick = openCase; $('#themeBtn').onclick = openThemes;
  }
  updateCaseBadge();

  /* ----- Карточка статьи: действия ----- */
  const _openArt = openArt;
  openArt = function (a) {
    _openArt(a);
    const t = list.querySelector('.det .t'); if (!t) return;
    const isFav = favs().includes(a.code), inCase = cas().includes(a.code);
    t.insertAdjacentHTML('afterend', `<div class="actions"><button class="abtn" id="aCopy">📋 Копировать</button><button class="abtn${isFav ? ' on' : ''}${S.premium ? '' : ' lock'}" id="aFav">${S.premium ? (isFav ? '⭐ В избранном' : '☆ В избранное') : '🔒 Избранное'}</button><button class="abtn${inCase ? ' on' : ''}${S.premium ? '' : ' lock'}" id="aCase">${S.premium ? (inCase ? '✔ В деле' : '➕ В дело') : '🔒 В дело'}</button></div>`);
    $('#aCopy').onclick = () => copy(`Ст. ${shortCode(a)} ${a.title || a.codeTitle || ''}\nРозыск: ${a.wanted ? '⭐'.repeat(a.wanted) : '—'} | Тюрьма: ${a.prison ? a.prison + ' мес.' : '—'} | Штраф: ${a.fine ? 'до $' + fineNum(a) : '—'}`, $('#aCopy'));
    $('#aFav').onclick = () => {
      if (!S.premium) return gate('Избранное', 'Сохраняйте нужные статьи, чтобы открывать их в один клик.');
      const f = favs(); LS.set('ph_fav', f.includes(a.code) ? f.filter((c) => c !== a.code) : [a.code, ...f]); openArt(a);
    };
    $('#aCase').onclick = () => {
      if (!S.premium) return gate('Калькулятор дела', 'Складывает статьи в одно дело.');
      const c = cas(); if (!c.includes(a.code)) { c.push(a.code); LS.set('ph_case', c); } updateCaseBadge(); openArt(a);
    };
    if (S.premium) { const h = hist().filter((c) => c !== a.code); h.unshift(a.code); LS.set('ph_hist', h.slice(0, 15)); }
  };

  /* ----- Главный экран: избранное и недавние ----- */
  const _render = render;
  render = function () {
    _render();
    if (view !== 'home' || q.value.trim()) return;
    const chips = list.querySelector('.chips'); if (!chips) return;
    chips.insertAdjacentHTML('beforeend', `<span class="chip" data-x="fav">⭐ Избранное${S.premium ? '' : ' 🔒'}</span><span class="chip" data-x="hist">🕘 Недавние${S.premium ? '' : ' 🔒'}</span><span class="chip" data-x="case">🧮 Дело${S.premium ? '' : ' 🔒'}</span>`);
    chips.querySelectorAll('[data-x]').forEach((c) => (c.onclick = (ev) => {
      ev.stopPropagation();
      const x = c.dataset.x;
      if (x === 'case') return openCase();
      if (!S.premium) return gate(x === 'fav' ? 'Избранное' : 'Недавние статьи', x === 'fav' ? 'Сохраняйте нужные статьи.' : 'Последние открытые статьи.');
      if (x === 'fav') listOf(favs(), '⭐ Избранное', 'Пока пусто. Откройте статью и нажмите «В избранное».');
      else listOf(hist(), '🕘 Недавние статьи', 'Вы ещё ничего не открывали.');
    }));
  };
  // Esc/назад из списка возвращает на главный экран
  const _goBack = goBack;
  goBack = function () { if (view === 'memo-list') { view = 'home'; render(); return; } _goBack(); };

  /* ----- Админ-панель с выдачей Premium ----- */
  openAdmin = async function () {
    view = 'memo'; panel.classList.add('on');
    list.innerHTML = backBtn() + '<div class="det"><h2>👑 Кто пользуется</h2><p class="t">Загрузка…</p></div>';
    $('#bk').onclick = goBack; $('#cnt').textContent = '';
    const d = await window.overlay.adminUsers();
    if (!d || d.error) { list.innerHTML = backBtn() + `<div class="det"><h2>👑 Кто пользуется</h2><p class="t">${esc((d && d.error) || 'Ошибка')}</p></div>`; $('#bk').onclick = goBack; return; }
    list.innerHTML = backBtn() + `<div class="det"><h2>👑 Кто пользуется</h2>
      <div class="adm-top"><div><small>Всего</small><b>${d.total}</b></div><div><small>В сети</small><b style="color:#3ddc84">${d.online}</b></div><div><small>За 24 часа</small><b>${d.day}</b></div><div><small>За 7 дней</small><b>${d.week}</b></div></div>
      ${d.users.map((u) => `<div class="adm-row"><span class="dot${u.online ? ' on' : ''}"></span><span>${esc(u.name)}${u.premium ? '<span class="prem-tag">Premium</span>' : ''}<br><small>${esc(u.id)}</small></span><small>v${esc(u.version || '?')}</small><small>${ago(u.last_seen)}</small><button class="prem-btn${u.premium ? ' on' : ''}" data-id="${esc(u.id)}" data-p="${u.premium ? 1 : 0}">${u.premium ? '⭐ снять' : '☆ выдать'}</button></div>`).join('') || '<p class="t">Пока никого.</p>'}</div>`;
    $('#bk').onclick = goBack;
    list.querySelectorAll('.prem-btn').forEach((b) => (b.onclick = async () => {
      if (b.dataset.id === (S.id || '')) { /* админ всегда Premium */ }
      b.disabled = true; b.textContent = '…';
      const r = await window.overlay.adminPremium(b.dataset.id, b.dataset.p !== '1');
      if (r && r.error) { b.textContent = 'ошибка'; return; }
      openAdmin();
    }));
  };

  /* ----- Статус подписки ----- */
  if (window.overlay && window.overlay.authState) {
    window.overlay.authState().then((s) => {
      S.premium = !!(s && s.premium); S.admin = !!(s && s.admin);
      if (s && s.user) S.id = s.user.id;
      applyTheme(LS.get('ph_theme', 'scarlet'));
      const b = $('#admBtn'); if (S.admin && b) { b.style.display = ''; b.onclick = openAdmin; }
      if (view === 'home' && !q.value.trim()) render();
    });
  }
})();
