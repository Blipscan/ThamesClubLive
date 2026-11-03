(()=>{'use strict';const host=document.getElementById('coming-up');if(!host)return;
 const cards=host.querySelector('.event-cards'),status=host.querySelector('[role=status]'),retry=host.querySelector('button');
 const monitor=TCEvents.watch(events=>{
  cards.replaceChildren();for(const e of events.slice(0,3)){
   const article=document.createElement('article'),date=document.createElement('p'),h=document.createElement('h3'),link=document.createElement('a');
   date.className='event-date';date.textContent=new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(e.event_date+'T12:00:00Z'))+(e.event_time?' · '+e.event_time:'');
   h.textContent=e.title;link.href='events.html#event-'+e.id;link.textContent='View Details →';article.append(date,h,link);cards.append(article);
  }
  host.dataset.state=events.length?'ready':'empty';status.textContent=events.length?'':'No upcoming events are listed. Please check the full events calendar.';retry.hidden=true;
 },()=>{cards.replaceChildren();host.dataset.state='unavailable';status.textContent='Upcoming events are temporarily unavailable. Please use the full events calendar.';retry.hidden=false});
 retry.addEventListener('click',()=>{status.textContent='Checking upcoming events…';monitor.refresh()});
})();
