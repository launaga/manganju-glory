/* Data proyek TIDAK lagi tinggal di sini.
   Pindah ke src/data/projects.ts dan dirender server-side oleh Astro,
   supaya isinya ada di HTML awal dan terbaca crawler.
   Hover-preview di bawah tetap bekerja: ia hanya membaca DOM yang sudah ada. */

/* ---------------- reveals ---------------- */
let io, revealReady=false;
function countUp(stat){
  const el=stat.querySelector('.num'); if(!el||el.dataset.done)return;
  const raw=el.textContent.trim();
  const m=raw.match(/\d+/); if(!m){el.dataset.done=1;return;}
  const target=parseInt(m[0],10), padLen=m[0].length, suffix=raw.replace(m[0],'');
  el.dataset.done=1;
  if(window.matchMedia('(prefers-reduced-motion:reduce)').matches){el.innerHTML=String(target).padStart(padLen,'0')+(suffix?`<b>${suffix}</b>`:'');return;}
  const dur=1100, t0=performance.now();
  (function tick(now){
    const p=Math.min(1,(now-t0)/dur), e=1-Math.pow(1-p,3);
    const v=Math.round(target*e);
    el.innerHTML=String(v).padStart(padLen,'0')+(suffix?`<b>${suffix}</b>`:'');
    if(p<1)requestAnimationFrame(tick);
  })(t0);
}
function initReveals(){
  if(io)io.disconnect();
  if(!revealReady)return;
  const els=document.querySelectorAll('.reveal');
  io=new IntersectionObserver((entries)=>{
    entries.forEach(en=>{if(en.isIntersecting){
      en.target.classList.add('in');
      if(en.target.classList.contains('stat'))countUp(en.target);
      io.unobserve(en.target);
    }});
  },{threshold:.12,rootMargin:'0px 0px -8% 0px'});
  els.forEach(el=>{el.classList.remove('in');io.observe(el)});
}

/* ---------------- environment flags ---------------- */
const reduced=window.matchMedia('(prefers-reduced-motion:reduce)').matches;
const finePointer=window.matchMedia('(pointer:fine)').matches;
if(finePointer&&!reduced)document.body.classList.add('has-cursor','motion');
else if(finePointer)document.body.classList.add('motion');

/* ---------------- design system swatches ---------------- */
const SWATCHES=[
  {nm:'Paper',hx:'#F3F2EC',role:'Base surface'},
  {nm:'Paper 2',hx:'#EAE8DF',role:'Panels'},
  {nm:'Ink',hx:'#16150F',role:'Text · dark sections'},
  {nm:'Ink Soft',hx:'#56534A',role:'Secondary text'},
  {nm:'Cobalt',hx:'#1B2BD4',role:'Accent · the one voice'},
  {nm:'Hairline',hx:'#C9C5B7',role:'Dividers · borders'}
];
(function renderSwatches(){
  const wrap=document.getElementById('swatches'); if(!wrap)return;
  wrap.innerHTML=SWATCHES.map(s=>`
    <div class="sw" data-hex="${s.hx}" role="button" tabindex="0" aria-label="Copy ${s.hx}">
      <div class="chip-col" style="background:${s.hx}"></div>
      <div class="meta"><div class="nm">${s.nm}</div><div class="hx">${s.hx}</div><div class="role">${s.role}</div></div>
    </div>`).join('');
})();
const toast=document.getElementById('toast');let toastT;
function showToast(msg){if(!toast)return;toast.textContent=msg;toast.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>toast.classList.remove('show'),1400);}
function copyHex(hx){
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(hx).then(()=>showToast(hx+' copied')).catch(()=>showToast(hx));}
  else showToast(hx);
}
document.addEventListener('click',e=>{const sw=e.target.closest('.sw');if(sw)copyHex(sw.dataset.hex);});
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&document.activeElement.classList.contains('sw')){e.preventDefault();copyHex(document.activeElement.dataset.hex);}});

/* ---------------- ease replay ---------------- */
const easeDot=document.getElementById('easeDot'),replayBtn=document.getElementById('replayEase');
if(replayBtn){replayBtn.addEventListener('click',()=>{easeDot.classList.remove('run');void easeDot.offsetWidth;easeDot.classList.add('run');});}

