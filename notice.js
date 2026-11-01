/* Уведомления внутри меню: обновление, роль, Premium, блокировка, объявления */
(function () {
  const css = document.createElement('style');
  css.textContent = `
  #toasts{position:fixed;right:14px;bottom:14px;z-index:99;display:flex;flex-direction:column;gap:8px;max-width:340px;pointer-events:none}
  .toast{pointer-events:auto;display:flex;gap:10px;align-items:flex-start;padding:11px 14px;border-radius:14px;background:#1b171d;border:1px solid var(--accent,#d4264a);color:#fff;font-size:13px;box-shadow:0 3px 10px rgba(0,0,0,.4);animation:toastIn .35s both;cursor:pointer}
  .toast b{display:block;margin-bottom:2px}.toast span{color:#cfc8d3;font-size:12px;line-height:1.35}
  .toast i{font-style:normal;font-size:18px}
  .toast.out{animation:toastOut .3s both}
  .set-sec{margin:14px 0 4px;font-weight:700;font-size:13px;color:var(--accent)}.lockrow{color:#a99fb0;font-size:12px}
  .neon .bar,.neon .panel{border-color:rgba(var(--acc-rgb),.75)!important;box-shadow:0 0 0 1px rgba(var(--acc-rgb),.4),0 0 10px rgba(var(--acc-rgb),.5)!important}
  .about{display:flex;align-items:center;gap:12px;margin:2px 0 12px}.about img{width:42px;height:42px;border-radius:10px}
  .about small{display:block;color:#a99fb0;font-size:12px;margin-top:2px}
  @keyframes toastIn{from{opacity:0;transform:translateY(12px) scale(.96)}to{opacity:1;transform:none}}
  @keyframes toastOut{to{opacity:0;transform:translateX(24px)}}
  @media (prefers-reduced-motion:reduce){.toast{animation:none}}`;
  document.head.appendChild(css);
  const ICON = { update: '⬇', role: '🛡', premium: '⭐', ban: '⛔', announce: '📢', info: '🔔' };
  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function show(n) {
    if (n.silent) { const rf = window.PHX_refreshAuth; if (typeof rf === 'function' && n.kind !== 'update') rf(true); return; }
    let box = document.getElementById('toasts');
    if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.appendChild(box); }
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = `<i>${ICON[n.kind] || ICON.info}</i><div><b>${esc(n.title)}</b><span>${esc(n.body || '')}</span></div>`;
    const close = () => { t.classList.add('out'); setTimeout(() => t.remove(), 300); };
    t.onclick = close;
    box.appendChild(t);
    setTimeout(close, 9000);
    const ref = window.PHX_refreshAuth; if (typeof ref === 'function' && n.kind !== 'update') ref();
  }
  window.PHX_notice = show;
  if (window.overlay && window.overlay.onNotice) window.overlay.onNotice(show);
})();
