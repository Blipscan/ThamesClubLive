/* Anonymous, private request status. Personal details stay in the member's email. */
(() => {
 'use strict';
 const API='https://duckpin-manager-production.up.railway.app/api/reservation-requests';
 const STORAGE='tc-private-requests-v1';
 const valid=v=>v&&/^TC-[A-F0-9]{32}$/.test(v.id||'')&&/^[a-f0-9]{64}$/.test(v.token||'');
 let saved=[];try{saved=JSON.parse(localStorage.getItem(STORAGE)||'[]').filter(valid).slice(-100);}catch{}
 const incoming=new URLSearchParams(location.hash.slice(1));
 const cap={id:incoming.get('request'),token:incoming.get('key')};
 if(valid(cap)){saved=saved.filter(x=>x.id!==cap.id).concat(cap).slice(-100);history.replaceState(null,'',location.pathname+location.search);persist();}
 function persist(){try{localStorage.setItem(STORAGE,JSON.stringify(saved));return true;}catch{return false;}}
 let rows=[],busy=false;
 const labels={pending:'Awaiting review',received:'Received',confirmed:'Confirmed',declined:'Declined',cancelled:'Cancelled'};
 function badge(r){const el=document.createElement('span');el.className='tc-status-badge tc-status-'+r.status;el.textContent=label(r);return el;}
 function label(r){return (r.kind==='inquiry'?'Your inquiry for ':r.status==='confirmed'?'Your reservation for ':'Your request for ')+r.party+' — '+(r.status==='pending'&&r.email_delivery==='member_email_app'?'Awaiting email / receipt':labels[r.status]);}
 function privateLink(v){const u=new URL('https://thamesclub1869.com/events.html');u.hash=new URLSearchParams({request:v.id,key:v.token}).toString();return u.href;}
 async function api(path,body){const response=await fetch(API+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(15000)});let data;try{data=await response.json();}catch{throw Error('Request tracking is unavailable. Your entries have been kept.');}if(!response.ok)throw Error(data.error||'Please try again.');return data;}
 const panel=document.createElement('section');panel.id='tc-my-requests';panel.setAttribute('aria-label','Your private requests');panel.style.cssText='border:1px solid #c9a96e;padding:20px;margin:20px 0;color:inherit';
 const title=document.createElement('h2');title.textContent='Your requests';const note=document.createElement('p');note.textContent='Private to this browser and anyone with your private link. New requests are submitted online. Jennifer updates Received or Confirmed after review. Older requests marked Awaiting email / receipt still require their prepared email to be sent. Status updates when you return or refresh.';
 const feedback=document.createElement('p');feedback.setAttribute('role','status');
 const entries=document.createElement('div');const refresh=document.createElement('button');refresh.textContent='Refresh status';refresh.onclick=()=>poll();const forget=document.createElement('button');forget.textContent='Hide requests on this device';forget.style.marginLeft='12px';forget.onclick=()=>{saved=[];rows=[];persist();render();};
 panel.append(title,note,feedback,entries,refresh,forget);const gallery=document.querySelector('.event-flyers');if(gallery)gallery.after(panel);else document.querySelector('#thursday-dinner .w')?.append(panel);
 function figureKey(f){try{const data=JSON.parse(f.dataset.reservation||'{}');if(data.id)return data.id;return new URL(f.querySelector('.event-flyer-art').href).pathname.split('/').pop().replace(/\.[^.]+$/,'');}catch{return '';}}
 function render(){panel.hidden=!saved.length;entries.replaceChildren();for(const r of rows){const p=document.createElement('p');p.textContent=r.event_title+': ';p.append(badge(r),document.createTextNode(' '));const v=saved.find(v=>v.id===r.id);if(v){const a=document.createElement('a');a.href=privateLink(v);a.textContent='Private status link';a.style.color='inherit';p.append(a);}entries.append(p);}
  document.querySelectorAll('.event-flyer').forEach(f=>{let box=f.querySelector('.tc-request-status');if(!box){box=document.createElement('div');box.className='tc-request-status';box.style.cssText='padding:12px 2px;text-align:center;font:16px/1.5 Georgia,serif;color:inherit';f.append(box);}box.replaceChildren();for(const r of rows.filter(r=>r.event_key===figureKey(f))){const p=document.createElement('p');p.append(badge(r));p.title=r.id;box.append(p);}});
 }
 async function poll(){if(busy||!saved.length){render();return;}busy=true;feedback.textContent='Checking status…';try{rows=(await api('/status',{requests:saved.map(({id,token})=>({id,token}))})).requests;feedback.textContent=rows.length?'':'No matching requests found. Check your private link or contact Jennifer.';render();}catch{feedback.textContent='Cannot refresh status right now. Any status shown is from the last successful check.';}finally{busy=false;}}
 window.TCRequestTracking={
  newReference:()=>({id:'TC-'+crypto.randomUUID().replaceAll('-','').toUpperCase(),token:Array.from(crypto.getRandomValues(new Uint8Array(32)),v=>v.toString(16).padStart(2,'0')).join('')}),
  async save(event,party,cap,submission){const data=await api('',{id:cap.id,token:cap.token,event_key:event.key,party,...(submission?{submission}:{})});saved=saved.filter(v=>v.id!==cap.id).concat(cap).slice(-100);const remembered=persist();rows=rows.filter(r=>r.id!==cap.id).concat(data.request);render();return {request:data.request,link:privateLink(cap),remembered};}
 };
 render();poll();if(gallery)new MutationObserver(()=>render()).observe(gallery,{childList:true});
 window.addEventListener('focus',poll);document.addEventListener('visibilitychange',()=>{if(!document.hidden)poll();});setInterval(()=>{if(!document.hidden)poll();},60000);
})();

