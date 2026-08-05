/* ============================================================================
   Direction C · UNIVERS — shared behaviour
   Sticky-header shadow, masthead logo sizing, ECM scroll-reveal, active-nav,
   scroll-linked parallax, the tweaks-panel plumbing and the URL flags.
   Loaded at the end of <body> (it queries the DOM) BEFORE each page's own
   inline script, which may call syncPar() / wireSeg() / setParallax().
   Everything here tolerates a missing element, so a sub-page can carry any
   subset of the markup.
   ============================================================================ */

const header=document.getElementById('nav');
const sentinel=document.getElementById('top');
if(header && sentinel){
  new IntersectionObserver(([e])=>header.classList.toggle('solid',!e.isIntersecting),
    {rootMargin:'-72px 0px 0px 0px'}).observe(sentinel);
}

// PROTOTYPE: logo occupies ~20% of the screen width at the top and shrinks to its normal corner size on scroll
const logo=header && header.querySelector('.logo');
const logoImg=logo && logo.querySelector('img');
// 140px ≈ 63px tall on the 3-line lockup — still clears the 5.2rem (83px) header with its .9rem
// padding. Raised from 116 on 2026-07-28 at the client's request; keep in step with c-base.css's
// .logo img width, which this inline style overrides.
const LOGO_SMALL=140, LOGO_TH=360;
const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
function sizeLogo(){
  if(!logoImg) return;
  // full-screen hero mode: small fixed logo, no big→small transition (matches A/B).
  // body.sub does the same on text pages — a 20%-viewport wordmark would land on the page title.
  if(reduce || document.body.classList.contains('hero-full') || document.body.classList.contains('sub')){
    logoImg.style.width=LOGO_SMALL+'px'; return;
  }
  const t=Math.min(Math.max(scrollY,0),LOGO_TH)/LOGO_TH;       // 0 at top → 1 past threshold
  const left=logo.getBoundingClientRect().left;               // = page gutter
  const big=Math.max(LOGO_SMALL, innerWidth*0.20 - left);     // ~20% of the screen width
  logoImg.style.width=(big-(big-LOGO_SMALL)*t).toFixed(1)+'px';
}
if(!reduce){ addEventListener('scroll',sizeLogo,{passive:true}); addEventListener('resize',sizeLogo); sizeLogo(); }

// re-triggers every time an element enters the viewport (both scroll directions), like the reference site.
// NOTE: .in is toggled OFF on exit, so prose must never carry .reveal — it would blink on scroll-up.
const revObs=new IntersectionObserver(es=>es.forEach(e=>e.target.classList.toggle('in',e.isIntersecting)),{threshold:.12});
document.querySelectorAll('.reveal,.reveal-x,.reveal-l,.reveal-focus').forEach(el=>revObs.observe(el));

// active-nav — only in-page anchors participate, so sub-page nav (index.html#about) is inert here
const links=[...document.querySelectorAll('nav a, .actions a')].filter(a=>(a.getAttribute('href')||'').startsWith('#'));
links.map(a=>({a,sec:document.querySelector(a.getAttribute('href'))})).filter(x=>x.sec)
  .forEach(x=>new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){links.forEach(l=>l.classList.remove('active'));x.a.classList.add('active');}}),{rootMargin:'-50% 0px -50% 0px'}).observe(x.sec));
// at the very bottom the short footer never crosses the viewport middle — force Contact active there
addEventListener('scroll',()=>{
  if(innerHeight+scrollY>=document.body.scrollHeight-4){
    links.forEach(l=>l.classList.remove('active'));
    const c=links.find(l=>l.getAttribute('href')==='#contact');
    if(c) c.classList.add('active');
  }
},{passive:true});

