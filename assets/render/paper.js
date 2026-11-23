// Shared paper cut-out look for every panel: textured paper, a top sheet with the traces cut out of it,
// pieces of paper with their own shadows, and stop-motion jitter. The page defines ctx (its 2d context).
const PC={under:'#15302a',sheet:'#44705a',core:'#b4cbbb',tape:'#7fa38e',board:'#2d5543',gold:'#d4a94e',goldHi:'#ecc977',char:'#2a2a2c',silver:'#b9bfc2',tan:'#a8906a',
  cream:'#f1e8d4',white:'#ece6d6',ochre:'#d9b56c',mint:'#cfe0d2',ink:'#1b1b1d',red:'#c9584a',yellow:'#e8c25a',blue:'#6f9cc9',green:'#86b77c'};
const CUT=5.2,FPS=12;
let PAT={},BOIL=0;
function mk(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function hash(a,b){let h=(a*374761393+b*668265263)|0;h=(h^(h>>>13))*1274126177|0;return ((h^(h>>>16))>>>0)/4294967296;}
function rrect(c,x,y,w,h,r){c.beginPath();c.roundRect(x,y,w,h,r);}
function path(c,pts){c.beginPath();c.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)c.lineTo(pts[i][0],pts[i][1]);}
// a repeating tile of coloured paper: grain, a few fibres, soft blotches
function tex(color,s){const n=384,c=mk(n,n),x=c.getContext('2d');x.fillStyle=color;x.fillRect(0,0,n,n);
  const img=x.getImageData(0,0,n,n),d=img.data;let sd=s*7919+3;const r=()=>{sd=(sd*16807)%2147483647;return sd/2147483647;};
  for(let i=0;i<d.length;i+=4){const v=(r()-.5)*20+(r()<.02?(r()-.5)*30:0);d[i]+=v;d[i+1]+=v;d[i+2]+=v;}
  x.putImageData(img,0,0);
  const sm=mk(12,12),sx=sm.getContext('2d');for(let i=0;i<144;i++){const g=r();sx.fillStyle=g<.5?'rgba(0,0,0,'+((.5-g)*.12)+')':'rgba(255,255,255,'+((g-.5)*.1)+')';sx.fillRect(i%12,Math.floor(i/12),1,1);}
  x.filter='blur(14px)';x.drawImage(sm,-40,-40,n+80,n+80);x.filter='none';
  x.lineWidth=.7;for(let i=0;i<420;i++){const a=r()*7,l=5+r()*22,px=r()*n,py=r()*n;x.strokeStyle=r()<.5?'rgba(255,255,255,.09)':'rgba(0,0,0,.07)';
    x.beginPath();x.moveTo(px,py);x.quadraticCurveTo(px+Math.cos(a)*l*.5+r()*3,py+Math.sin(a)*l*.5,px+Math.cos(a)*l,py+Math.sin(a)*l);x.stroke();}
  return ctx.createPattern(c,'repeat');}
function paperInit(extra){PAT={};const all=Object.assign({},PC,extra||{});let i=0;for(const k in all)PAT[k]=tex(all[k],++i*31);}
// stop-motion: frames are quantised to 12 fps and every piece shifts a hair every second frame
function setFrame(t){const n=Math.floor(t*FPS+1e-6);BOIL=Math.floor(n/2);return n/FPS;}
function jit(id){return [(hash(id,BOIL*3)-.5)*.9,(hash(id,BOIL*3+1)-.5)*.9,(hash(id,BOIL*3+2)-.5)*.006];}
// one piece of paper at cx,cy; lift = how far it sits above the sheet (shadow size)
function piece(id,cx,cy,draw,lift){const j=jit(id),L=lift===undefined?1:lift;ctx.save();ctx.translate(cx+j[0],cy+j[1]);ctx.rotate(j[2]);
  ctx.shadowColor='rgba(0,0,0,'+(0.38+0.08*L)+')';ctx.shadowBlur=4+3*L;ctx.shadowOffsetX=2+1.5*L;ctx.shadowOffsetY=3+2*L;draw(ctx);ctx.restore();}
