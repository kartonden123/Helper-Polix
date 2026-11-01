/* ИИ-помощник: 10 вопросов в день на человека. Хелпер сам подбирает нужные статьи и отправляет их ИИ как контекст. */
(function () {
  if (!(window.overlay && window.overlay.aiAsk)) return;
  const $ = (s) => document.querySelector(s);
  const X = window.PHX || {};
  const copy = X.copy || (() => {});

  const css = document.createElement('style');
  css.textContent = `
  .ai-box{width:100%;min-height:76px;resize:vertical;background:rgba(255,255,255,.06);border:1px solid var(--line);border-radius:12px;color:var(--text);font:inherit;font-size:14px;padding:10px 12px;outline:none;user-select:text}
  .ai-box:focus{border-color:rgba(var(--acc-rgb),.6)}
  .ai-meta{display:flex;justify-content:space-between;align-items:center;margin:8px 0 12px;font-size:12px;color:var(--muted)}
  .ai-ans{white-space:pre-wrap;background:rgba(255,255,255,.05);border:1px solid var(--line);border-radius:14px;padding:12px 14px;font-size:13.5px;line-height:1.5;color:#e6e1e9;user-select:text;animation:fade .4s both}
  .ai-ans.err{border-color:rgba(255,100,100,.4);color:#ff9d9d}
  .ai-src{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
  .ai-src b{background:rgba(var(--acc-rgb),.14);border:1px solid rgba(var(--acc-rgb),.35);border-radius:8px;padding:2px 9px;cursor:pointer;font-size:12px;font-weight:600}
  .ai-src b:hover{background:rgba(var(--acc-rgb),.3)}
  .ai-warn{font-size:11px;color:var(--faint);margin-top:10px}
  .aiq{margin:6px 8px 2px;padding:9px 14px;border-radius:12px;cursor:pointer;font-size:13px;background:linear-gradient(90deg,rgba(var(--acc-rgb),.2),rgba(var(--acc-rgb),.05));border:1px solid rgba(var(--acc-rgb),.4);transition:transform .18s,border-color .2s}
  .aiq:hover{transform:translateX(3px);border-color:rgba(var(--acc-rgb),.8)}
  .dots i{display:inline-block;width:6px;height:6px;margin:0 2px;border-radius:50%;background:var(--accent);animation:aidot 1s infinite ease-in-out}
  .dots i:nth-child(2){animation-delay:.15s}.dots i:nth-child(3){animation-delay:.3s}
  @keyframes aidot{0%,80%,100%{transform:scale(.4);opacity:.4}40%{transform:scale(1);opacity:1}}
  `;
  document.head.appendChild(css);

  /* ---- подбор контекста из базы ---- */
  const STOP = new Set(['что', 'как', 'какой', 'какая', 'какие', 'какое', 'можно', 'нужно', 'если', 'или', 'для', 'при', 'про', 'это', 'ли', 'где', 'когда', 'кто', 'мне', 'его', 'они', 'есть', 'быть', 'статья', 'статье', 'статьи', 'сколько', 'будет', 'тоже', 'чтобы', 'можно', 'ещё', 'еще', 'так', 'там', 'тут']);
  const stem = (w) => (w.length >= 5 ? w.slice(0, w.length - 2) : w);
  function tokens(q) { return norm(q).replace(/[^а-яa-z0-9. ]/g, ' ').split(/\s+/).filter((w) => w.length >= 3 && !STOP.has(w)).map(stem); }
  function buildContext(q) {
    const tk = tokens(q); const qn = norm(q);
    const arts = IDX.map((e) => {
      let s = 0;
      for (const t of tk) { if (e.title.includes(t)) s += 3; else if (e.text.includes(t)) s += 1; }
      const m = qn.match(/\d+(?:\.\d+)+/g) || []; if (m.includes(e.code)) s += 10;
      return { a: e.a, s };
    }).filter((x) => x.s > 0).sort((x, y) => y.s - x.s).slice(0, 5);
    const need = Math.max(1, Math.ceil(tk.length * 0.5));
    const paras = ENT.map((e) => { let s = 0; for (const t of tk) if (e.n.includes(t)) s++; return { e, s }; })
      .filter((x) => x.s >= need).sort((x, y) => y.s - x.s || x.e.p.length - y.e.p.length).slice(0, 8);
    let ctx = '';
    arts.forEach(({ a }) => { ctx += `Статья ${shortCode(a)} (${a.doc}): ${a.title || a.codeTitle || ''}. Розыск: ${a.wanted || '—'}; тюрьма: ${a.prison ? a.prison + ' мес.' : '—'}; штраф: ${a.fine ? '$' + String(a.fine).replace(/\D/g, '') : '—'}; судимость: ${a.record ? 'да' : 'нет'}. ${String(a.text || '').slice(0, 350)}\n\n`; });
    paras.forEach(({ e }) => { ctx += `[${e.d.name}] ${e.p.slice(0, 520)}\n\n`; });
    return { ctx: ctx.slice(0, 6800), arts: arts.map((x) => x.a), count: arts.length + paras.length };
  }

  /* ---- окно ИИ ---- */
  let busy = false;
  function openAI(prefill) {
    view = 'memo'; panel.classList.add('on');
    list.innerHTML = backBtn() + `<div class="det"><h2>🤖 Спросить ИИ</h2><p class="t">Задайте вопрос по кодексам, законам и уставам. ИИ ответит на основе базы хелпера.</p>
      <textarea class="ai-box" id="aiQ" maxlength="500" placeholder="Например: «можно ли задержать неприкосновенного человека за убийство?»">${esc(prefill || '')}</textarea>
      <div class="ai-meta"><span id="aiLeft">Осталось сегодня: …</span><button class="abtn on" id="aiGo">Спросить (Ctrl+Enter)</button></div>
      <div id="aiOut"></div><div class="ai-warn">ИИ может ошибаться. Проверяйте статьи по ссылкам под ответом.</div></div>`;
    $('#bk').onclick = goBack; $('#cnt').textContent = '';
    const box = $('#aiQ'); box.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.ctrlKey && e.key === 'Enter') ask(); });
    $('#aiGo').onclick = ask; box.focus();
    window.overlay.aiLeft().then((r) => { if (r && r.limit && $('#aiLeft')) $('#aiLeft').textContent = r.limit > 1000 ? 'Без ограничений' : `Осталось сегодня: ${r.remaining} из ${r.limit}`; });
  }
  async function ask() {
    if (busy) return; const qv = $('#aiQ').value.trim(); if (qv.length < 3) return;
    busy = true; $('#aiGo').disabled = true; const out = $('#aiOut'); out.innerHTML = '<div class="ai-ans"><span class="dots"><i></i><i></i><i></i></span> Думаю…</div>';
    const { ctx, arts } = buildContext(qv);
    const r = await window.overlay.aiAsk(qv, ctx || 'Подходящих статей в базе не найдено.');
    busy = false; if ($('#aiGo')) $('#aiGo').disabled = false;
    if (!$('#aiOut')) return;
    if (r && r.answer) {
      out.innerHTML = `<div class="ai-ans" id="aiAns">${esc(r.answer)}</div>${arts.length ? '<div class="ai-src">' + arts.map((a) => `<b data-c="${esc(a.code)}">ст. ${esc(shortCode(a))}</b>`).join('') + '</div>' : ''}<div class="actions" style="margin-top:10px"><button class="abtn" id="aiCp">📋 Копировать ответ</button></div>`;
      $('#aiCp').onclick = () => copy(r.answer, $('#aiCp'));
      out.querySelectorAll('.ai-src b').forEach((b) => (b.onclick = () => { const a = ITEMS.find((x) => x.code === b.dataset.c); if (a) openArt(a); }));
      if ($('#aiLeft')) $('#aiLeft').textContent = r.limit > 1000 ? 'Без ограничений' : `Осталось сегодня: ${r.remaining} из ${r.limit}`;
    } else if (r && r.error === 'limit') {
      out.innerHTML = `<div class="ai-ans err">Лимит на сегодня исчерпан (${r.limit} из ${r.limit}). Завтра вопросы обновятся.</div>`;
      if ($('#aiLeft')) $('#aiLeft').textContent = 'Осталось сегодня: 0';
    } else {
      out.innerHTML = `<div class="ai-ans err">${esc((r && r.message) || 'ИИ сейчас недоступен. Попробуйте позже. Этот вопрос не списан.')}</div>`;
    }
  }

  /* ---- точки входа: чип на главном экране, строка в результатах поиска, Ctrl+I ---- */
  const _render3 = render;
  render = function () {
    _render3();
    if (view !== 'home') return;
    if (!q.value.trim()) {
      const chips = list.querySelector('.chips');
      if (chips && !chips.querySelector('[data-ai]')) {
        chips.insertAdjacentHTML('afterbegin', '<span class="chip" data-ai="1">🤖 Спросить ИИ</span>');
        chips.querySelector('[data-ai]').onclick = (ev) => { ev.stopPropagation(); openAI(''); };
      }
    } else if (q.value.trim().split(/\s+/).length >= 2 && !list.querySelector('.aiq')) {
      const el = document.createElement('div'); el.className = 'aiq'; el.textContent = '🤖 Спросить ИИ: «' + q.value.trim().slice(0, 60) + '»';
      el.onclick = (ev) => { ev.stopPropagation(); openAI(q.value.trim()); };
      list.insertBefore(el, list.firstChild);
    }
  };
  document.addEventListener('keydown', (e) => { if (e.ctrlKey && e.key.toLowerCase() === 'i') { e.preventDefault(); openAI(q.value.trim()); } });
  render();
})();
