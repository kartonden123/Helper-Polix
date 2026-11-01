/* Роли и персонал: Главный Администратор, Администратор, Мл. Администратор, Модератор.
   Всем: список «В сети» с ролями и Premium. Персоналу: панель выдачи ролей и Premium, блокировки, объявления.
   Права проверяет сервер, скрытие кнопок только для удобства. */
(function () {
  const S = window.PH, X = window.PHX;
  if (!S || !X || !(window.overlay && window.overlay.staffApi)) return;
  const $ = (s) => document.querySelector(s);
  const { LS } = X;
  const RN = { owner: 'Главный Администратор', admin: 'Зам. Администратор', jr: 'Мл. Администратор', smod: 'Ст. Модератор', mod: 'Модератор', dpv: 'ДПВ' };
  const RK = { owner: 5, admin: 4, jr: 3, smod: 2, mod: 1 };
  const RC = { owner: '#ff2d55', admin: '#ff8a3d', jr: '#ffd34d', smod: '#b387ff', mod: '#6bb7ff', dpv: '#3ddc84' };
  const rank = (r) => RK[r] || 0;
  const rb = (r) => (r ? `<span class="rbadge" style="--c:${RC[r] || '#ccc'}">${RN[r] || esc(r)}</span>` : '');
  const rbs = (u) => ((u.roles && u.roles.length) ? u.roles : [u.role]).filter(Boolean).sort((a, b) => rank(b) - rank(a)).map(rb).join('');
  const tierOf = (u) => u.tier || (u.premium ? 'premium' : '');
  const pb = (u) => { const t = tierOf(u); return t === 'ultra' && !(RK[u.role] >= 4) ? '<span class="rbadge" style="--c:#5ef0ff">💎 Ультра</span>' : t === 'premium' && !u.role ? '<span class="rbadge" style="--c:#ffc43c">Premium</span>' : ''; };

  const css = document.createElement('style');
  css.textContent = `
  .rbadge{display:inline-block;font-size:10.5px;font-weight:700;letter-spacing:.02em;padding:1px 8px;border-radius:999px;margin-left:6px;vertical-align:middle;color:var(--c);background:color-mix(in srgb,var(--c) 16%,transparent);border:1px solid color-mix(in srgb,var(--c) 45%,transparent)}
  .urow{display:grid;grid-template-columns:12px 1fr auto;gap:10px;align-items:center;padding:8px 10px;border-radius:10px;animation:slideR .35s both}
  .urow:nth-child(odd){background:rgba(255,255,255,.04)}
  .urow small{color:var(--muted);font-size:11.5px}
  .uact{display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:flex-end}
  .mini{background:rgba(255,255,255,.07);border:1px solid var(--line);color:#ddd;border-radius:8px;padding:3px 9px;font:inherit;font-size:11.5px;cursor:pointer;transition:.15s}
  .mini:hover{border-color:rgba(var(--acc-rgb),.7);color:#fff}
  .mini.on{background:rgba(255,196,60,.16);border-color:rgba(255,196,60,.5);color:#ffd36b}
  .mini.bad{border-color:rgba(255,100,100,.5);color:#ff9d9d}
  select.mini{padding:3px 6px;outline:none;background:#1b171d}
  .stmsg{font-size:12px;min-height:18px;margin:6px 0 10px;color:var(--muted)}
  .stab{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px}
  #annBanner{display:none;align-items:center;gap:12px;margin:0 0 10px;padding:10px 14px;border-radius:16px;background:linear-gradient(90deg,rgba(255,196,60,.22),rgba(255,196,60,.06)),#1b171d;border:1px solid rgba(255,196,60,.5);color:#fff;font-size:13px;animation:updIn .5s both}
  #annBanner.on{display:flex}
  #annBanner span.t{flex:1}#annBanner small{color:#cfc8d3;display:block;font-size:11px;margin-top:2px}
  #annBanner button{background:none;border:0;color:#ccc;cursor:pointer;font-size:15px}
  .bancard{padding:26px;text-align:center;background:linear-gradient(180deg,#221f27,#16141a);border:1px solid rgba(255,100,100,.4);border-radius:20px;margin-top:8px}
  .ib{width:34px}
  `;
  document.head.appendChild(css);

  const msgBox = () => $('#stMsg');
  let lastMsg = { t: '', ok: true };
  const paintMsg = () => { const m = msgBox(); if (m) { m.textContent = lastMsg.t; m.style.color = lastMsg.ok ? '#8ee6a8' : '#ff9d9d'; } };
  const say = (t, ok) => { lastMsg = { t, ok }; paintMsg(); };
  const api = (m, p, b) => window.overlay.staffApi(m, p, b);

  /* ---------- В сети: видно всем ---------- */
  async function openOnline() {
    view = 'memo'; panel.classList.add('on');
    list.innerHTML = backBtn() + '<div class="det"><h2>👥 В сети</h2><p class="t">Загрузка…</p></div>';
    $('#bk').onclick = goBack; $('#cnt').textContent = '';
    const d = await api('GET', '/online');
    if (!d || d.error) { list.innerHTML = backBtn() + `<div class="det"><h2>👥 В сети</h2><p class="t">${esc((d && d.error) || 'Ошибка')}</p></div>`; $('#bk').onclick = goBack; return; }
    list.innerHTML = backBtn() + `<div class="det"><h2>👥 В сети: ${d.online}</h2><p class="t">Пользователи хелпера за последние 35 минут. Всего зарегистрировано: ${d.total}.</p>
      ${d.users.map((u) => `<div class="urow"><span class="dot on"></span><span>${esc(u.name)}${rbs(u)}${pb(u)}</span><small>v${esc(u.version || '?')}</small></div>`).join('') || '<div class="empty">Сейчас никого нет</div>'}</div>`;
    $('#bk').onclick = goBack;
  }

  /* ---------- Панель персонала ---------- */
  let cache = null, filt = '';
  function roleOptions(cur, target) {
    const mineRank = rank(S.role);
    const opts = [['', 'Без роли'], ['mod', 'Модератор'], ['smod', 'Ст. Модератор'], ['jr', 'Мл. Администратор']];
    if (S.role === 'owner') opts.push(['admin', 'Зам. Администратор']);
    return opts.map(([v, l]) => `<option value="${v}"${v === cur ? ' selected' : ''}>${l}</option>`).join('');
  }
  function canEdit(u) { return S.role === 'owner' ? u.role !== 'owner' : rank(S.role) >= 4 && rank(u.role) < rank(S.role); }

  function userRow(u) {
    const mine = rank(S.role);
    const staff = u.role !== '';
    const premBtn = mine >= 3 && !staff ? `<select class="mini" data-a="tier" data-id="${esc(u.id)}"><option value="0"${tierOf(u) === '' ? ' selected' : ''}>Без Premium</option><option value="1"${tierOf(u) === 'premium' ? ' selected' : ''}>⭐ Premium</option>${mine >= 4 ? `<option value="2"${tierOf(u) === 'ultra' ? ' selected' : ''}>💎 Ультра</option>` : ''}</select>` : '';
    const roleSel = mine >= 4 && canEdit(u) ? `<select class="mini" data-a="role" data-id="${esc(u.id)}">${roleOptions(u.role, u)}</select>` : '';
    const hasP = (u.roles || []).includes('dpv');
    const dpvBtn = mine >= 4 ? `<button class="mini${hasP ? ' on' : ''}" data-a="dpv" data-id="${esc(u.id)}">${hasP ? '♠ ДПВ снять' : '♠ ДПВ'}</button>` : '';
    const banBtn = mine >= 4 && canEdit(u) ? `<button class="mini${u.banned ? ' bad' : ''}" data-a="ban" data-id="${esc(u.id)}">${u.banned ? '✔ разблок.' : '🚫 блок'}</button>` : '';
    return `<div class="urow" data-uid="${esc(u.id)}"><span class="dot${u.online ? ' on' : ''}"></span><span>${esc(u.name)}${rbs(u)}${pb(u)}${u.banned ? '<span class="rbadge" style="--c:#ff6b6b">заблокирован</span>' : ''}<br><small>${esc(u.id)} · v${esc(u.version || '?')} · ${ago(u.last_seen)}</small></span><div class="uact">${premBtn}${roleSel}${dpvBtn}${banBtn}</div></div>`;
  }

  async function act(kind, id, extra) {
    let path, body;
    if (kind === 'prem') { path = '/staff/premium'; body = { id, tier: extra }; }
    else if (kind === 'role') { path = '/staff/role'; body = { id, role: extra }; }
    else if (kind === 'dpv') { path = '/staff/role'; body = { id, role: 'dpv', on: extra }; }
    else { path = '/staff/ban'; body = { id, on: extra }; }
    say('Отправляю…', true);
    const r = await api('POST', path, body);
    if (!r || r.error) { say('Ошибка: ' + ((r && r.error) || 'нет ответа от сервера'), false); return null; }
    say(kind === 'prem' ? (r.tier === 'ultra' ? 'Ультра Премиум выдан: ' : r.premium ? 'Premium выдан: ' : 'Premium снят: ') + id : kind === 'dpv' ? (extra ? 'Роль ДПВ выдана: ' : 'Роль ДПВ снята: ') + id : kind === 'role' ? (r.role ? 'Роль «' + RN[r.role] + '» назначена: ' : 'Роль снята: ') + id : (r.banned ? 'Заблокирован: ' : 'Разблокирован: ') + id, true);
    // сразу обновляем строку локально: список на сервере обновляется с задержкой до минуты
    if (cache) {
      const u = cache.users.find((x) => x.id === id);
      if (u) { if (kind === 'prem') { u.premium = r.premium; u.tier = r.tier; } else if (kind === 'dpv') { u.roles = r.roles; } else if (kind === 'role') { u.role = r.role; u.roles = r.roles; u.premium = r.premium || !!r.role; if (r.role) u.tier = RK[r.role] >= 4 ? 'ultra' : 'premium'; } else u.banned = r.banned; }
    }
    return r;
  }

  function bindUsers() {
    list.querySelectorAll('[data-a]').forEach((el) => {
      const id = el.dataset.id, a = el.dataset.a;
      if (a === 'role') el.onchange = async () => { await act('role', id, el.value); drawUsers(); };
      else if (a === 'dpv') el.onclick = async () => { const u = cache.users.find((x) => x.id === id); if (!u) return; await act('dpv', id, !(u.roles || []).includes('dpv')); drawUsers(); };
      else if (a === 'tier') el.onchange = async () => { await act('prem', id, +el.value); drawUsers(); };
      else el.onclick = async () => {
        const u = cache.users.find((x) => x.id === id); if (!u) return;
        await act(a, id, !u.banned); drawUsers();
      };
    });
  }
  function drawUsers() {
    const box = $('#stBody'); if (!box || !cache) return;
    const d = cache;
    box.innerHTML = `<div class="adm-top"><div><small>Всего</small><b>${d.total}</b></div><div><small>В сети</small><b style="color:#3ddc84">${d.online}</b></div><div><small>За 24 часа</small><b>${d.day}</b></div><div><small>Premium</small><b>${d.premiumCount}</b></div></div>
      <input class="fld" id="stFilter" placeholder="Поиск по имени или ID" value="${esc(filt)}"><div class="actions"><button class="abtn" id="stCopy">📋 Копировать список</button></div><div class="stmsg" id="stMsg"></div><div id="stList"></div>`;
    const paint = () => { const f = filt.toLowerCase(); const arr = d.users.filter((u) => !f || (u.name || '').toLowerCase().includes(f) || u.id.includes(f)); $('#stList').innerHTML = arr.map(userRow).join('') || '<div class="empty">Никого не найдено</div>'; bindUsers(); paintMsg(); };
    const fi = $('#stFilter'); fi.addEventListener('keydown', (e) => e.stopPropagation()); fi.oninput = () => { filt = fi.value; paint(); };
    $('#stCopy').onclick = () => X.copy(d.users.map((u) => u.name + ' | ' + u.id + ' | ' + (RN[u.role] || '') + ' | ' + tierOf(u) + ' | v' + (u.version || '?')).join('\n'), $('#stCopy'));
    paint();
  }

  function openStaff(tab) {
    tab = typeof tab === 'string' ? tab : 'users';
    view = 'memo'; panel.classList.add('on');
    const mine = rank(S.role);
    list.innerHTML = backBtn() + `<div class="det"><h2>👑 Панель персонала</h2><p class="t">Ваша роль: ${rb(S.role) || 'нет'}</p>
      <div class="stab"><button class="abtn${tab === 'users' ? ' on' : ''}" data-t="users">👥 Люди</button>${mine >= 3 ? `<button class="abtn${tab === 'id' ? ' on' : ''}" data-t="id">🔑 По Discord ID</button>` : ''}${mine >= 4 ? `<button class="abtn${tab === 'ann' ? ' on' : ''}" data-t="ann">📢 Объявление</button>` : ''}</div>
      <div id="stBody"><p class="t">Загрузка…</p></div></div>`;
    $('#bk').onclick = goBack; $('#cnt').textContent = '';
    list.querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => openStaff(b.dataset.t)));
    if (tab === 'users') {
      api('GET', '/staff/users').then((d) => {
        if (!d || d.error) { const bx = $('#stBody'); if (bx) bx.innerHTML = `<p class="t">${esc((d && d.error) || 'Ошибка')}</p>`; return; }
        cache = d; drawUsers();
      });
    } else if (tab === 'id') {
      $('#stBody').innerHTML = `<input class="fld" id="stId" placeholder="Discord ID человека (ПКМ по нему → Копировать ID)"><div class="stmsg" id="stMsg"></div><div id="stInfo"></div>
        <div class="actions"><button class="abtn" id="stLook">🔎 Проверить</button><button class="abtn on" id="stPOn">⭐ Premium</button>${mine >= 4 ? '<button class="abtn on" id="stUOn">💎 Ультра Премиум</button>' : ''}<button class="abtn" id="stPOff">Снять</button>${mine >= 4 ? '<button class="abtn" id="stDOn">♠ ДПВ</button><button class="abtn" id="stDOff">Снять ДПВ</button>' : ''}</div>
        ${mine >= 4 ? `<div class="actions"><select class="mini" id="stRole">${roleOptions('', {})}</select><button class="abtn" id="stRoleGo">Назначить роль</button><button class="abtn" id="stBanOn">🚫 Заблокировать</button><button class="abtn" id="stBanOff">Разблокировать</button></div>` : ''}`;
      $('#stId').addEventListener('keydown', (e) => e.stopPropagation());
      const gid = () => { const v = $('#stId').value.trim(); if (!/^\d{5,25}$/.test(v)) { say('Введите Discord ID: только цифры.', false); return null; } return v; };
      $('#stLook').onclick = async () => {
        const id = gid(); if (!id) return; say('Проверяю…', true);
        const r = await api('GET', '/staff/lookup?id=' + id);
        if (!r || r.error) return say('Ошибка: ' + ((r && r.error) || 'нет ответа'), false);
        say('Данные с сервера получены', true);
        $('#stInfo').innerHTML = `<div class="note">${r.seen ? esc(r.seen.name) : 'Ещё не заходил в хелпер'}${rbs(r)}${pb(r)}${r.banned ? '<span class="rbadge" style="--c:#ff6b6b">заблокирован</span>' : ''}</div>`;
      };
      $('#stPOn').onclick = async () => { const id = gid(); if (id) await act('prem', id, 1); };
      if (mine >= 4) { $('#stDOn').onclick = async () => { const id = gid(); if (id) await act('dpv', id, true); }; $('#stDOff').onclick = async () => { const id = gid(); if (id) await act('dpv', id, false); }; }
      if (mine >= 4) $('#stUOn').onclick = async () => { const id = gid(); if (id) await act('prem', id, 2); };
      $('#stPOff').onclick = async () => { const id = gid(); if (id) await act('prem', id, 0); };
      if (mine >= 4) {
        $('#stRoleGo').onclick = async () => { const id = gid(); if (id) await act('role', id, $('#stRole').value); };
        $('#stBanOn').onclick = async () => { const id = gid(); if (id) await act('ban', id, true); };
        $('#stBanOff').onclick = async () => { const id = gid(); if (id) await act('ban', id, false); };
      }
    } else if (tab === 'ann') {
      $('#stBody').innerHTML = `<p class="t">Сообщение увидят все пользователи хелпера в верхней части меню.</p><textarea class="ai-box" id="stAnn" maxlength="300" placeholder="Например: сегодня в 20:00 общий сбор в Discord"></textarea><div class="stmsg" id="stMsg"></div>
        <div class="actions"><button class="abtn on" id="stAnnGo">📢 Опубликовать</button><button class="abtn" id="stAnnOff">Убрать объявление</button></div>`;
      $('#stAnn').addEventListener('keydown', (e) => e.stopPropagation());
      const send = async (text) => { say('Отправляю…', true); const r = await api('POST', '/staff/announce', { text }); if (!r || r.error) return say('Ошибка: ' + ((r && r.error) || 'нет ответа'), false); say(text ? 'Объявление опубликовано' : 'Объявление убрано', true); };
      $('#stAnnGo').onclick = () => { const t = $('#stAnn').value.trim(); if (t) send(t); };
      $('#stAnnOff').onclick = () => send('');
    }
  }
  openAdmin = openStaff;   // старый вызов из других модулей

  /* ---------- Кнопки и статус ---------- */
  const imm = $('#immBtn');
  if (imm && !$('#onlineBtn')) { imm.insertAdjacentHTML('beforebegin', '<button class="ib" id="onlineBtn" title="Кто в сети">👥</button>'); $('#onlineBtn').onclick = openOnline; }

  function showAnnounce(a) {
    let el = $('#annBanner');
    if (!a || !a.text || LS.get('ph_ann_seen', '') === a.id) { if (el) el.classList.remove('on'); return; }
    if (!el) { el = document.createElement('div'); el.id = 'annBanner'; const host = document.getElementById('ui'); host.insertBefore(el, host.firstChild); }
    el.innerHTML = `<span style="font-size:20px">📢</span><span class="t">${esc(a.text)}<small>${esc(a.by || 'Администрация')}</small></span><button title="Закрыть">✕</button>`;
    el.classList.add('on');
    el.querySelector('button').onclick = () => { LS.set('ph_ann_seen', a.id); el.classList.remove('on'); };
  }

  function apply(s) {
    if (!s) return;
    S.role = s.role || ''; S.rank = rank(S.role); S.premium = !!s.premium; S.admin = S.role === 'owner'; S.tier = s.tier || (S.premium ? 'premium' : ''); S.ultra = S.tier === 'ultra'; S.roles = s.roles || (S.role ? [S.role] : []); S.poker = S.role === 'owner' || S.roles.includes('dpv');
    const pk = $('#pokerBtn'); if (pk) pk.style.display = S.poker ? '' : 'none';
    if (s.user) S.id = s.user.id;
    if (s.banned) {
      document.getElementById('ui').innerHTML = '<div class="bancard"><div style="font-size:34px">🚫</div><h2 style="margin:8px 0">Доступ ограничен</h2><p style="color:#cfc8d3">Администратор ограничил вам доступ к хелперу. Если это ошибка, напишите администрации семьи.</p></div>';
      return;
    }
    const b = $('#admBtn');
    if (b) { b.style.display = S.rank >= 1 ? '' : 'none'; b.title = S.rank >= 1 ? 'Панель персонала: ' + RN[S.role] : ''; b.onclick = () => openStaff('users'); }
    showAnnounce(s.announce);
    X.applyTheme(LS.get('ph_theme', 'scarlet'));
    if (window.PHX_applyLook) window.PHX_applyLook();
  }
  function refresh() { if (window.overlay.authState) window.overlay.authState().then((s) => setTimeout(() => apply(s), 80)); }
  refresh();
  window.PHX_refreshAuth = refresh;
  if (window.overlay.onShow) window.overlay.onShow(refresh);
  setInterval(refresh, 5 * 60 * 1000);
})();