// ══ THE PHONE MENU ══════════════════════════════════════════════════════════════════════════════
// ⚠️ BELOW 880px THE HEADER RENDERED NOTHING BUT THE LOGO. c-base.css's `nav,.actions{display:none}`
// switched all six links off with no hamburger and no fallback, so a phone visitor could not reach a
// single page from the header. The client's question was "da li postoji mogucnost da meni bude gore?"
// — the BAR was always at the top; it was empty.
//
// Built here rather than written into markup, and that is the load-bearing choice: the header is
// hand-written into all 15 pages, so an authored panel is 15 chances to miss one and 15 copies to
// keep in step. Cloning the header's OWN links means a nav change reaches the phone for free and the
// active-page marking travels with it.
// ⚠️ A <dialog> + showModal(), not a positioned div — Escape, the focus trap and the inertness of the
//    page behind are the platform's, not ours to reimplement.
// ⚠️ A dialog does NOT stop the body scrolling underneath, so it takes the site's one lock class.
//    `--sbw` is measured BEFORE the class goes on, the same order the modal documents.
const navHdr = document.querySelector('header#nav');
if(navHdr && !navHdr.querySelector('.navtoggle')){
  const navSrc = [...navHdr.querySelectorAll('nav a, .actions a')];
  if(navSrc.length){
    const toggle = document.createElement('button');
    toggle.className = 'navtoggle';
    toggle.type = 'button';
    toggle.textContent = 'Menu';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', 'navpanel');
    navHdr.appendChild(toggle);

    const panel = document.createElement('dialog');
    panel.className = 'navpanel';
    panel.id = 'navpanel';
    const shutBtn = document.createElement('button');
    shutBtn.className = 'navclose';
    shutBtn.type = 'button';
    shutBtn.textContent = 'Close';
    const panelNav = document.createElement('nav');
    navSrc.forEach(a => panelNav.appendChild(a.cloneNode(true)));
    panel.append(shutBtn, panelNav);
    document.body.appendChild(panel);

    const shut = () => { if(panel.open) panel.close(); };
    toggle.addEventListener('click', ()=>{
      document.documentElement.style.setProperty('--sbw',
        (innerWidth - document.documentElement.clientWidth) + 'px');
      document.documentElement.classList.add('pdlg-open');
      panel.showModal();
      toggle.setAttribute('aria-expanded', 'true');
    });
    shutBtn.addEventListener('click', shut);
    // ⚠️ A LINK MUST CLOSE THE PANEL. Five of the six are in-page or same-page anchors, which change
    //    nothing but the scroll position — without this the panel stays open over the section it
    //    just jumped to, and the site looks frozen.
    panelNav.addEventListener('click', e=>{ if(e.target.closest('a')) shut(); });
    panel.addEventListener('close', ()=>{
      document.documentElement.classList.remove('pdlg-open');
      toggle.setAttribute('aria-expanded', 'false');
    });
    // ⚠️ The panel is display:none above 880px, but a dialog opened on a phone STAYS OPEN through a
    //    rotation into tablet width — leaving an invisible modal holding the scroll lock and the
    //    focus trap over a page that looks perfectly normal and answers nothing.
    matchMedia('(min-width:881px)').addEventListener('change', e=>{ if(e.matches) shut(); });
  }
}

// PROTOTYPE: ECM-style scroll-linked parallax (Rellax analog) with SMOOTHING so content follows the scroll
// with a slight delay and settles — the fluid lag the reference site has, not a 1:1 snap. Whole block
// containers ([data-par], never .reveal elements) drift in translateY at per-block speeds, but the offset is
// computed from a LERPED scroll value (parCurrent eases toward the real scrollY), so blocks trail then catch up.
// Base offset is read with the transform cleared, so there's no feedback loop.
let parOn=true;
const parT=[...document.querySelectorAll('[data-par]')];
function measurePar(){ parT.forEach(el=>{ el.style.transform=''; el.dataset.base=(el.getBoundingClientRect().top+scrollY).toFixed(1); }); }
let parTarget=scrollY, parCurrent=scrollY, parRAF=null;
function applyPar(){
  const vc=parCurrent+innerHeight/2;
  parT.forEach(el=>{ const c=parseFloat(el.dataset.base)+el.offsetHeight/2;
    el.style.transform='translate3d(0,'+(-(c-vc)*parseFloat(el.dataset.par)).toFixed(2)+'px,0)'; });
}
function parLoop(){
  parCurrent += (parTarget-parCurrent)*0.085;   // ease → blocks trail the scroll, then settle
  applyPar();
  if(Math.abs(parTarget-parCurrent)>0.3){ parRAF=requestAnimationFrame(parLoop); }
  else { parCurrent=parTarget; applyPar(); parRAF=null; }   // final settle, exact
}
function onPar(){ parTarget=scrollY; if(parOn && !reduce && parRAF===null) parRAF=requestAnimationFrame(parLoop); }
function syncPar(){ measurePar(); parTarget=parCurrent=scrollY; applyPar(); }
if(!reduce){
  syncPar();
  addEventListener('scroll',onPar,{passive:true});
  addEventListener('resize',syncPar);
  addEventListener('load',syncPar);
}
function setParallax(on){
  parOn=on;
  if(!on){ if(parRAF){cancelAnimationFrame(parRAF);parRAF=null;} parT.forEach(el=>el.style.transform=''); }
  else if(!reduce){ syncPar(); }
}