/* ---------------- scroll progress + nav ---------------- */
const nav=document.getElementById('nav'),progress=document.getElementById('progress');
function onScroll(){
  nav.classList.toggle('scrolled',window.scrollY>20);
  const h=document.documentElement.scrollHeight-window.innerHeight;
  progress.style.width=(h>0?(window.scrollY/h)*100:0)+'%';
}
window.addEventListener('scroll',onScroll,{passive:true});

/* ---------------- mobile menu ---------------- */
const mm=document.getElementById('mobileMenu');
function closeMobile(){mm.classList.remove('open')}
document.getElementById('burger').addEventListener('click',()=>mm.classList.add('open'));
document.getElementById('closeMenu').addEventListener('click',closeMobile);

/* ---------------- contact form → same-origin CMS API ---------------- */
const cform=document.getElementById('contactForm');
if(cform){
  const status=document.getElementById('formStatus');
  const btn=cform.querySelector('button[type="submit"]');
  const btnHTML=btn.innerHTML;
  const setStatus=(msg,kind)=>{status.style.color=kind==='err'?'#c0392b':kind==='ok'?'var(--accent)':'var(--ink-soft)';status.textContent=msg;};

  /* --- attachments ---
     Files aren't uploaded (anon can't write Storage); we only note their names
     in the message so I can request them. The cap is a client-side UX guard to
     keep the picker sane, not a transport limit. */
  const MAX_FILES=3, MAX_TOTAL=3*1024*1024;
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmtSize=b=>b<1024?b+' B':b<1048576?Math.round(b/1024)+' KB':(b/1048576).toFixed(1)+' MB';
  const fileInput=document.getElementById('cf-file');
  const fileList=document.getElementById('fileList');
  let picked=[];
  const totalBytes=()=>picked.reduce((s,f)=>s+f.size,0);

  function renderFiles(){
    if(!fileList)return;
    fileList.innerHTML=picked.map((f,i)=>
      `<li><span class="fname">${esc(f.name)}</span><span class="fsize">${fmtSize(f.size)}</span>`+
      `<button type="button" class="fdel" data-i="${i}" aria-label="Hapus ${esc(f.name)}">×</button></li>`
    ).join('');
  }

  if(fileInput&&fileList){
    fileInput.addEventListener('change',()=>{
      let msg='';
      for(const f of [...fileInput.files]){
        if(picked.length>=MAX_FILES){msg='Maksimal '+MAX_FILES+' file.';break}
        if(picked.some(p=>p.name===f.name&&p.size===f.size))continue;
        picked.push(f);
      }
      if(totalBytes()>MAX_TOTAL)msg='Total lampiran melebihi 3 MB — hapus sebagian file.';
      // Clearing lets the same file be re-picked after removal; otherwise `change` never fires again.
      fileInput.value='';
      renderFiles();
      setStatus(msg,msg?'err':'');
    });
    fileList.addEventListener('click',e=>{
      const b=e.target.closest('.fdel');
      if(!b)return;
      picked.splice(Number(b.dataset.i),1);
      renderFiles();
      setStatus('','');
    });
  }

  cform.addEventListener('submit',async e=>{
    e.preventDefault();
    const name=document.getElementById('cf-name').value.trim();
    const email=document.getElementById('cf-email').value.trim();
    const message=document.getElementById('cf-msg').value.trim();
    const company=document.getElementById('cf-company').value;
    if(!name||!email||!message){setStatus('Mohon lengkapi semua kolom.','err');return;}
    if(picked.length>MAX_FILES){setStatus('Maksimal '+MAX_FILES+' file.','err');return;}
    if(totalBytes()>MAX_TOTAL){setStatus('Total lampiran melebihi 3 MB — hapus sebagian file.','err');return;}
    // Honeypot: real users never fill "company"; bots often do → fake success.
    if(company){setStatus('Terima kasih — brief Anda sudah terkirim. Saya akan segera membalas.','ok');cform.reset();picked=[];renderFiles();return;}
    btn.disabled=true;btn.style.opacity='.7';btn.innerHTML='Mengirim…';setStatus('','');
    // Attachments can't be uploaded anonymously; note their names so I can request them.
    const fullMessage=picked.length?message+'\n\n[Lampiran disebut: '+picked.map(f=>f.name).join(', ')+']':message;
    try{
      const r=await fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({name,email,message:fullMessage,company})});
      if(r.ok){
        setStatus('Terima kasih — brief Anda sudah terkirim. Saya akan segera membalas.','ok');
        cform.reset();picked=[];renderFiles();
      } else {
        setStatus('Terjadi kendala. Silakan hubungi saya langsung via WhatsApp.','err');
      }
    }catch(err){
      setStatus('Koneksi bermasalah. Silakan hubungi saya langsung via WhatsApp.','err');
    }finally{
      btn.disabled=false;btn.style.opacity='';btn.innerHTML=btnHTML;
    }
  });
}