function donut(c,R,r){c.beginPath();c.arc(0,0,R,0,7);c.arc(0,0,r,0,7,true);c.fill();}
// text cut out letter by letter, each letter its own slightly turned piece
function letters(id0,text,x,y,font,ls,pat,lift,rot,align){ctx.font=font;ctx.letterSpacing='0px';const ch=[...text],ws=ch.map(c=>ctx.measureText(c).width);
  const tw=ws.reduce((a,b)=>a+b,0)+ls*(ch.length-1);let cx=align==='center'?x-tw/2:align==='right'?x-tw:x;
  ch.forEach((c0,i)=>{const w=ws[i];if(c0!==' '){const r=(hash(id0,i)-.5)*rot;piece(id0*100+i,cx+w/2,y,c=>{c.rotate(r);c.font=font;c.textAlign='center';c.fillStyle=pat;c.fillText(c0,0,0);},lift);}cx+=w+ls;});}
// small text cut out as one strip
function label(id,text,x,y,font,pat,lift,align,ls){piece(id,x,y,c=>{c.font=font;c.letterSpacing=(ls||0)+'px';c.textAlign=align||'left';c.fillStyle=pat;c.fillText(text,0,0);},lift===undefined?.4:lift);}
// the top sheet: a paper rectangle inside clip rect K with everything cut() draws removed; rim = the lighter paper core seen at cut edges
function makeSheet(W,H,K,inset,radius,cut){const s=mk(W,H),x=s.getContext('2d');x.fillStyle=PAT.sheet;rrect(x,K[0]+inset,K[1]+inset,K[2]-2*inset,K[3]-2*inset,radius);x.fill();
  x.globalCompositeOperation='destination-out';x.lineCap='round';x.lineJoin='round';x.strokeStyle='#000';x.fillStyle='#000';cut(x);x.globalCompositeOperation='source-over';
  const r=mk(W,H),rx=r.getContext('2d');rx.drawImage(s,0,0);rx.globalCompositeOperation='source-in';rx.fillStyle=PC.core;rx.fillRect(0,0,W,H);return {sheet:s,rim:r};}
function drawSheet(S){const j=jit(7);ctx.save();ctx.globalAlpha=.85;ctx.drawImage(S.rim,j[0]*.5-1.1,j[1]*.5-1.1);ctx.restore();
  ctx.save();ctx.shadowColor='rgba(0,0,0,.55)';ctx.shadowBlur=6;ctx.shadowOffsetX=3;ctx.shadowOffsetY=4;ctx.drawImage(S.sheet,j[0]*.5,j[1]*.5);ctx.restore();}
// soft, uneven light over the whole set, like a photo of real paper (applied with soft-light)
function makeLight(W,H,lx,ly,R){const L=mk(W,H),c=L.getContext('2d');const g=c.createRadialGradient(lx,ly,40,lx+140,ly+100,R);g.addColorStop(0,'rgba(255,248,230,.55)');g.addColorStop(1,'rgba(0,0,0,.5)');c.fillStyle=g;c.fillRect(0,0,W,H);
  let s=5;const r=()=>{s=(s*16807)%2147483647;return s/2147483647;};const gw=Math.max(4,Math.round(W/40)),gh=Math.max(4,Math.round(H/40)),sm=mk(gw,gh),x=sm.getContext('2d');
  for(let i=0;i<gw*gh;i++){const v=r();x.fillStyle=v<.5?'rgba(0,0,0,'+((.5-v)*.35)+')':'rgba(255,255,255,'+((v-.5)*.3)+')';x.fillRect(i%gw,Math.floor(i/gw),1,1);}
  c.filter='blur(30px)';c.drawImage(sm,-60,-60,W+120,H+120);c.filter='none';return L;}
function applyLight(L){ctx.globalCompositeOperation='soft-light';ctx.drawImage(L,0,0);ctx.globalCompositeOperation='source-over';}
// gold paper strips sliding along inside the cut grooves (drawn before the sheet, so the sheet covers their ends)
function grooveTokens(signals,t,T,V,len){const j=jit(7);ctx.save();ctx.translate(j[0]*.5,j[1]*.5);ctx.lineCap='butt';ctx.lineJoin='round';ctx.strokeStyle=PAT.gold;ctx.lineWidth=CUT;
  for(const s of signals){const dt=((t-s.t0)%T+T)%T,head=dt*V,L=s.s.length-1;if(head-len>L)continue;const a=Math.max(0,Math.floor(head-len)),b=Math.min(L,Math.floor(head));if(b<=a)continue;
    ctx.beginPath();ctx.moveTo(s.s[a][0],s.s[a][1]);for(let i=a+1;i<=b;i++)ctx.lineTo(s.s[i][0],s.s[i][1]);ctx.stroke();}
  ctx.restore();}
