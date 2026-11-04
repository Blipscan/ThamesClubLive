(()=>{'use strict';const gallery=document.querySelector('.event-flyers'),hint=document.getElementById('event-flyer-hint');if(!gallery)return;
 const status=document.createElement('p');status.className='approved-events-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');gallery.before(status);
 TCEvents.watch(events=>{
  const fragment=document.createDocumentFragment();for(const e of events){
   let f;if(e.figure){f=e.figure.cloneNode(true)}else{
    let url;try{url=new URL(e.image_url)}catch{continue}
    if(url.origin!=='https://duckpin-manager-production.up.railway.app'||!url.pathname.startsWith('/api/event-flyers/'))continue;
    // Use Bill's approved artwork; the staff feed still controls the listing and its details.
    if(e.id==='christopher-faison-2026-11-06' && e.event_date==='2026-11-06' &&
       url.pathname==='/api/event-flyers/christopher-faison-2026-11-06/image'){
      url=new URL('images/first-friday-2026-11-06.jpg?v=gold20261025',document.baseURI);
    }
    f=document.createElement('figure');f.className='event-flyer';f.dataset.feed='gm';const link=document.createElement('a');link.className='event-flyer-art';link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';link.setAttribute('aria-label','Read '+e.title+' flyer (opens in a new tab)');
    if(e.image_type==='application/pdf')link.textContent='View full event flyer (PDF)';else{const img=document.createElement('img');img.src=url.href;img.alt=e.title;img.decoding='async';link.append(img)}
    const caption=document.createElement('figcaption'),time=document.createElement('time');time.dateTime=e.event_date;time.textContent=new Intl.DateTimeFormat('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(e.event_date+'T12:00:00Z'))+(e.event_time?' · '+e.event_time:'');caption.append(time,document.createTextNode(e.title));f.append(link,caption);
   }
   const {figure,...details}=e;f.dataset.reservation=JSON.stringify(details);f.dataset.approval='approved';f.hidden=false;f.id='event-'+e.id;fragment.append(f);
  }
  gallery.replaceChildren(fragment);gallery.hidden=!gallery.children.length;hint.hidden=gallery.hidden;status.textContent=gallery.hidden?'No upcoming approved event flyers are listed.':'';gallery.dataset.state=events.length?'ready':'empty';
  document.querySelectorAll('[data-event-change]').forEach(n=>{n.hidden=!events.some(e=>e.event_date===n.dataset.eventChange)});
  const target=location.hash&&document.getElementById(location.hash.slice(1));if(target&&!target.dataset.scrolled){target.dataset.scrolled='yes';target.scrollIntoView({block:'center'})}
 },()=>{gallery.replaceChildren();gallery.hidden=true;hint.hidden=true;gallery.dataset.state='unavailable';status.textContent='Event flyers are temporarily unavailable. Please try again shortly or contact the Club.'});
})();
