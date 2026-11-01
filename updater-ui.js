/* Красивое окно обновления внутри меню: скачивание с прогрессом, затем «Установить сейчас / Позже». */
(function () {
  if (!(window.overlay && window.overlay.onUpdate)) return;
  const host = document.getElementById('ui') || document.querySelector('.card');
  if (!host) return;

  const css = document.createElement('style');
  css.textContent = `
  #updBanner{display:none;align-items:center;gap:14px;margin:0 0 10px;padding:12px 16px;border-radius:18px;color:#fff;
    background:linear-gradient(90deg,rgba(var(--acc-rgb,255,77,109),.28),rgba(var(--acc-rgb,255,77,109),.08)),#1b171d;
    border:1px solid rgba(var(--acc-rgb,255,77,109),.55);box-shadow:0 14px 40px -16px rgba(var(--acc-rgb,255,77,109),.7);overflow:hidden;position:relative}
  #updBanner.on{display:flex;animation:updIn .55s cubic-bezier(.2,.9,.25,1.1) both}
  #updBanner.out{animation:updOut .35s ease-in both}
  #updBanner .uic{font-size:24px;animation:updBob 1.8s ease-in-out 3}
  #updBanner .utx{flex:1;min-width:0;font-size:13.5px;line-height:1.35}
  #updBanner .utx b{display:block;font-size:14.5px}
  #updBanner .utx small{color:#cfc8d3;font-size:12px}
  #updBanner .ubtn{border:0;border-radius:12px;padding:9px 16px;font:inherit;font-size:13px;font-weight:700;cursor:pointer;transition:transform .15s,filter .2s;white-space:nowrap}
  #updBanner .ubtn:hover{transform:translateY(-1px);filter:brightness(1.12)}#updBanner .ubtn:active{transform:scale(.96)}
  #updBanner .go{background:var(--accent,#ff4d6d);color:#fff}
  #updBanner .later{background:rgba(255,255,255,.1);color:#ddd}
  #updBanner .bar2{position:absolute;left:0;bottom:0;height:3px;background:var(--accent,#ff4d6d);width:0;transition:width .4s ease}
  #updBanner.shine::after{content:"";position:absolute;inset:0;background:linear-gradient(105deg,transparent 35%,rgba(255,255,255,.18) 50%,transparent 65%);transform:translateX(-120%);animation:updShine 1.4s .4s ease-out 1 forwards;pointer-events:none}
  @keyframes updIn{from{opacity:0;transform:translateY(-14px) scale(.97)}to{opacity:1;transform:none}}
  @keyframes updOut{to{opacity:0;transform:translateY(-10px) scale(.97);max-height:0;margin:0;padding-top:0;padding-bottom:0}}
  @keyframes updBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
  @keyframes updShine{to{transform:translateX(120%)}}
  `;
  document.head.appendChild(css);

  const el = document.createElement('div'); el.id = 'updBanner';
  host.insertBefore(el, host.firstChild);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function show(s) {
    if (!s || s.type === 'none') {
      if (el.classList.contains('on')) { el.classList.add('out'); setTimeout(() => { el.classList.remove('on', 'out', 'shine'); el.innerHTML = ''; }, 360); }
      return;
    }
    const wasOn = el.classList.contains('on');
    if (s.type === 'available') {
      el.dataset.t = 'a';
      el.innerHTML = `<span class="uic">✨</span><div class="utx"><b>Вышла новая версия ${esc(s.version || '')}</b><small>Скачать обновление? Это займёт меньше минуты.</small></div><button class="ubtn later" id="updLater">Позже</button><button class="ubtn go" id="updGo">Скачать</button>`;
      el.classList.add('shine');
      el.querySelector('#updGo').onclick = () => { window.overlay.updateAction('download'); };
      el.querySelector('#updLater').onclick = () => { window.overlay.updateAction('later'); show({ type: 'none' }); };
    } else    if (s.type === 'downloading') {
      const p = Math.max(0, Math.min(100, Math.round(s.percent || 0)));
      if (!el.querySelector('.bar2') || el.dataset.t !== 'd') {
        el.innerHTML = `<span class="uic">⬇</span><div class="utx"><b>Скачиваю обновление ${esc(s.version || '')}</b><small id="updPct">${p}%</small></div><div class="bar2" id="updBar"></div>`;
        el.dataset.t = 'd';
      }
      const bar = el.querySelector('#updBar'); if (bar) bar.style.width = p + '%';
      const pc = el.querySelector('#updPct'); if (pc) pc.textContent = p + '%';
    } else if (s.type === 'ready') {
      el.dataset.t = 'r';
      el.innerHTML = `<span class="uic">🚀</span><div class="utx"><b>Доступна версия ${esc(s.version || '')}</b><small>Установить сейчас? Программа перезапустится за пару секунд.</small></div><button class="ubtn later" id="updLater">Позже</button><button class="ubtn go" id="updGo">Установить</button>`;
      el.classList.add('shine');
      el.querySelector('#updGo').onclick = () => { el.querySelector('#updGo').textContent = 'Устанавливаю…'; window.overlay.updateAction('install'); };
      el.querySelector('#updLater').onclick = () => { window.overlay.updateAction('later'); show({ type: 'none' }); };
    }
    el.classList.remove('out'); el.classList.add('on');
    if (!wasOn) el.style.animation = '';
  }

  window.overlay.onUpdate(show);
  if (window.overlay.updateState) window.overlay.updateState().then(show);
})();