const tw=document.getElementById('tweaks');
// NAMESPACED state class. A bare `open` collided with the homepage's hero section, which is
// <section class="open">: its rules load after c-base.css at equal specificity, so opening the
// panel handed it the hero's position:relative + display:block + min-height:100svh and the panel
// (and its gear) dropped out of fixed position, down the page. Keep this prefixed.
if(tw) tw.querySelector('.gear').addEventListener('click',()=>tw.classList.toggle('tw-open'));
function wireSeg(id,fn){ const seg=document.getElementById(id); if(!seg) return;
  seg.querySelectorAll('button').forEach(btn=>btn.addEventListener('click',()=>{
    seg.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed', b===btn)); fn(btn); })); }

// THE YEAR INDEX — shared by Projects (.chap) and Photos (.yrsec). The index is repeated once per
// section so it can stay stuck in the rail beside whatever you are reading, which means EVERY copy has
// to highlight the same year. c-base.js's active-nav observer above cannot do this — it lights exactly
// one anchor — so this paints them all from the topmost section inside the reading band.
const yrLinks=[...document.querySelectorAll('.yrnav a')];
const yrSecs=[...document.querySelectorAll('.chap[id], .yrsec[id]')];
if(yrLinks.length && yrSecs.length){
  const seen=new Map();
  const paint=()=>{
    const vis=[...seen.entries()].filter(([,r])=>r.hit).sort((a,b)=>a[1].top-b[1].top);
    const id=vis.length?vis[0][0]:null;
    yrLinks.forEach(a=>a.classList.toggle('active', !!id && a.getAttribute('href')==='#'+id));
  };
  const obs=new IntersectionObserver(es=>{
    es.forEach(e=>seen.set(e.target.id,{hit:e.isIntersecting,top:e.boundingClientRect.top}));
    paint();
  },{rootMargin:'-25% 0px -55% 0px'});
  yrSecs.forEach(c=>obs.observe(c));
}

// VIDEO — the facade still holds (a tile is our own still, and NOTHING is requested from YouTube
// until a real click), but a press now opens the shared .pdlg instead of swapping the tile in place.
// Client, 2026-08-05: "da li je moguce da videi izadju kao pop up? Kao sto je slucaj sa project
// descriptions u Projects", plus left/right within the set.
// The controller lives at the FOOT of this file, beside the modal it drives — see "THE VIDEO MODAL".

// ?reveal=all — the scroll-in on a TEXT PAGE's running paragraphs. Off by default: the pages carry
// only two entrances (title + opening paragraph on load, and the footer), and prose that lifts itself
// into place on every scroll pass is the thing that made the Manifesto feel busy. The paragraphs are
// tagged .reveal-opt rather than .reveal so "off" means genuinely no animation, not an animation
// suppressed by CSS; this promotes them and hands them to the same observer for a side-by-side look.
if(new URLSearchParams(location.search).get('reveal')==='all'){
  document.querySelectorAll('.reveal-opt').forEach(el=>{ el.classList.add('reveal'); revObs.observe(el); });
}

// ?cta=solid — the Donate button filled (paper on ink) instead of the sanctioned hairline box.
// Default is the box: it is the header .donate chip promoted to page scale, so it adds no new
// vocabulary, where a filled block is a second departure from sub.css's no-ornament rule.
if(location.search.includes('cta=solid')) document.body.classList.add('cta-solid');
if(location.search.includes('clean')) document.body.classList.add('clean');
if(location.search.includes('drawin')) document.body.classList.add('draw-in');
if(location.search.includes('openpanel') && tw) tw.classList.add('tw-open');
// PROTOTYPE: ?seek=<px> pulls content up so headless top-anchored shots can reach lower sections
const seek=new URLSearchParams(location.search).get('seek');
if(seek){ document.body.style.marginTop='-'+parseInt(seek,10)+'px'; if(!reduce){syncPar();} }

// ══ THE MODAL CONTROLLER — .pdlg ═════════════════════════════════════════════════════════
// PROMOTED HERE from build-projects.py (2026-08-04): Projects, Team and Board all run it.
// ⚠️ ITS CSS MOVED WITH IT, into sub.css. Never separate them — that is how this exact
// controller was lost once, leaving a fully green verification history and a dead click.
// It binds nothing per control: both hit areas carry data-dlg and the click is delegated on
// the document, so a page with two dialogs and a page with fourteen need no different setup.
// Pages with no .pdlg cost one empty querySelectorAll.
// ── PROJECT DETAILS, THE MODAL CONTROLLER ───────────────────────────────────────────────────
// Lives here, beside its own CSS, because Projects is the only page with a .pdlg — sub.css owns
// the control's LOOK (shared with Donate), this owns the behaviour.
// Both hit areas carry data-dlg (the facts-column button, and the poster where there is one), and
// a two-year tour points both years at the ONE dialog — so this delegates on the document instead
// of binding per control, and the same id being opened from four places is not a special case.
const pdBody = dlg => dlg.querySelector('.pdbody');

// The fade is on ONLY while something is still below, so the last line is never left under a veil
// once you reach the end. The -1px absorbs sub-pixel scrollHeight rounding, which otherwise leaves
// the fade lit at the true bottom.
function pdFade(dlg){
  const b = pdBody(dlg); if(!b) return;
  dlg.classList.toggle('pd-fade', b.scrollTop + b.clientHeight < b.scrollHeight - 1);
}

function pdOpen(id){
  const dlg = document.getElementById(id); if(!dlg || dlg.open) return;
  // ⚠️ --sbw MUST be measured BEFORE the lock. Once html carries overflow:hidden the scrollbar is
  // already gone, the difference reads 0, and the padding that compensates for it never appears —
  // so the whole page shifts by the scrollbar's width the moment a modal opens (not on macOS,
  // which overlays, which is exactly why this regresses unnoticed).
  document.documentElement.style.setProperty('--sbw',
    (innerWidth - document.documentElement.clientWidth) + 'px');
  document.documentElement.classList.add('pdlg-open');
  dlg.showModal();                // autofocus on .pdbody lands focus on the prose, not on Close
  // ⚠️ RESET AFTER showModal(), never before. A closed dialog is display:none, so it has no scroll
  // box at all and scrollTop=0 is silently discarded — then the browser restores the previous
  // offset when it becomes visible, and a reopen drops you mid-sentence where you last stopped.
  const b = pdBody(dlg);
  if(b) b.scrollTop = 0;
  pdFade(dlg);
}

document.querySelectorAll('.pdlg').forEach(dlg=>{
  const b = pdBody(dlg);
  if(b) b.addEventListener('scroll', ()=>pdFade(dlg), {passive:true});
  // ⚠️ ONE release point for EVERY close path — Escape, the Close button, the backdrop, .close()
  // from the ?open= flag all raise 'close'. A lock released on some paths and not others strands
  // the page unscrollable with no modal on screen and no way back.
  dlg.addEventListener('close', ()=>{
    document.documentElement.classList.remove('pdlg-open');
    dlg.classList.remove('pd-fade');
  });
  // The backdrop IS the dialog's own box: .pdlg has padding:0 and .pdhead/.pdbody cover it, so a
  // click whose target is the dialog element itself arrived from outside the panel.
  dlg.addEventListener('click', e=>{ if(e.target===dlg) dlg.close(); });
  dlg.querySelectorAll('[data-pdclose]').forEach(x=>x.addEventListener('click', ()=>dlg.close()));
});

document.addEventListener('click', e=>{
  const t = e.target.closest('[data-dlg]');
  if(t) pdOpen(t.dataset.dlg);
});
addEventListener('resize', ()=>document.querySelectorAll('.pdlg[open]').forEach(pdFade));

// ?open=<project-slug|year> — opens one modal for a review shot. The dialogs are keyed by PROJECT
// and the chapters by YEAR, so a year is resolved through whatever control that chapter carries.
const pdWant = new URLSearchParams(location.search).get('open');
if(pdWant){
  const byYear = document.querySelector('#y'+pdWant+' [data-dlg]');
  pdOpen(byYear ? byYear.dataset.dlg : pdWant+'-dlg');
}

// ══ THE VIDEO MODAL — ONE dialog for all thirteen, with prev/next ═══════════════════════════════
// Client, 2026-08-05. It is a .pdlg, so scroll-lock, --sbw, the backdrop click, Escape, [data-pdclose]
// and the single release-on-close path all come from the block above for free — this adds only the
// playlist. The thirteen TILES stay in the grid untouched; a press no longer consumes its own tile.
//
// ⚠️ THE TILES ARE NOT GIVEN data-dlg. The delegated opener above would then fire alongside this
//    handler on the same click, and pdOpen would run twice on one press. Wiring the tiles directly
//    keeps one call site, and it is also what lets the index be known before the dialog opens.
// ⚠️ THE IFRAME IS DESTROYED ON CLOSE, and that is not tidiness. A YouTube embed left in the DOM
//    keeps PLAYING — audio carries on behind a dismissed dialog with nothing on screen to stop it.
// ⚠️ prev/next REPLACE the iframe rather than reusing one and re-pointing src. A src swap leaves the
//    previous video's player state in the frame's history, so Back inside the embed walks the
//    playlist backwards while the page's own Back does something else entirely.
const vdlg = document.getElementById('video-dlg');
if(vdlg){
  const tiles = [...document.querySelectorAll('.vtile')];
  const slot  = vdlg.querySelector('.vslot');
  const ttl   = vdlg.querySelector('.pdt');
  const count = vdlg.querySelector('.vcount');
  let vi = -1;

  function vload(n){
    if(!tiles.length) return;
    vi = (n + tiles.length) % tiles.length;      // wraps both ways: next past the last returns to 1
    const t = tiles[vi], title = t.dataset.title || 'Video';
    ttl.textContent = title;
    count.textContent = (vi + 1) + ' / ' + tiles.length;
    slot.textContent = '';
    const f = document.createElement('iframe');
    f.className = 'vframe';
    f.title = title;
    f.src = 'https://www.youtube-nocookie.com/embed/' + t.dataset.yt + '?autoplay=1&rel=0&modestbranding=1';
    f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    f.referrerPolicy = 'strict-origin-when-cross-origin';
    f.allowFullscreen = true;
    slot.appendChild(f);
  }

  // ── OUR CHROME GETS OUT OF THE WAY WHILE YOU WATCH ─────────────────────────────────────────────
  // The head and the prev/next row fade after a few idle seconds so the picture is the only thing
  // on screen, and come back on any pointer move, key or tap inside the dialog.
  // ⚠️ AN IFRAME SWALLOWS POINTER EVENTS — a cross-origin embed gives the page no mousemove at all
  //    while the cursor is over the player, so "show on move" cannot fire there. It fires the moment
  //    the pointer leaves the picture, which is exactly when it is heading for a control, so
  //    approaching the chrome is what reveals it. Do not "fix" this with a timer that polls.
  // ⚠️ NEVER HIDE A CONTROL THAT HAS FOCUS or one the pointer is resting on — a keyboard user tabbed
  //    onto Close would otherwise watch it vanish under them.
  // ⚠️ Off entirely under reduced motion: hiding the only visible way out is a change we should not
  //    make for someone who has asked the interface to stop moving. Escape always works regardless.
  const HIDE_MS = 2600;
  let vhide;
  function chromeOn(){
    vdlg.classList.remove('chrome-off');
    clearTimeout(vhide);
    if(reduce || !vdlg.open) return;
    vhide = setTimeout(()=>{
      if(!vdlg.open) return;
      // ⚠️ `:focus-visible`, NOT `document.activeElement`. A mouse click LEAVES focus on the button
      //    it pressed, so testing for focus at all meant that pressing Next pinned the chrome open
      //    for the rest of the video — the one moment you most want it gone. `:focus-visible` is the
      //    browser's own answer to "is this person navigating by keyboard", which is the only case
      //    where hiding a control would strand someone.
      if(vdlg.querySelector('.pdhead :focus-visible, .vnav :focus-visible')) return;
      if(vdlg.querySelector('.pdhead:hover, .vnav:hover')) return;
      vdlg.classList.add('chrome-off');
    }, HIDE_MS);
  }
  ['pointermove','pointerdown','focusin'].forEach(ev => vdlg.addEventListener(ev, chromeOn));

  tiles.forEach((t,n)=>t.addEventListener('click',()=>{ vload(n); pdOpen('video-dlg'); chromeOn(); }));
  vdlg.querySelector('.vprev').addEventListener('click', ()=>{ vload(vi - 1); chromeOn(); });
  vdlg.querySelector('.vnext').addEventListener('click', ()=>{ vload(vi + 1); chromeOn(); });
  // arrows only while it is open, and only when focus is not inside the embed (YouTube takes its own)
  addEventListener('keydown', e=>{
    if(!vdlg.open || e.target.tagName === 'IFRAME') return;
    chromeOn();
    if(e.key === 'ArrowLeft')  vload(vi - 1);
    if(e.key === 'ArrowRight') vload(vi + 1);
  });
  vdlg.addEventListener('close', ()=>{
    slot.textContent = '';
    clearTimeout(vhide);
    vdlg.classList.remove('chrome-off');   // never reopen already faded
  });
}
