/* Analyse transverse des radars RSSI : graphiques (SVG natif, sans dépendance) */
(function () {
'use strict';
if (!document.getElementById('retro-c1')) return;
const Y=[2011,2012,2013,2014,2015,2016,2017,2018,2019,2020,2021,2022,2023,2024,2025,2026];
const E=[22,67,27,33,21,26,25,35,47,38,43,42,58,55,70,76],T=[40,81,17,24,22,26,43,51,54,48,40,46,55,60,64,58],M=[22,52,16,19,14,12,28,22,21,19,21,25,22,21,25,25];
const NS="http://www.w3.org/2000/svg";
const tip=document.getElementById('retro-tip');
function el(p,t,a){const e=document.createElementNS(NS,t);for(const k in a)e.setAttribute(k,a[k]);p.appendChild(e);return e}
function txt(p,x,y,s,a={}){const t=el(p,'text',Object.assign({x,y},a));t.textContent=s;return t}
function hover(node,html){node.addEventListener('pointermove',ev=>{tip.innerHTML=html;tip.hidden=false;const w=tip.offsetWidth;let x=ev.clientX+12;if(x+w>innerWidth-8)x=ev.clientX-w-12;tip.style.left=x+'px';tip.style.top=(ev.clientY+12)+'px'});node.addEventListener('pointerleave',()=>tip.hidden=true)}
function frame(svg,W,H,pad,max,step,fmt=v=>v){
  const ih=H-pad.t-pad.b, y=v=>pad.t+ih-(v/max)*ih;
  for(let v=0;v<=max;v+=step){el(svg,'line',{x1:pad.l,x2:W-pad.r,y1:y(v),y2:y(v),stroke:'var(--rule)','stroke-width':1});txt(svg,pad.l-6,y(v)+3.5,fmt(v),{'text-anchor':'end'})}
  return y;
}
function stacked(id,series,cols,max,step,labels,H=260){
  const svg=document.getElementById('retro-'+id),W=720,pad={l:36,r:8,t:10,b:24};
  const y=frame(svg,W,H,pad,max,step);const n=Y.length,bw=(W-pad.l-pad.r)/n;
  Y.forEach((yr,i)=>{let acc=0;const x=pad.l+i*bw+bw*0.18,w=bw*0.64;let tot=series.reduce((s,a)=>s+a[i],0);
    series.forEach((s,k)=>{if(!s[i])return;const y0=y(acc),y1=y(acc+s[i]);el(svg,'rect',{x,y:y1+1,width:w,height:Math.max(0,y0-y1-2),fill:cols[k],rx:k===series.length-1?3:1});acc+=s[i]});
    if(tot)txt(svg,x+w/2,y(tot)-4,tot,{'text-anchor':'middle',class:'lbl','font-size':'10'});
    txt(svg,x+w/2,H-8,"’"+String(yr).slice(2),{'text-anchor':'middle'});
    const h=el(svg,'rect',{x:pad.l+i*bw,y:pad.t,width:bw,height:H-pad.t-pad.b,class:'hit'});
    hover(h,`<b>${yr}</b><br>`+labels.map((l,k)=>`${l} : ${series[k][i]}`).join('<br>')+`<br>Total : ${tot}`);
  });
}
function lines(id,series,cols,names,max,step,H,unit='%'){
  const svg=document.getElementById('retro-'+id),W=720,pad={l:36,r:120,t:12,b:24};
  const y=frame(svg,W,H,pad,max,step,v=>v+unit);const n=Y.length,x=i=>pad.l+i*(W-pad.l-pad.r)/(n-1);
  Y.forEach((yr,i)=>txt(svg,x(i),H-8,"’"+String(yr).slice(2),{'text-anchor':'middle'}));
  series.forEach((s,k)=>{el(svg,'polyline',{points:s.map((v,i)=>x(i)+','+y(v)).join(' '),fill:'none',stroke:cols[k],'stroke-width':2,'stroke-linejoin':'round'});
    const L=s.length-1;el(svg,'circle',{cx:x(L),cy:y(s[L]),r:4,fill:cols[k],stroke:'var(--surface)','stroke-width':2});
    const o=series.length===2?(s[L]>=series[1-k][L]?-5:9):4;
    txt(svg,x(L)+9,y(s[L])+o,s[L]+unit+'  '+names[k],{class:'lbl'})});
  Y.forEach((yr,i)=>{const h=el(svg,'rect',{x:x(i)-(W-pad.l-pad.r)/(n-1)/2,y:pad.t,width:(W-pad.l-pad.r)/(n-1),height:H-pad.t-pad.b,class:'hit'});hover(h,`<b>${yr}</b><br>`+names.map((nm,k)=>`${nm} : ${series[k][i]}${unit}`).join('<br>'))});
}
const MC=['var(--m-m)','var(--m-t)','var(--m-e)'];
stacked('c1',[M,T,E],MC,220,50,['Mature','Trending','Emerging']);
lines('c6',[[20,12,13,12,12,11,9,8,6,5,7,7,5,5,5,5],[1,2,3,3,4,5,5,6,6,7,6,5,6,5,6,7]],['var(--s1)','var(--s2)'],['Continuité','Résilience cyber'],25,5,220);
// AI stacked
(function(){const aE=[0,0,0,0,0,1,2,2,2,1,2,4,3,7,8,15],aT=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2],aM=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1];stacked('c7',[aM,aT,aE],MC,20,5,['Mature','Trending','Emerging'],220)})();
// horizontal bars helper
function hbars(id,rows,H,max,col){const svg=document.getElementById('retro-'+id),W=720,l=250,r=60,bh=(H-10)/rows.length;
  rows.forEach((d,i)=>{const yy=6+i*bh,w=(W-l-r)*d[1]/max;txt(svg,l-10,yy+bh/2+4,d[0],{'text-anchor':'end',class:'lbl'});
    el(svg,'rect',{x:l,y:yy+bh*0.2,width:Math.max(w,2),height:bh*0.6,fill:col,rx:3});
    txt(svg,l+w+8,yy+bh/2+4,d[2]||d[1],{class:'lbl'});const h=el(svg,'rect',{x:0,y:yy,width:W,height:bh,class:'hit'});hover(h,`${d[0]} : ${d[2]||d[1]}`)})}
