/* One approved-event resolver for the Events page and homepage. */
(()=>{'use strict';
 const FEED='https://duckpin-manager-production.up.railway.app/api/event-flyers/public';
 // These legacy posters are staff-managed. Never resurrect them if absent from the approved feed.
 const aliases={'first-friday-2026-11-06':'christopher-faison-2026-11-06'};
 const staffOwned=new Set(Object.values(aliases));
 const valid=d=>/^\d{4}-\d{2}-\d{2}$/.test(d||'')&&!isNaN(Date.parse(d+'T12:00:00Z'))&&new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d;
 const id=e=>aliases[e.id]||e.id;
 const day=(now=new Date())=>{const p=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);return ['year','month','day'].map(k=>p.find(x=>x.type===k).value).join('-')};
 function curated(html){
  const doc=new DOMParser().parseFromString(html,'text/html');if(!doc.querySelector('.event-flyers'))throw Error('Invalid events page');
  return [...doc.querySelectorAll('.event-flyer:not([data-feed])')].map((f,i)=>{
   let d={};try{d=JSON.parse(f.dataset.reservation||'{}')}catch{return null}
   const caption=f.querySelector('figcaption')?.cloneNode(true),time=f.querySelector('time'),label=time?.textContent||'';
   caption?.querySelectorAll('time,a').forEach(n=>n.remove());
   const title=d.title||caption?.textContent.trim();
   return {...d,id:id(d)||'club-'+(time?.dateTime||'')+'-'+i,title,event_date:d.event_date||time?.dateTime,event_time:d.event_time||(label.includes('·')?label.split('·').pop().trim():''),end_date:f.dataset.endDate||d.end_date,approval:f.dataset.approval||'approved',status:f.dataset.status||d.status,figure:f};
  }).filter(Boolean);
 }
 function resolve(staticEvents,feed,now=new Date()){
  const map=new Map(), today=day(now);
  for(const e of staticEvents)if(!staffOwned.has(id(e)))map.set(id(e),e);
  for(const incoming of feed){
   if(!/^[a-z0-9-]+$/.test(incoming.id||''))continue;
   const key=id(incoming),base=staticEvents.find(e=>id(e)===key)||{};
   // A feed entry replaces, rather than supplements, its matching curated record.
   const e={...base,...incoming,id:key,figure:null,approval:incoming.approval||'approved'};
   try{const image=new URL(e.image_url);if(image.origin!=='https://duckpin-manager-production.up.railway.app'||!image.pathname.startsWith('/api/event-flyers/')){map.delete(key);continue}}catch{map.delete(key);continue}
   map.set(key,e);
  }
  return [...map.values()].filter(e=>{
   if(e.approval!=='approved'||e.cancelled||['cancelled','pending','rejected'].includes(e.status)||!valid(e.event_date)||!e.title?.trim())return false;
   const end=e.end_date||e.event_date,start=new Date(e.event_date+'T12:00:00Z');start.setUTCDate(start.getUTCDate()-30);
   const publish=e.publish_date||start.toISOString().slice(0,10);
   return valid(end)&&valid(publish)&&end>=e.event_date&&today>=publish&&today<=end;
  }).sort((a,b)=>a.event_date.localeCompare(b.event_date)||minutes(a.event_time)-minutes(b.event_time)||a.id.localeCompare(b.id));
 }
 function minutes(s=''){const m=s.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);return m?(+m[1]%12)*60+(+m[2]||0)+(m[3].toUpperCase()==='PM'?720:0):1440}
 async function load(){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
  try{
   const [page,feed]=await Promise.all([fetch('events.html',{cache:'no-store',signal:controller.signal}),fetch(FEED,{cache:'no-store',signal:controller.signal})]);
   if(!page.ok||!feed.ok)throw Error('Event source unavailable');
   const [html,data]=await Promise.all([page.text(),feed.json()]);if(!Array.isArray(data.flyers))throw Error('Invalid event feed');
   return resolve(curated(html),data.flyers);
  }finally{clearTimeout(timer)}
 }
 function watch(onSuccess,onError){
  let running=false,rerun=false,timer,stopped=false;
  async function refresh(){
   if(stopped)return;if(running){rerun=true;return}running=true;clearTimeout(timer);
   try{onSuccess(await load())}catch(e){onError(e)}finally{running=false;if(!stopped){timer=setTimeout(refresh,rerun?0:60000);rerun=false}}
  }
  const visible=()=>{if(!document.hidden)refresh()};document.addEventListener('visibilitychange',visible);window.addEventListener('focus',refresh);window.addEventListener('pageshow',refresh);refresh();
  return {refresh,stop(){stopped=true;clearTimeout(timer);document.removeEventListener('visibilitychange',visible);window.removeEventListener('focus',refresh);window.removeEventListener('pageshow',refresh)}};
 }
 window.TCEvents={load,watch,resolve,curated,day,valid};
})();
