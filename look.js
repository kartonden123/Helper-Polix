/* Оформление: единый набор иконок, мягкие тени, размытие фона под плашками (снимок экрана при открытии меню). */
(function () {
  const svg = (inner, fill) => {
    const s = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='${fill ? 'black' : 'none'}' stroke='black' stroke-width='1.9' stroke-linecap='round' stroke-linejoin='round'>${inner}</svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(s)}")`;
  };
  const I = {
    crown: svg("<path d='M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5L3 8z'/>"),
    calc: svg("<rect x='5' y='2.5' width='14' height='19' rx='3'/><path d='M8.5 7h7M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01'/>"),
    timer: svg("<circle cx='12' cy='13.5' r='7.5'/><path d='M12 9.5v4l2.5 1.5M9.5 2.5h5'/>"),
    sliders: svg("<path d='M4 7h9M17 7h3M4 17h3M11 17h9'/><circle cx='15' cy='7' r='2'/><circle cx='9' cy='17' r='2'/>"),
    users: svg("<circle cx='9' cy='8' r='3.5'/><path d='M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6'/><path d='M16.5 4.8a3.3 3.3 0 0 1 0 6.4M18.5 14.4c1.8.8 3 2.6 3 5.6'/>"),
    spade: svg("<path d='M12 3c3.4 4.4 7.5 6.2 7.5 10.2A4 4 0 0 1 12.7 16l.8 5h-3l.8-5A4 4 0 0 1 4.5 13.2C4.5 9.2 8.6 7.4 12 3z'/>"),
    chat: svg("<path d='M20.5 11.5a8 8 0 0 1-11.7 7L3.5 20l1.5-4.6a8 8 0 1 1 15.5-3.9z'/>"),
    shield: svg("<path d='M12 3l7.5 2.8v5.7c0 4.8-3.2 8.2-7.5 9.5-4.3-1.3-7.5-4.7-7.5-9.5V5.8L12 3z'/><path d='M9 12l2.2 2.2L15.5 10'/>"),
    book: svg("<path d='M4.5 5.5A2 2 0 0 1 6.5 3.5H19v14H6.5a2 2 0 0 0-2 2v-14z'/><path d='M19 17.5v3H6.5a2 2 0 0 1-2-1'/>"),
    x: svg("<path d='M6 6l12 12M18 6L6 18'/>"),
    star: svg("<path d='M12 3.5l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9L6.7 20l1.1-6L3.4 9.8l6-.8L12 3.5z'/>"),
    starF: svg("<path d='M12 3.5l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9L6.7 20l1.1-6L3.4 9.8l6-.8L12 3.5z'/>", true),
    plus: svg("<path d='M12 5v14M5 12h14'/>"),
    grid: svg("<rect x='3.5' y='3.5' width='7' height='7' rx='2'/><rect x='13.5' y='3.5' width='7' height='7' rx='2'/><rect x='3.5' y='13.5' width='7' height='7' rx='2'/><rect x='13.5' y='13.5' width='7' height='7' rx='2'/>"),
    check: svg("<path d='M5 12.5l4.5 4.5L19 7.5'/>")
  };
  const css = document.createElement('style');
  css.textContent = `
  /* ---- иконки панели: рисуются маской, текст/эмодзи внутри скрыты ---- */
  .bar{gap:6px!important}#q{min-width:140px}.bar .ib{width:34px;height:34px;border-radius:11px;flex:none;font-size:0!important;line-height:0;display:grid;place-items:center;color:#a9a2af;background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.07)}
  .bar .ib::before{content:"";width:18px;height:18px;background:currentColor;-webkit-mask:var(--ic) center/contain no-repeat;mask:var(--ic) center/contain no-repeat;transition:transform .2s}
  .bar .ib:hover{color:#fff}.bar .ib:hover::before{transform:scale(1.12)}
  .bar .ib .badge{font-size:10px;line-height:17px}
  #admBtn{--ic:${I.crown}}#caseBtn{--ic:${I.calc}}#timerBtn{--ic:${I.timer}}#setBtn{--ic:${I.sliders}}#onlineBtn{--ic:${I.users}}#pokerBtn{--ic:${I.spade}}#chatBtn{--ic:${I.chat}}#immBtn{--ic:${I.shield}}#memoBtn{--ic:${I.book}}#hideBtn{--ic:${I.x}}#toolsBtn{--ic:${I.grid}}
  #admBtn{color:#ffc43c}#hideBtn:hover{color:#ff8a8a;border-color:rgba(255,100,100,.5)}
  /* быстрые кнопки в списке */
  .qb{font-size:0!important;display:inline-grid;place-items:center;width:32px!important;height:32px!important;border-radius:10px!important}
  .qb::before{content:"";width:17px;height:17px;background:currentColor;-webkit-mask:var(--ic) center/contain no-repeat;mask:var(--ic) center/contain no-repeat}
  .qb[data-k="f"]{--ic:${I.star}}.qb[data-k="f"].on{--ic:${I.starF};color:#ffc43c}
  .qb[data-k="c"]{--ic:${I.plus}}.qb[data-k="c"].on{--ic:${I.check};color:#6ee7a0}
  /* ---- общий вид ---- */
  .stats{grid-template-columns:repeat(auto-fit,minmax(86px,1fr))!important}.stats b{white-space:nowrap}.stats small{white-space:nowrap}
  .seg{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.06)}
  .seg{flex:none}.seg button{padding:6px 12px;font-weight:600}.seg button.on{background:rgba(var(--acc-rgb),.28);color:#fff;box-shadow:0 1px 0 rgba(255,255,255,.12) inset}
  .row{border-radius:14px}.row:hover{background:rgba(255,255,255,.06)}
  .abtn,.chip{border-radius:12px}
  button:focus-visible,input:focus-visible{outline:2px solid rgba(var(--acc-rgb),.7);outline-offset:1px}
  .scroll::-webkit-scrollbar-track{background:transparent}.scroll::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,.28)}
  .det h2{letter-spacing:.01em}.back{border-radius:8px}
  /* ---- размытие фона под плашками ---- */
  .bar,.panel{position:relative;isolation:isolate}
  .gl{position:absolute;inset:0;z-index:-1;border-radius:inherit;overflow:hidden;pointer-events:none}
  .gl img{position:absolute;max-width:none;filter:blur(16px) saturate(1.35) brightness(.78)}
  .gl::after{content:"";position:absolute;inset:0;background:rgba(22,19,26,.5)}
  .snap .bar,.snap .panel{background:transparent!important}
  `;
  document.head.appendChild(css);

  /* ---- снимок экрана -> размытый фон только внутри плашек ---- */
  const root = document.documentElement;
  let bg = null;
  const plates = () => [...document.querySelectorAll('.bar,.panel')];
  function layout() {
    if (!bg) { root.classList.remove('snap'); plates().forEach((p) => { const g = p.querySelector(':scope>.gl'); if (g) g.remove(); }); return; }
    root.classList.add('snap');
    plates().forEach((p) => {
      const r = p.getBoundingClientRect(); if (!r.width) return;
      let g = p.querySelector(':scope>.gl');
      if (!g) { g = document.createElement('div'); g.className = 'gl'; g.innerHTML = '<img alt="">'; p.prepend(g); }
      const img = g.firstChild; if (img.dataset.s !== bg.img.length + ':' + bg.img.slice(-24)) { img.src = bg.img; img.dataset.s = bg.img.length + ':' + bg.img.slice(-24); }
      const z = p.offsetWidth ? r.width / p.offsetWidth : 1;
      img.style.left = -((bg.b.x - bg.dx) + r.left) / z + 'px';
      img.style.top = -((bg.b.y - bg.dy) + r.top) / z + 'px';
      img.style.width = bg.sw / z + 'px'; img.style.height = bg.sh / z + 'px';
    });
  }
  let raf = 0; const soon = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(layout); };
  if (window.overlay) {
    if (window.overlay.onBg) window.overlay.onBg((b) => { bg = b; soon(); });
    if (window.overlay.onBounds) window.overlay.onBounds((b) => { if (bg) { bg.b = b; soon(); } });
    if (window.overlay.uiPrefs) window.overlay.uiPrefs().then((p) => { try { localStorage.setItem('ph_autohide', JSON.stringify(!!(p && p.autohide))); localStorage.setItem('ph_snap', p && p.snap ? '1' : ''); } catch (e) {} });
  }
  const ui = document.getElementById('ui');
  if (ui && window.ResizeObserver) new ResizeObserver(soon).observe(ui);
  const pn = document.getElementById('panel'); if (pn) new MutationObserver(soon).observe(pn, { attributes: true, attributeFilter: ['class'] });
  window.addEventListener('resize', soon);
})();
