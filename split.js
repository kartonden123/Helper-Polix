/* Режим «список слева, статья справа»: список результатов остаётся, статья открывается рядом */
(function () {
  const res = document.getElementById('res');
  if (!res) return;
  let split = false, pend = null;
  list.addEventListener('click', (e) => { pend = e.target.closest('.row,.snip'); }, true);
  const els = () => [...res.querySelectorAll('.row,.snip')];
  function mark(el) { els().forEach((x) => { x.classList.remove('sel', 'cur'); }); if (el) el.classList.add(el.classList.contains('row') ? 'sel' : 'cur'); }
  function enter() {
    if (split || view !== 'home') return;
    if (!list.querySelector('.row,.snip')) return;
    res.innerHTML = list.innerHTML; panel.classList.add('split'); split = true;
    const k = pend && pend.dataset.s != null ? '.snip[data-s="' + pend.dataset.s + '"]' : '.row[data-i="' + (pend && pend.dataset.i != null ? pend.dataset.i : sel) + '"]';
    mark(res.querySelector(k)); pend = null;
  }
  function exit() { if (!split) return; split = false; res.innerHTML = ''; panel.classList.remove('split'); }
  const _oa = openArt; openArt = function (a) { enter(); return _oa.apply(this, arguments); };
  const _os = openSnip; openSnip = function (e) { enter(); return _os.apply(this, arguments); };
  const _gb = goBack; goBack = function () { exit(); return _gb.apply(this, arguments); };
  const _r = render; render = function () { if (view === 'home') exit(); return _r.apply(this, arguments); };
  res.addEventListener('click', (e) => { const t = e.target.closest('.row,.snip'); if (!t) return; mark(t); clickRows(e); });
  document.addEventListener('keydown', (e) => {
    if (!split || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return;
    const a = els(); if (!a.length) return;
    e.preventDefault();
    let i = a.findIndex((x) => x.classList.contains('sel') || x.classList.contains('cur'));
    i = (i + (e.key === 'ArrowDown' ? 1 : -1) + a.length) % a.length;
    a[i].click(); a[i].scrollIntoView({ block: 'nearest' });
  });
})();