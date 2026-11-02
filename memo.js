/* Памятка (по таблице «Памятка Phoenix»): процесс задержания, списки, статьи-перечни, команды. */
(function () {
  const $ = (s) => document.querySelector(s);
  const A = (s) => s.split(',').map((x) => x.trim());   // список статей

  const MEMO = [
    { id: 'proc', cat: 'proc', t: 'Процесс задержания', steps: ['Наручники', 'Представиться', 'Причина задержания', 'Миранда (до 2 раз)', 'Первичный досмотр', 'Досмотр документов + гос / не гос', 'Фоторобот', 'Розыск', 'Посадить в машину', 'Доставить в ближайший КПЗ', 'Предложить реализацию права на адвоката', 'Адвокат + прокурор (если гос. или основание для освобождения)', 'Допрос'],
      notes: { 5: ['Изъятие, если участник перестрелки', 'ОБЫСК ЗАПРЕЩЕН'] }, after: ['Пункты 4–11 выполняются в любом порядке.'], steps2: ['Вторичный обыск + изъятие', 'Статьи + текст (+ метка GOS в ст., если госник)', 'Посадить в КПЗ'], start2: 14 },
    { id: 'id', cat: 'proc', t: 'Установка личности', steps: ['Наручники', '«Вы задержаны до установления Вашей личности.»', 'Представиться', 'Снять маску', 'Досмотр документов', 'Фоторобот'] },
    { id: 'coerce', cat: 'proc', t: 'Процессуальное принуждение', steps: ['Представиться', 'Причина задержания', 'Потребовать документы', 'Доставить к банкомату', 'Выписать штраф'], after: ['Если нет полномочий выписывать штраф: доставить в LSPD/LSCSD, найти сотрудника, предоставить видеофиксацию для выписки штрафа.'] },
    { id: 'force', cat: 'proc', t: 'Стадии применения силы', steps: ['Присутствие', 'Устные требования', 'Простое силовое воздействие и ударное оружие', 'Применение оружия нелетального действия и спец. средств', 'Применение летального оружия'] },
    { id: 'miranda', cat: 'proc', t: 'Правило Миранды', text: ['Вы имеете право хранить молчание. Всё, что Вы скажете, может быть и будет использовано против Вас. Вы имеете право на адвоката, частного или государственного. Вам ясны Ваши права?', 'Максимально допустимый срок посадки в КПЗ за 1 звезду: до 10 минут.'] },
    { id: 'time', cat: 'proc', t: 'Временные ограничения', kv: [['Ответ адвоката', '3 мин'], ['Ожидание адвоката', '10 мин'], ['Ответ прокурора', '3 мин'], ['Ожидание прокурора', '10 мин'], ['Ответ начальства', '10 мин'], ['Ожидание начальства', '10 мин'], ['Конфиденциальная беседа', '10 мин'], ['Телефонный звонок', '3 мин'], ['Время на задержание', '60 мин'], ['Допрос', '60 мин']] },
    { id: 'subj', cat: 'who', t: 'Субъекты задержания', list: ['Сотрудник, проводящий задержание, и напарники (до 2)', 'Задержанный', 'Адвокат', 'Прокурор; Федеральный прокурор', 'Агент отдела IB', 'Председатель Верховного суда', 'ГКА/ЗГКА или сотрудник адвокатуры младший по должности', 'Начальство сотрудников, проводивших задержание', 'Начальство задерживаемого гос. служащего', 'Министр Юстиции и его заместители', 'Сотрудник отдела DB/CID', 'Один сотрудник Weazel News', 'Один уполномоченный сотрудник Emergency Medical Service'], lettered: true },
    { id: 'rule21', cat: 'who', t: 'Правило 21 фута (6 метров)', text: ['Сотрудник, проводящий процессуальные действия, имеет право потребовать всех, кто не является субъектом задержания, держать дистанцию 6 метров.'] },
    { id: 'search', cat: 'who', t: 'Основания для личного обыска', list: ['Проход на режимный объект', 'Визит к первым лицам штата', 'В целях безопасности на различного рода мероприятиях', 'Лицо по ордеру', 'Принятие на работу и прекращение трудовых отношений', 'Проход или пребывание на закрытой территории Government', 'Добровольное согласие («Я даю свое согласие на личный обыск»)', 'Члены проверяющей комиссии во время плановой проверки государственных структур', 'Начальство задерживаемого гос. служащего', 'Лицо находится в радиусе 21 фута (6 метров) от охраняемого объекта USSS', 'USSS могут проводить личный обыск сотрудников организации в ходе прокурорской проверки'], lettered: true },
    { id: 'immune', cat: 'who', t: 'Неприкосновенные лица', list: ['Губернатор, Вице-Губернатор и советники губернатора', 'Министры и их заместители', 'Судьи штата Сан Андреас', 'Сотрудники ОГП при исполнении должностных обязанностей', 'Постоянные члены Сената (лидеры фракций + заместители)', 'Директор и заместители директора USSS при исполнении должностных обязанностей', 'Федеральные прокуроры', 'Глава Аппарата Правительства и его заместители', 'Глава Коллегии Адвокатов при исполнении должностных обязанностей'], lettered: true },
    { id: 'arts-imm', cat: 'arts', t: 'Неприкосновенного можно задержать по статьям', arts: A('6.1, 6.2, 6.3, 7.1, 8.1, 8.2, 8.3, 10.6, 12.1, 12.2, 12.3, 12.5, 12.5.1, 12.11, 12.12, 14.1, 14.2, 14.5, 16.2, 17.1, 17.2') },
    { id: 'arts-gun', cat: 'arts', t: 'Изъятие лицензии на оружие', arts: A('6.2, 6.3, 6.5, 10.6, 10.6.1, 11.2.1, 12.1, 12.3, 12.5, 12.8, 12.8.1, 14.1, 14.2, 16.2, 17.1, 17.2') },
    { id: 'arts-rec', cat: 'arts', t: 'Судимость выдаётся', text: ['Совокупный приоритет розыска по совершённым преступлениям от 4 уровня.'] },
    { id: 'arts-court', cat: 'arts', t: 'Решение выносится только судом или прокуратурой', arts: A('7.4, 7.5, 7.6, 10.11, 11.4, 11.7, 11.8, 11.10, 11.11, 12.12, 12.13, 14.3, 14.5, 14.7, 15.1, 15.1.1, 15.6, 15.10, 16.4, 16.4.1, 16.5, 16.8, 16.10, 17.5') },
    { id: 'arts-nosoft', cat: 'arts', t: 'Не может быть смягчения', arts: A('6.1, 6.2, 6.3, 7.1, 8.1, 8.2, 8.3, 10.6, 12.1, 12.2, 12.3, 12.5, 12.5.1, 12.10, 12.11, 14.1, 14.2, 14.5, 15.1.1, 16.2, 16.8, 16.18, 17.1') },
    { id: 'arts-bail', cat: 'arts', t: 'Отказ в праве выхода под залог', arts: A('6.3, 6.4, 7.1, 12.1, 12.12, 12.13, 14.1, 14.2, 14.2.1, 16.2, 16.15, 16.17, 17.1, 17.5, 17.10, 17.13'), after: ['Также при рецидиве.'] },
    { id: 'bail', cat: 'etc', t: 'Стоимость выхода под залог', kv: [['Приоритет розыска 1', '25.000$'], ['Приоритет розыска 2', '50.000$'], ['Приоритет розыска 3', '75.000$'], ['Приоритет розыска 4', '100.000$'], ['Приоритет розыска 5', '125.000$']] },
    { id: 'g13', cat: 'etc', t: 'К главе 13 УК SA', list: ['Один «Куст Green» = 5 г наркотических веществ', 'Одно «Семечко Green» = 2 г наркотических веществ', 'Green до 3 грамм (включительно) изымается без привлечения к уголовной ответственности', 'Добровольная сдача освобождает от уголовной ответственности'] },
    { id: 'cmd', cat: 'etc', t: 'Полезные команды', code: [['/su динамик кол-во причина', 'выдать розыск'], ['/pull динамик', 'вытащить игрока из машины'], ['/mark', 'откинуть код на карте']] },
    { id: 'badge', cat: 'etc', t: 'Отыгровка бейджика / жетона', text: ['/do На ноге висит жетон сотрудника с надписью [отдел/должность | фракция]'] }
  ];
  const CATS = [['all', 'Всё'], ['proc', 'Процесс'], ['who', 'Кто и когда'], ['arts', 'Статьи'], ['etc', 'Разное']];

  const css = document.createElement('style');
  css.textContent = `
  .mm-top{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:4px 0 12px}
  .mm-top input{flex:1;min-width:160px;background:rgba(255,255,255,.07);border:1px solid var(--line);border-radius:12px;color:#fff;padding:8px 12px;font:inherit;outline:none;user-select:text}
  .mm-top input:focus{border-color:rgba(var(--acc-rgb),.6)}
  .mm-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:10px}
  .mm-card{background:rgba(255,255,255,.05);border:1px solid var(--line);border-radius:16px;padding:12px 14px;animation:fade .25s both}
  .mm-card h3{margin:0 0 8px;font-size:12.5px;letter-spacing:.05em;text-transform:uppercase;color:var(--accent)}
  .mm-st{display:grid;grid-template-columns:24px 1fr;gap:8px;padding:3px 0;font-size:13px;color:#e6e1e9}
  .mm-st b{display:inline-grid;place-items:center;width:22px;height:22px;border-radius:7px;background:rgba(var(--acc-rgb),.2);color:#fff;font-size:11.5px}
  .mm-st small{display:block;color:#ffd98a;font-size:11.5px;margin-top:1px}
  .mm-li{display:grid;grid-template-columns:22px 1fr;gap:6px;padding:2px 0;font-size:13px;color:#d6d0da}.mm-li i{font-style:normal;color:var(--muted)}
  .mm-kv{display:flex;justify-content:space-between;gap:10px;padding:4px 0;border-bottom:1px dashed rgba(255,255,255,.08);font-size:13px}.mm-kv:last-child{border:0}.mm-kv b{color:#fff;white-space:nowrap}
  .mm-code{padding:5px 0;font-size:13px}.mm-code code{background:rgba(255,255,255,.1);border-radius:6px;padding:1px 7px;color:#fff;user-select:text}
  .mm-p{margin:0 0 6px;font-size:13px;color:#d6d0da}.mm-note{margin:8px 0 0;font-size:12px;color:#ffd98a}
  .mm-arts{display:flex;flex-wrap:wrap;gap:5px}.mm-arts b{background:rgba(var(--acc-rgb),.14);border:1px solid rgba(var(--acc-rgb),.35);border-radius:8px;padding:2px 9px;cursor:pointer;font-size:12.5px;transition:.15s}.mm-arts b:hover{background:rgba(var(--acc-rgb),.35)}
  `;
  document.head.appendChild(css);

  const L = 'абвгдежзиклмнопрст';
  function cardHtml(m) {
    let b = '';
    if (m.steps) {
      b += m.steps.map((s, i) => `<div class="mm-st"><b>${i + 1}</b><span>${esc(s)}${(m.notes && m.notes[i + 1]) ? m.notes[i + 1].map((n) => `<small>${esc(n)}</small>`).join('') : ''}</span></div>`).join('');
      if (m.after && m.id === 'proc') b += `<p class="mm-note">${esc(m.after[0])}</p>`;
      if (m.steps2) b += m.steps2.map((s, i) => `<div class="mm-st"><b>${m.start2 + i}</b><span>${esc(s)}</span></div>`).join('');
    }
    if (m.list) b += m.list.map((s, i) => `<div class="mm-li"><i>${m.lettered ? L[i] + ')' : '•'}</i><span>${esc(s)}</span></div>`).join('');
    if (m.kv) b += m.kv.map(([k, v]) => `<div class="mm-kv"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('');
    if (m.code) b += m.code.map(([c, d]) => `<div class="mm-code"><code>${esc(c)}</code> ${esc(d)}</div>`).join('');
    if (m.text) b += m.text.map((t) => `<p class="mm-p">${esc(t)}</p>`).join('');
    if (m.arts) b += `<div class="mm-arts">${m.arts.map((c) => `<b data-c="${esc(c)}">${esc(c)}</b>`).join('')}</div>`;
    if (m.after && m.id !== 'proc') b += `<p class="mm-note">${esc(m.after.join(' '))}</p>`;
    return `<div class="mm-card"><h3>${esc(m.t)}</h3>${b}</div>`;
  }
  const hay = (m) => (m.t + ' ' + JSON.stringify([m.steps, m.steps2, m.list, m.kv, m.code, m.text, m.arts, m.notes, m.after])).toLowerCase();

  function openMemoNew(cat, filter) {
    cat = typeof cat === 'string' ? cat : 'all'; filter = filter || '';
    view = 'memo'; panel.classList.add('on');
    const f = filter.trim().toLowerCase();
    const toks = f.split(/\s+/).filter(Boolean).map((w) => (w.length >= 5 ? w.slice(0, -2) : w));
    const shown = MEMO.filter((m) => (cat === 'all' || m.cat === cat) && toks.every((t) => hay(m).includes(t)));
    list.innerHTML = backBtn() + `<div class="det"><h2>Памятка</h2>
      <div class="mm-top"><input id="mmQ" placeholder="Поиск по памятке" value="${esc(filter)}">${CATS.map(([k, n]) => `<button class="abtn${k === cat ? ' on' : ''}" data-c="${k}">${n}</button>`).join('')}</div>
      <div class="mm-grid">${shown.map(cardHtml).join('') || '<div class="empty">Ничего не найдено</div>'}</div></div>`;
    $('#bk').onclick = goBack; $('#cnt').textContent = '';
    const q2 = $('#mmQ'); q2.addEventListener('keydown', (e) => e.stopPropagation());
    q2.oninput = () => { const pos = q2.selectionStart; openMemoNew(cat, q2.value); const n = $('#mmQ'); n.focus(); n.setSelectionRange(pos, pos); };
    list.querySelectorAll('.mm-top [data-c]').forEach((b) => (b.onclick = () => openMemoNew(b.dataset.c, q2.value)));
    list.querySelectorAll('.mm-arts b').forEach((b) => (b.onclick = () => { const a = ITEMS.find((x) => x.doc === 'УК' && x.code === b.dataset.c) || ITEMS.find((x) => shortCode(x) === b.dataset.c); if (a) { view = 'art'; prev = null; openArt(a); } }));
  }
  openMemo = openMemoNew;
  const mb = $('#memoBtn'); if (mb) mb.onclick = () => openMemoNew('all', '');
})();
