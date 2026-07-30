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

// VIDEO FACADE — a tile shows our own still until it is pressed, then becomes the real embed and plays.
// The point is that a grid of n videos loads ZERO third-party players on open: thirteen live iframes
// would paint the whole page in YouTube's chrome before anyone asked to watch anything. Pressing one
// swaps that single tile for a true autoplaying embed, so the page still delivers embedded video.
// youtube-nocookie.com, and the iframe is only ever created after a real click — so nothing is
// requested from YouTube until the visitor chooses to.
document.querySelectorAll('.vtile').forEach(btn=>{
  btn.addEventListener('click',()=>{
    const id=btn.dataset.yt; if(!id) return;
    const f=document.createElement('iframe');
    f.className='vframe';
    f.title=btn.dataset.title||'Video';
    f.src='https://www.youtube-nocookie.com/embed/'+id+'?autoplay=1&rel=0&modestbranding=1';
    f.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    f.referrerPolicy='strict-origin-when-cross-origin';
    f.allowFullscreen=true;
    btn.replaceWith(f);   // replace the BUTTON, not its contents: an iframe inside a button is unusable
  },{once:true});
});

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
