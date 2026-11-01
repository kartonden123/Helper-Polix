/* Анимации интерфейса. Всё отключается, если в Windows включено «уменьшить движение». */
(function () {
  const css = document.createElement('style');
  css.textContent = `
  /* логотип: один оборот при открытии, лёгкое увеличение при наведении */
  .logo{width:32px!important;height:32px!important;border-radius:8px;transition:transform .35s cubic-bezier(.3,1.4,.5,1),filter .3s;animation:logoIn .8s cubic-bezier(.2,.9,.3,1.2) both}
  .logo:hover{transform:scale(1.15) rotate(-6deg);filter:drop-shadow(0 0 8px rgba(var(--acc-rgb,255,77,109),.8))}
  @keyframes logoIn{from{transform:rotate(-180deg) scale(.3);opacity:0}to{transform:none;opacity:1}}
  /* кнопки панели */
  .ib{transition:transform .18s cubic-bezier(.3,1.4,.5,1),background .2s,border-color .2s,color .2s,box-shadow .2s}
  .ib:hover{transform:translateY(-2px) scale(1.06);box-shadow:0 6px 16px -6px rgba(var(--acc-rgb,255,77,109),.7)}
  .ib:active{transform:scale(.9)}
  .bar .ib{animation:popIn .45s cubic-bezier(.3,1.5,.5,1) both}
  .bar .ib:nth-of-type(1){animation-delay:.05s}.bar .ib:nth-of-type(2){animation-delay:.1s}.bar .ib:nth-of-type(3){animation-delay:.15s}.bar .ib:nth-of-type(4){animation-delay:.2s}.bar .ib:nth-of-type(5){animation-delay:.25s}.bar .ib:nth-of-type(6){animation-delay:.3s}.bar .ib:nth-of-type(7){animation-delay:.35s}
  @keyframes popIn{from{transform:scale(.4);opacity:0}to{transform:none;opacity:1}}
  .seg{animation:popIn .45s .05s cubic-bezier(.3,1.5,.5,1) both}
  .seg button{transition:background .25s,color .25s,transform .15s}.seg button:active{transform:scale(.92)}
  /* строки результатов */
  .row{transition:background .18s,transform .18s cubic-bezier(.3,1.3,.5,1),border-color .2s,box-shadow .2s}
  .row:hover{transform:translateX(4px)}
  .row:active{transform:translateX(4px) scale(.99)}
  .row .code{transition:color .2s,transform .2s}.row:hover .code{color:var(--accent);transform:scale(1.06)}
  .pill{transition:transform .2s}.row:hover .pill{transform:scale(1.08)}
  .qb{transition:transform .18s cubic-bezier(.3,1.5,.5,1),background .2s,border-color .2s}
  .qb:hover{transform:scale(1.15)}.qb:active{transform:scale(.85)}
  .qb.on{animation:favPop .5s cubic-bezier(.3,1.6,.5,1)}
  @keyframes favPop{0%{transform:scale(.6) rotate(-25deg)}60%{transform:scale(1.3) rotate(8deg)}100%{transform:none}}
  /* чипы и кнопки действий */
  .chip,.fchip,.abtn,.swb,.prem-btn{transition:transform .18s cubic-bezier(.3,1.4,.5,1),background .2s,border-color .2s,color .2s,box-shadow .2s}
  .chip:hover,.fchip:hover,.abtn:hover,.swb:hover{transform:translateY(-2px)}
  .chip:active,.fchip:active,.abtn:active,.swb:active{transform:scale(.93)}
  .chips .chip{animation:popIn .4s cubic-bezier(.3,1.5,.5,1) both}
  .chips .chip:nth-child(1){animation-delay:.02s}.chips .chip:nth-child(2){animation-delay:.06s}.chips .chip:nth-child(3){animation-delay:.1s}.chips .chip:nth-child(4){animation-delay:.14s}.chips .chip:nth-child(5){animation-delay:.18s}.chips .chip:nth-child(6){animation-delay:.22s}.chips .chip:nth-child(7){animation-delay:.26s}.chips .chip:nth-child(8){animation-delay:.3s}.chips .chip:nth-child(9){animation-delay:.34s}.chips .chip:nth-child(10){animation-delay:.38s}
  .fbar .fchip{animation:popIn .35s cubic-bezier(.3,1.5,.5,1) both}
  /* карточки и блоки */
  .det h2{animation:slideR .45s cubic-bezier(.2,.9,.3,1) both}
  .det .t{animation:fade .5s .08s both}
  .stats>div,.adm-top>div,.total>div{animation:popIn .45s cubic-bezier(.3,1.4,.5,1) both}
  .stats>div:nth-child(2),.adm-top>div:nth-child(2),.total>div:nth-child(2){animation-delay:.07s}
  .stats>div:nth-child(3),.adm-top>div:nth-child(3),.total>div:nth-child(3){animation-delay:.14s}
  .stats>div:nth-child(4),.adm-top>div:nth-child(4),.total>div:nth-child(4){animation-delay:.21s}
  .total>div:nth-child(5){animation-delay:.28s}
  .stats>div,.adm-top>div,.total>div{transition:transform .2s,border-color .2s}.stats>div:hover,.adm-top>div:hover,.total>div:hover{transform:translateY(-3px);border-color:rgba(var(--acc-rgb,255,77,109),.5)}
  .txt,.note,.actions{animation:fade .5s .12s both}
  .imm div,.memo p,.memo h3{animation:slideR .4s cubic-bezier(.2,.9,.3,1) both}
  .imm div:nth-child(2){animation-delay:.04s}.imm div:nth-child(3){animation-delay:.08s}.imm div:nth-child(4){animation-delay:.12s}.imm div:nth-child(5){animation-delay:.16s}.imm div:nth-child(6){animation-delay:.2s}.imm div:nth-child(7){animation-delay:.24s}.imm div:nth-child(8){animation-delay:.28s}.imm div:nth-child(9){animation-delay:.32s}
  .arts b{transition:transform .15s,background .2s;animation:popIn .35s cubic-bezier(.3,1.5,.5,1) both}.arts b:hover{transform:translateY(-2px) scale(1.08);background:rgba(var(--acc-rgb,255,77,109),.3)}
  .case-row,.adm-row,.tm-row,.snip{animation:slideR .4s cubic-bezier(.2,.9,.3,1) both;transition:background .2s,transform .2s}
  .case-row:nth-child(2),.adm-row:nth-child(2){animation-delay:.05s}.case-row:nth-child(3),.adm-row:nth-child(3){animation-delay:.1s}.case-row:nth-child(4),.adm-row:nth-child(4){animation-delay:.15s}.case-row:nth-child(5),.adm-row:nth-child(5){animation-delay:.2s}
  .snip:hover,.adm-row:hover{transform:translateX(3px)}
  .xbtn{transition:transform .2s,color .2s}.xbtn:hover{transform:rotate(90deg) scale(1.2)}
  .back{transition:transform .2s,color .2s}.back:hover{transform:translateX(-4px)}
  .badge{animation:popIn .4s cubic-bezier(.3,1.8,.5,1) both}
  .stars{display:inline-block;transition:transform .25s}.row:hover .stars{transform:scale(1.1)}
  .dot.on{animation:dotPulse 2s ease-in-out infinite}
  @keyframes dotPulse{0%,100%{box-shadow:0 0 4px #3ddc84}50%{box-shadow:0 0 12px #3ddc84}}
  .tm-row.done{animation:shake .6s both}
  @keyframes shake{0%,100%{transform:none}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
  @keyframes slideR{from{opacity:0;transform:translateX(-14px)}to{opacity:1;transform:none}}
  /* строка поиска */
  #q{transition:letter-spacing .25s}.bar:focus-within #q{letter-spacing:.2px}
  .bar{transition:border-color .25s,box-shadow .25s,transform .25s}
  .panel{transform-origin:top center}
  .brand,.by{animation:fade .6s .3s both}
  .tab{animation:slideD .5s .1s cubic-bezier(.2,.9,.3,1) both}
  @keyframes slideD{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:none}}
  .sec{animation:fade .4s both}
  #login-btn,#go{transition:transform .15s,filter .2s,box-shadow .2s}#go:hover{box-shadow:0 8px 24px -8px #5865f2}
  .card .brand{animation:slideD .5s both}
  `;
  document.head.appendChild(css);
})();