hbars('c3',[['Apparus en 2025–2026',68,'68 (43 %)'],['Apparus en 2023–2024',50,'50 (31 %)'],['Apparus en 2017–2022',36,'36 (23 %)'],['Apparus avant 2017',5,'5 (3 %)']],190,70,'var(--m-t)');

// timeline: signal, crisis, response
(function(){
 const R=[
  ["Attaques destructrices",2013,"Attaques destructrices (Emerging)",2017,"WannaCry, NotPetya",2018,"AD rebuild, Fast IS rebuilding ; AD rebuild Mature en 2025"],
  ["Pandémie",2011,"Pandémie (Mature)",2020,"Covid-19",2021,"Pandemic business continuity, télétravail"],
  ["Tiers et supply chain",2017,"Supply chain resilience",2020,"SolarWinds",2021,"At scale 3rd party mgt, puis SBOM et stress tests tiers"],
  ["Authentification",2017,"Beyond password (FIDO)",2022,"Lapsus$, MFA fatigue",2023,"Passwordless, MFA résistant au phishing, ITDR"],
  ["Industriel / OT",2011,"Sécurité des SI industriels",2021,"Colonial Pipeline",2023,"IT/OT program management, OT probe, 12 à 15 mots-clés OT"],
  ["Souveraineté, géopolitique",2014,"Sécurité souveraine",2022,"Guerre en Ukraine",2026,"Decoupled IT, scénarios géopolitiques sévères"],
  ["Données personnelles",2014,"Privacy by design",2016,"Adoption du RGPD",2017,"GDPR Trending, privacy Mature en 2021"],
  ["Intelligence artificielle",2016,"Machine learning",2022,"ChatGPT",2024,"7 mots-clés IA en 2024, 18 en 2026"],
  ["Post-quantique",2017,"Post quantum crypto",2024,"Standards NIST",2026,"Post Quantum Crypto roadmap"]];
 const svg=document.getElementById('retro-c5'),W=720,l=170,r=14,t=10,b=26,H=360,rh=(H-t-b)/R.length;
 const x=y=>l+(y-2011)*(W-l-r)/15;
 for(let y=2011;y<=2026;y++){el(svg,'line',{x1:x(y),x2:x(y),y1:t,y2:H-b,stroke:'var(--rule)','stroke-width':1});txt(svg,x(y),H-8,"’"+String(y).slice(2),{'text-anchor':'middle'})}
 R.forEach((d,i)=>{const cy=t+i*rh+rh/2;
  txt(svg,l-10,cy+4,d[0],{'text-anchor':'end',class:'lbl'});
  el(svg,'line',{x1:x(d[1]),x2:x(d[3]),y1:cy,y2:cy,stroke:'var(--muted)','stroke-width':1,'stroke-dasharray':'2 3'});
  el(svg,'rect',{x:x(d[5])-5,y:cy-6,width:Math.max(x(2026)-x(d[5])+5,10),height:12,rx:3,fill:'var(--m-t)'});
  el(svg,'rect',{x:x(d[3])-1.5,y:cy-10,width:3,height:20,rx:1,fill:'var(--s2)'});
  el(svg,'circle',{cx:x(d[1]),cy,r:5,fill:'var(--surface)',stroke:'var(--accent)','stroke-width':2});
  const h=el(svg,'rect',{x:0,y:cy-rh/2,width:W,height:rh,class:'hit'});
  hover(h,`<b>${d[0]}</b><br>Signal ${d[1]} : ${d[2]}<br>Crise ${d[3]} : ${d[4]}<br>Prise en charge ${d[5]} : ${d[6]}<br>Avance du radar : ${d[3]-d[1]} ans`);
 });
})();
// heat table
const HM=[["Identité & accès",20,23,24,23],["Pilotage, organisation & talents",24,15,16,19],["Détection & réponse",7,7,7,10],["AppSec & DevSecOps",5,8,8,10],["Données & cryptographie",8,9,7,8],["Cloud",7,9,10,7],["Réglementation & conformité",6,7,7,7],["OT / industriel / IoT",3,4,4,7],["IA",0,2,2,6],["Résilience aux attaques destructrices",2,5,6,6],["Tiers & écosystème",2,5,6,6],["Tests offensifs & assurance",2,3,5,5],["Continuité classique",14,10,6,5],["Zero Trust & périmètre",5,6,6,4]];
const tb=document.querySelector('#retro-heat tbody');
HM.forEach(r=>{const tr=document.createElement('tr');tr.innerHTML=`<td>${r[0]}</td>`+r.slice(1).map(v=>{const a=Math.min(v/24,1);return `<td class="c" style="background:color-mix(in srgb,var(--m-t) ${Math.round(a*70)}%,transparent);${a>0.55?'color:#fff':''}">${v}%</td>`}).join('')+(()=>{const d=r[4]-r[1];return `<td class="c ${d>=3?'up':''}">${d>0?'+':''}${d} pts</td>`})();tb.appendChild(tr)});
})();
