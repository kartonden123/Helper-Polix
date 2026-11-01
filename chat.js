/* Общий чат пользователей хелпера (мгновенно, через WebSocket). Кнопка 💬 в панели. */
(function () {
  const S = window.PH, X = window.PHX;
  if (!S || !X || !(window.overlay && window.overlay.onChat)) return;
  const $ = (s) => document.querySelector(s);
  const RN = { owner: 'Главный Администратор', admin: 'Зам. Администратор', jr: 'Мл. Администратор', smod: 'Ст. Модератор', mod: 'Модератор' };
  const RC = { owner: '#ff2d55', admin: '#ff8a3d', jr: '#ffd34d', smod: '#b387ff', mod: '#6bb7ff' };
  let hist = [], unread = 0, open = false, err = '';

  const css = document.createElement('style');
  css.textContent = `
  .chat-box{height:min(46vh,360px);overflow-y:auto;display:flex;flex-direction:column;gap:6px;padding:4px 2px;user-select:text}
  .cm{padding:7px 11px;border-radius:12px;background:rgba(255,255,255,.06);max-width:88%;align-self:flex-start;animation:fade .2s both}
  .cm.me{align-self:flex-end;background:rgba(var(--acc-rgb),.18)}
  .cm b{font-size:12.5px}.cm small{color:var(--muted);font-size:10.5px;margin-left:6px}
  .cm p{margin:2px 0 0;font-size:13.5px;color:#eee;white-space:pre-wrap;word-break:break-word}
  .cm .x{float:right;margin-left:8px;background:none;border:0;color:var(--muted);cursor:pointer;font-size:12px;opacity:0}.cm:hover .x{opacity:1}
  .chat-in{display:flex;gap:8px;margin-top:10px}.chat-in input{flex:1;background:rgba(255,255,255,.07);border:1px solid var(--line);border-radius:12px;color:#fff;padding:9px 12px;font:inherit;outline:none;user-select:text}
  .chat-in input:focus{border-color:rgba(var(--acc-rgb),.6)}
  .chat-err{min-height:16px;color:#ff9d9d;font-size:12px;margin-top:4px}
  `;
  document.head.appendChild(css);

  const hm = (t) => { const d = new Date(t); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  const badge = (m) => (m.role ? `<span class="rbadge" style="--c:${RC[m.role] || '#ccc'}">${esc(RN[m.role] || m.role)}</span>` : m.tier === 'ultra' ? '<span class="rbadge" style="--c:#5ef0ff">💎 Ультра</span>' : m.tier === 'premium' ? '<span class="rbadge" style="--c:#ffc43c">Premium</span>' : '');
  const msgHtml = (m) => {
    const mine = m.uid === S.id;
    const canDel = mine || S.rank >= 1;
    return `<div class="cm${mine ? ' me' : ''}" data-id="${esc(m.id)}">${canDel ? '<button class="x" title="Удалить">✕</button>' : ''}<b>${esc(m.name)}</b>${badge(m)}<small>${hm(m.at)}</small><p>${esc(m.text)}</p></div>`;
  };
  function paint() {
    const box = $('#chatBox'); if (!box) return;
    box.innerHTML = hist.map(msgHtml).join('') || '<div class="empty">Пока тихо. Напишите первым.</div>';
    box.scrollTop = box.scrollHeight;
    box.querySelectorAll('.x').forEach((b) => (b.onclick = () => window.overlay.chatDel(b.closest('.cm').dataset.id)));
    const e = $('#chatErr'); if (e) e.textContent = err;
  }
  function setBadge() { const b = $('#chatN'); if (b) { b.textContent = unread > 9 ? '9+' : unread; b.style.display = unread ? '' : 'none'; } }

  function openChat() {
    view = 'memo'; panel.classList.add('on'); open = true; unread = 0; setBadge();
    list.innerHTML = backBtn() + `<div class="det"><h2>💬 Чат</h2><p class="t">Общий чат пользователей хелпера. Сообщения приходят мгновенно, хранятся последние 100.</p>
      <div class="chat-box" id="chatBox"></div><div class="chat-err" id="chatErr"></div>
      <div class="chat-in"><input id="chatIn" maxlength="300" placeholder="Сообщение" autocomplete="off"><button class="abtn on" id="chatGo">Отправить</button></div></div>`;
    $('#bk').onclick = () => { open = false; goBack(); }; $('#cnt').textContent = '';
    const inp = $('#chatIn');
    inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') send(); if (e.key === 'Escape') { open = false; goBack(); } });
    $('#chatGo').onclick = send; inp.focus();
    paint();
    window.overlay.chatHist().then((h) => { hist = h || []; paint(); });
  }
  async function send() {
    const inp = $('#chatIn'); const t = inp.value.trim(); if (!t) return;
    const ok = await window.overlay.chatSend(t);
    if (ok) { inp.value = ''; err = ''; } else err = 'Нет соединения с чатом. Подождите несколько секунд.';
    const e = $('#chatErr'); if (e) e.textContent = err;
  }

  window.overlay.onChat((m) => {
    if (m.t === 'hist') hist = m.m || [];
    else if (m.t === 'chat') { hist.push(m.m); if (hist.length > 100) hist.shift(); if (!(open && $('#chatBox')) && m.m.uid !== S.id) { unread++; setBadge(); } }
    else if (m.t === 'del') hist = hist.filter((x) => x.id !== m.id);
    else if (m.t === 'err') { err = m.e || ''; }
    if ($('#chatBox')) { open = true; paint(); } else open = false;
  });

  const imm = $('#immBtn');
  if (imm && !$('#chatBtn')) {
    imm.insertAdjacentHTML('beforebegin', '<button class="ib" id="chatBtn" title="Чат">💬<i class="badge" id="chatN" style="display:none"></i></button>');
    $('#chatBtn').onclick = openChat;
  }
  window.overlay.chatHist().then((h) => { hist = h || []; });
})();
