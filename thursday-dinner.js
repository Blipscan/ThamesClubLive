/* Thursday dinners use the active bowling schedule and the Club request process. */
(() => {
 'use strict';
 const API='https://duckpin-manager-production.up.railway.app';
 const select=document.getElementById('thursday-date'),button=document.getElementById('thursday-reserve'),status=document.getElementById('thursday-status');
 const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const label=date=>new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z'));
 let dates=[];
 button.addEventListener('click',()=>{
  const date=select.value;
  if(!dates.includes(date)||date<today()){status.textContent='Please refresh for the current dinner dates.';return;}
  if(!window.TCReservationForm){status.textContent='The form could not load. Please refresh or call the Club.';return;}
  window.TCReservationForm.open({key:'thursday-dinner-'+date,title:'Thursday Dinner at the Club',date,time:'Serving time to be confirmed',price:'Price to be confirmed',location:'The Thames Club · 290 State Street, New London',notes:'All members and their guests are welcome—you do not have to bowl. Menu, price, serving time, and reservation/cancellation deadlines are awaiting confirmation from Jennifer. Please ask Jennifer about availability and terms before considering this a booking.',meals:[],noReservation:false,returnLabel:'Return to Dining',terms:'I understand this is a request, subject to Jennifer confirming availability, price, and reservation/cancellation terms.'},button);
 });
 async function load(){
  try{
   const responses=await Promise.all([fetch(API+'/api/data',{cache:'no-store',signal:AbortSignal.timeout(15000)}),fetch(API+'/api/reservation-requests/health',{cache:'no-store',signal:AbortSignal.timeout(15000)})]);
   if(responses.some(r=>!r.ok))throw Error();
   const [data,health]=await Promise.all(responses.map(r=>r.json()));
   const first=today(),last=new Date(first+'T12:00:00Z');last.setUTCDate(last.getUTCDate()+30);
   dates=[...new Set((data.schedule||[]).map(s=>s.date).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&new Date(d+'T12:00:00Z').getUTCDay()===4&&d>=first&&d<=last.toISOString().slice(0,10)))].sort();
   select.replaceChildren(...dates.map(d=>new Option(label(d),d)));
   if(!dates.length){select.add(new Option('No Thursday bowling nights in the next 30 days',''));status.textContent='Please check back for upcoming Thursday dinners.';return;}
   select.disabled=false;
   if(!health.thursday_dinners){status.textContent='Thursday dinner requests are being enabled. Please call the Club at (959) 264-2733 for a reservation.';return;}
   button.disabled=false;status.textContent='Only scheduled Thursday bowling nights within the next 30 days are shown. Jennifer will confirm availability and dinner details.';
  }catch{select.replaceChildren(new Option('Schedule temporarily unavailable',''));status.textContent='Please refresh or call the Club at (959) 264-2733 to arrange dinner.';}
 }
 load();
})();