/* ---------------- custom cursor ---------------- */
if(finePointer&&!reduced){
  const ring=document.getElementById('curRing'),dot=document.getElementById('curDot');
  let mx=innerWidth/2,my=innerHeight/2,rx=mx,ry=my;
  dot.style.transform=`translate(${mx}px,${my}px)`;ring.style.transform=`translate(${rx}px,${ry}px)`;
  window.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;dot.style.transform=`translate(${mx}px,${my}px)`;});
  (function loop(){rx+=(mx-rx)*.18;ry+=(my-ry)*.18;ring.style.transform=`translate(${rx}px,${ry}px)`;requestAnimationFrame(loop);})();
  const hot='a,button,.sw,.proj-row,.more-card,input,textarea,.replay';
  document.addEventListener('mouseover',e=>{if(e.target.closest(hot))document.body.classList.add('cursor-hot');});
  document.addEventListener('mouseout',e=>{if(e.target.closest(hot))document.body.classList.remove('cursor-hot');});
}

/* ---------------- magnetic buttons ---------------- */
if(finePointer&&!reduced){
  const bind=el=>{
    el.classList.add('mag');
    el.addEventListener('mousemove',e=>{const r=el.getBoundingClientRect();const x=e.clientX-r.left-r.width/2;const y=e.clientY-r.top-r.height/2;el.style.transform=`translate(${x*.28}px,${y*.32}px)`;});
    el.addEventListener('mouseleave',()=>{el.style.transform='';});
  };
  document.querySelectorAll('.btn,.nav-cta,.replay').forEach(bind);
}

/* ---------------- floating project preview ---------------- */
(function(){
  const pv=document.getElementById('projPreview');
  if(!pv)return;
  const pimg=pv.querySelector('img');
  let tx=0,ty=0,cx=0,cy=0,raf=null,active=false,bound=false;
  function move(){cx+=(tx-cx)*.16;cy+=(ty-cy)*.16;pv.style.left=cx+'px';pv.style.top=cy+'px';if(active)raf=requestAnimationFrame(move);}
  function enable(){
    if(bound)return;
    if(!document.body.classList.contains('motion')||!window.matchMedia('(min-width:900px)').matches)return;
    const rows=document.querySelectorAll('#featuredList .proj-row');
    if(!rows.length)return;
    bound=true;
    rows.forEach(row=>{
      row.addEventListener('mouseenter',()=>{pimg.src=row.dataset.img;cx=tx;cy=ty;active=true;pv.classList.add('show');if(!raf)move();});
      row.addEventListener('mousemove',e=>{tx=e.clientX+40;ty=e.clientY;});
      row.addEventListener('mouseleave',()=>{active=false;pv.classList.remove('show');cancelAnimationFrame(raf);raf=null;});
    });
  }
  window._enablePreview=enable;
})();

/* ---------------- boot ---------------- */
window._enablePreview&&window._enablePreview();

const loader=document.getElementById('loader');
function lift(){
  if(loader)loader.classList.add('done');
  revealReady=true;
  initReveals();
  onScroll();
}
if(reduced){revealReady=true;initReveals();onScroll();}
else{
  let lifted=false;const doLift=()=>{if(lifted)return;lifted=true;lift();};
  window.addEventListener('load',()=>setTimeout(doLift,650));
  setTimeout(doLift,1600); // safety
}
