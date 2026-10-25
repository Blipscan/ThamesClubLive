/* Thames Club: saved request status with personal details delivered through the email app. */
(() => {
  'use strict';
  const GM = 'thamesclub.nl@gmail.com';
  const DONNA = 'donnarichmond5@gmail.com';
  function notifyDonna(instructions) {
    return /donnarichmond5@gmail\.com/i.test(instructions) || /(?:notify|contact|reserve|reservations?|rsvp|respond|reply|send|email|e-mail|inform|let)[^.\n]{0,70}\bDonna(?:\s+Richmond)?\b/i.test(instructions);
  }
  const SITE = 'https://thamesclub1869.com';
  const known = {
    '2026-10-22': {match:/shadows/i, time:'2 PM', price:'Complimentary for members', noReservation:true, meals:[], notes:'ECSO provides a snack; cash bar open. The separate concert is October 24 at 7:30 PM.'},
    '2026-10-23': {match:/lost.boys|classic movie/i, time:'5:30 PM', price:'$20++ per person', deadline:'2026-10-16', meals:['Pizza and popcorn'], notes:'Vampire attire welcome.'},
    '2026-10-30': {match:/witching/i, time:'11:30 AM', price:'$40++ per person', deadline:'2026-10-23', meals:[], notes:'Menu coming soon.'},
    '2026-11-13': {match:/watercraft/i, time:'3 PM', location:'Mystic Seaport Museum; cocktails afterward at La Plage', meals:[], notes:'Wells Watercraft Hall tour, followed by cocktails at La Plage.'},
    '2026-11-18': {match:/paris|pathos/i, time:'2 PM', price:'Complimentary talk', noReservation:true, meals:[], notes:'Members and nonmembers welcome. Cash bar and complimentary snacks. The separate concert is November 21.'}
  };
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const line = v => String(v || '').replace(/[\r\n]+/g,' ').trim();
  const niceDate = v => /^\d{4}-\d{2}-\d{2}$/.test(v || '') ? new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(v+'T12:00:00Z')) : 'Date to be confirmed';
  const today = () => new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const style = document.createElement('style');
  style.textContent = `
    #tc-request{width: min(760px, calc(100% - 24px));max-height:90vh;margin:auto;padding:0;border:1px solid #a6894a;border-radius:12px;background:#f7f2e6;color:#182839;box-shadow:0 16px 70px #0008;font:16px/1.5 Georgia,serif}
    #tc-request::backdrop{background:#07101acc}#tc-request header{padding:24px 28px;background:#0c1c2e;color:#f4edd8}#tc-request h2{font:32px/1.15 Georgia,serif;margin:6px 0 12px}#tc-request .tc-inside{padding:24px 28px}#tc-request p{margin:0 0 12px}#tc-request .tc-kicker{font:12px Arial,sans-serif;letter-spacing:2px;text-transform:uppercase;color:#c9a96e}
    #tc-request a{color:#705019;text-decoration:underline}#tc-request header a{color:#e5c88b}#tc-request .tc-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}#tc-request label{display:block;font:14px/1.5 Arial,sans-serif;margin-bottom:12px}#tc-request input:not([type=checkbox]),#tc-request select,#tc-request textarea{display:block;width:100%;padding:11px;border:1px solid #9a9a92;border-radius:5px;background:white;color:#182839;font:16px Arial,sans-serif;margin-top:5px}#tc-request input[type=checkbox]{margin-right:7px;accent-color:#18344d}#tc-request fieldset{padding:16px;margin:16px 0;border:1px solid #c7b789;border-radius:6px}#tc-request legend{padding:0 8px;font-weight:bold}#tc-request .tc-diets{display:flex;flex-wrap:wrap;gap:2px 16px}#tc-request .tc-diets label{margin-bottom:8px}#tc-request button{font:15px Arial,sans-serif;cursor:pointer;border:1px solid #a6894a;border-radius:5px;padding:12px 16px;background:#0c1c2e;color:white}#tc-request .tc-secondary{background:transparent;color:#182839}#tc-request .tc-close{float:right;padding:6px 10px;color:#f4edd8;background:transparent;border-color:#a6894a}#tc-request .tc-actions{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0}#tc-request .tc-note{font:14px/1.5 Arial,sans-serif;color:#475362}#tc-request .tc-alert{padding:14px;border-left:4px solid #a6894a;background:#ede3ca}#tc-request #tc-errors{color:#962b20}#tc-request [hidden]{display:none!important}#tc-request :focus-visible{outline:3px solid #b88326;outline-offset:3px}#tc-request #tc-email-copy{min-height:200px}body.tc-modal-open{overflow:hidden}@media(max-width:560px){#tc-request .tc-grid{grid-template-columns:1fr}#tc-request header,#tc-request .tc-inside{padding:20px}}
  `;
  document.head.append(style);
  const dialog = document.createElement('dialog');
  dialog.id = 'tc-request'; dialog.setAttribute('aria-labelledby','tc-event-title');
  dialog.innerHTML = `<header><button class="tc-close" type="button" aria-label="Close request">Close</button><p class="tc-kicker">The Thames Club</p><h2 id="tc-event-title"></h2><p id="tc-event-summary"></p><a id="tc-full-flyer" target="_blank" rel="noopener noreferrer">View full-size flyer</a></header><div class="tc-inside"><p id="tc-event-notes"></p><p id="tc-event-policy" class="tc-alert"></p><form id="tc-request-form" novalidate><p class="tc-note">* Required. <span id="tc-routing">Submit your request directly to Jennifer.</span> The member requesting the reservation is the first attendee and the member to be charged.</p><div class="tc-grid"><label>Your name *<input name="member" autocomplete="name" required maxlength="100"></label><label>Your email *<input name="email" type="email" autocomplete="email" required maxlength="160"></label><label>Phone (optional)<input name="phone" type="tel" autocomplete="tel" maxlength="40"></label><label>Total attending, including you *<input name="party" type="number" min="1" max="20" step="1" value="1" required></label></div><div id="tc-attendees"></div><label>Seating or other requests (optional)<textarea name="requests" rows="3" maxlength="1000"></textarea></label><label id="tc-payment-label">Planned payment method *<select name="payment" required><option value="">Please select</option><option>Pay at the Club</option><option>Please advise</option></select></label><label><input name="terms" type="checkbox" required> <span id="tc-terms"></span> *</label><p id="tc-errors" role="alert" hidden></p><p class="tc-note">Select Submit request once. Keep your private status link. Jennifer will confirm your booking by email; submitting a request does not guarantee a booking.</p><div class="tc-actions"><button type="submit">Submit request</button><button type="button" class="tc-secondary tc-cancel">Return to Events</button></div></form><section id="tc-prepared" hidden aria-live="polite"><h3>Request saved — awaiting confirmation</h3><p id="tc-delivery"></p><p id="tc-private-note"></p><p><a id="tc-private-link">Your private status link</a></p><p>Jennifer will review your request and confirm by email. For changes, contact the Club using your reference.</p><div class="tc-actions"><button type="button" class="tc-secondary tc-cancel">Return to Events</button></div></section></div>`;
  document.body.append(dialog);
  const $ = s => dialog.querySelector(s);
  const form = $('#tc-request-form'); let event, lastTrigger, draft, reference, capability;
  const diets = ['Vegetarian','Vegan','Gluten-free / celiac','Dairy-free','Peanut allergy','Tree-nut allergy','Shellfish allergy','Fish allergy','Egg allergy','Soy allergy','Sesame allergy','Other'];
  function attendeeFields(i, saved = {}) {
    const field = document.createElement('fieldset'); field.dataset.attendee = String(i);
    const meals = event.meals?.length ? event.meals : ['Menu / meal information pending'];
    field.innerHTML = `<legend>${i===0?'Member / first attendee':'Guest '+i}</legend>${i>0?`<label>Guest ${i} name *<input data-name maxlength="100" required></label>`:''}<label>Meal${meals.length>1?' *':''}<select data-meal ${meals.length>1?'required':''}>${meals.length>1?'<option value="">Please select</option>':''}${meals.map(m=>`<option>${esc(m)}</option>`).join('')}</select></label><p class="tc-note">Dietary needs / allergies (select all that apply; leave blank if none)</p><div class="tc-diets">${diets.map(d=>`<label><input type="checkbox" data-diet value="${esc(d)}">${esc(d)}</label>`).join('')}</div><label data-other-label hidden>Other dietary need *<input data-other maxlength="200"></label>`;
    if(i>0) field.querySelector('[data-name]').value=saved.name||'';
    if(saved.meal && meals.includes(saved.meal)) field.querySelector('[data-meal]').value=saved.meal;
    for(const cb of field.querySelectorAll('[data-diet]')) cb.checked=(saved.diets||[]).includes(cb.value);
    field.querySelector('[data-other]').value=saved.other||'';
    const refresh=()=>{const other=[...field.querySelectorAll('[data-diet]:checked')].some(c=>c.value==='Other');field.querySelector('[data-other-label]').hidden=!other;field.querySelector('[data-other]').required=other;};
    field.addEventListener('change',refresh);refresh();return field;
  }
  function attendees() {return [...$('#tc-attendees').children].map(f=>({name:f.querySelector('[data-name]')?.value.trim()||'',meal:f.querySelector('[data-meal]').value,diets:[...f.querySelectorAll('[data-diet]:checked')].map(c=>c.value),other:f.querySelector('[data-other]').value.trim()}));}
  let savedGuests=[];
  function refreshAttendees(){const n=Number(form.elements.party.value);if(!Number.isInteger(n)||n<1||n>20)return;attendees().forEach((a,i)=>savedGuests[i]=a);$('#tc-attendees').replaceChildren(...Array.from({length:n},(_,i)=>attendeeFields(i,savedGuests[i])));}
  form.elements.party.addEventListener('input',refreshAttendees);
  form.elements.party.addEventListener('change',refreshAttendees);
  function close(){if(form.querySelector('button[type=submit]').disabled)return;dialog.close();document.body.classList.remove('tc-modal-open');lastTrigger?.focus();}
  $('.tc-close').onclick=close;dialog.querySelectorAll('.tc-cancel').forEach(b=>b.onclick=close);
  dialog.addEventListener('cancel',e=>{if(form.querySelector('button[type=submit]').disabled)e.preventDefault();});
  dialog.addEventListener('close',()=>{document.body.classList.remove('tc-modal-open');lastTrigger?.focus();});
  function metadata(figure){
    let data={};try{data=JSON.parse(figure.dataset.reservation||'{}');}catch{}
    const caption=figure.querySelector('figcaption')?.cloneNode(true);caption?.querySelectorAll('time,a').forEach(n=>n.remove());
    const title=line(data.title||caption?.textContent||'Club event');const date=data.event_date||figure.querySelector('time')?.dateTime||'';
    const fixed=known[date]?.match.test(title)?known[date]:{};
    const instructions=[data.notes,data.reservation_instructions,data.reservation_contact,figure.querySelector('.event-flyer-art img')?.alt,figure.querySelector('figcaption')?.textContent,...Array.from(figure.querySelectorAll('a[href^="mailto:"]'),a=>a.href)].filter(Boolean).join('\n');
    return {key:eventKey(figure),title,date,reservationStatus:data.reservation_status||'',cc:notifyDonna(instructions)?DONNA:'',time:data.event_time||fixed.time||'Time to be confirmed',price:data.price||fixed.price||'Price to be confirmed',deadline:data.reserve_by||fixed.deadline||'',notes:data.notes||fixed.notes||'',location:data.location||fixed.location||'The Thames Club · 290 State Street, New London',noReservation:data.reservations_required===false||fixed.noReservation||false,meals:Array.isArray(data.meal_choices)?data.meal_choices:fixed.meals||[],image:figure.querySelector('.event-flyer-art')?.href};
  }
  function open(figure,trigger,preset=null){
    event=preset||metadata(figure);lastTrigger=trigger;form.reset();savedGuests=[];$('#tc-attendees').replaceChildren();capability=window.TCRequestTracking?.newReference();reference=capability?.id||'';
    $('#tc-event-title').textContent=event.title;
    dialog.querySelectorAll('.tc-cancel').forEach(b=>b.textContent=event.returnLabel||'Return to Events');
    $('#tc-routing').textContent='Submit your request directly to Jennifer.';
    $('#tc-event-summary').textContent=[niceDate(event.date),event.time,event.location,event.price].join(' · ');
    $('#tc-full-flyer').hidden=!event.image;if(event.image)$('#tc-full-flyer').href=event.image;$('#tc-event-notes').textContent=event.notes;
    $('#tc-event-policy').textContent=event.reservationStatus==='unknown'?'Reservation requirements have not yet been confirmed. Use this form to ask Jennifer about the event.':event.noReservation?'No reservations are required for this event. You may use this form to send Jennifer an attendance note or question.':event.deadline&&today()>event.deadline?'The advertised reservation deadline has passed. You may ask Jennifer about availability; late requests are not guaranteed.':event.deadline?'Please request by '+niceDate(event.deadline)+'.':'Jennifer will review your request and confirm availability.';
    $('#tc-terms').textContent=event.terms|| (event.noReservation||event.reservationStatus==='unknown'?'I understand this is an attendance note or inquiry.':'I understand this is a reservation request, subject to confirmation. Late cancellations and no-shows will be charged.');
    $('#tc-payment-label').hidden=event.noReservation||event.reservationStatus==='unknown';form.elements.payment.required=!event.noReservation&&event.reservationStatus!=='unknown';
    form.hidden=false;$('#tc-prepared').hidden=true;$('#tc-errors').hidden=true;refreshAttendees();dialog.showModal();document.body.classList.add('tc-modal-open');form.elements.member.focus();
  }
  window.TCReservationForm={open:(details,trigger)=>open(null,trigger,details)};
  document.addEventListener('click', e=>{const link=e.target.closest('.event-flyer-art');if(!link||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;const figure=link.closest('.event-flyer');if(!figure||figure.hidden)return;e.preventDefault();open(figure,link);});

  // Stable email links contain an event identifier only, never member details.
  const emailEvents = {
    'first-friday-2026-11-06': {"title": "First Friday Dinner & Concert by Candlelight — Christopher Faison", "date": "2026-11-06", "time": "5:30 PM", "notes": "Sounds Familiar. Menu details to follow. An 18% service charge applies, followed by 7.35% tax.", "image": "images/first-friday-2026-11-06.jpg?v=gold20261025", "price": "$75++ per person", "deadline": "2026-10-30"},
    'wells-watercraft-tour-2026-11-13': {title:'Wells Watercraft Hall Tour & Cocktails',date:'2026-11-13',time:'3 PM',location:'Mystic Seaport Museum; cocktails afterward at La Plage',notes:'Reserve with Donna Richmond at donnarichmond5@gmail.com.',image:'images/wells-watercraft-tour-2026-11-13-gold.webp?v=gold20261025'},
    'paris-to-pathos-talk-2026-11-18': {title:'Paris to Pathos — Concert Talk',date:'2026-11-18',time:'2 PM',noReservation:true,notes:'Members and nonmembers welcome; no reservations required. Cash bar and complimentary snacks. The separate concert is November 21.',image:'images/paris-to-pathos-talk-2026-11-18-gold.webp?v=gold20261025'},
    'thanksgiving-2026-11-19': {title:'Thanksgiving Dinner & Game of Chance',date:'2026-11-19',time:'5:30 PM',notes:'Tables of players rolling dice before a traditional Thanksgiving dinner.'},
    'holiday-spectacular-talk-2026-12-02': {"title": "Holiday Spectacular — ECSO Concert Talk", "date": "2026-12-02", "time": "2 PM", "notes": "Cash bar and complimentary snacks. Preview of the separate December 5 concert at 3 PM at the Garde Arts Center.", "image": "images/holiday-spectacular-talk-2026-12-02.webp?v=gold20261025", "reservationStatus": "unknown"},
    'holiday-dinner-2026-12-05': {"title": "Annual Holiday Dinner with Mike Zaitchik", "date": "2026-12-05", "time": "5:30 PM", "notes": "All faiths welcome. Music by Mike Zaitchik. Price, menu and reservation deadline to be confirmed.", "image": "images/holiday-dinner-2026-12-05.webp?v=gold20261025"},
    'menorah-lighting-2026-12-10': {"title": "Menorah Lighting", "date": "2026-12-10", "time": "6 PM", "notes": "Cash bar and complimentary light refreshments. Reservation requirements to be confirmed.", "image": "images/menorah-lighting-2026-12-10.webp?v=gold20261025", "reservationStatus": "unknown"},
    'holiday-trivia-2026-12-11': {"title": "Holiday Theme Trivia Night", "date": "2026-12-11", "time": "5:30 PM", "notes": "Holiday trivia and dinner. Menu and reservation requirements to be confirmed.", "image": "images/holiday-trivia-2026-12-11.webp?v=gold20261025", "price": "$40; service charge and tax details to be confirmed", "reservationStatus": "unknown"},
    'ugly-sweater-2026-12-18': {"title": "Ugly Sweater & Carol-oke Night", "date": "2026-12-18", "time": "5:30 PM", "notes": "Wear your wildest sweater and sing seasonal favorites. Light snacks. Reservation requirements to be confirmed.", "image": "images/ugly-sweater-2026-12-18.webp?v=gold20261025", "price": "$15; service charge and tax details to be confirmed", "reservationStatus": "unknown"},
    'new-years-eve-2026-12-31': {"title": "New Year’s Eve with Mike Zaitchik", "date": "2026-12-31", "time": "5:30 PM", "notes": "Mike Zaitchik at the keyboard. Price and reservation requirements to be confirmed.", "image": "images/new-years-eve-2026-12-31.webp?v=gold20261025", "reservationStatus": "unknown"}
  };
  let emailOpened=false;
  function eventKey(figure){
    let data={};try{data=JSON.parse(figure.dataset.reservation||'{}');}catch{}
    if(data.id)return data.id;
    try{return new URL(figure.querySelector('.event-flyer-art').href).pathname.split('/').pop().replace(/\.[^.]+$/,'');}catch{return '';}
  }
  function emailTarget(key){
    if(!/^[a-z0-9-]{1,120}$/.test(key||''))return null;
    const figures=Array.from(document.querySelectorAll('.event-flyer'));
    let figure=figures.find(f=>eventKey(f)===key);
    const preset=emailEvents[key];
    // The current published flyer takes priority over the email fallback details.
    if(!figure&&preset){
      const matches=figures.filter(f=>metadata(f).date===preset.date);
      if(matches.length===1)figure=matches[0];
    }
    if(figure)return {figure,event:metadata(figure)};
    if(!preset)return null;
    return {figure:null,event:{key,time:'Time to be confirmed',price:'Price to be confirmed',location:'The Thames Club · 290 State Street, New London',deadline:'',notes:'',meals:[],noReservation:false,...preset,cc:notifyDonna(preset.notes||'')?DONNA:''}};
  }
  function openFromEmail(){
    if(emailOpened)return;
    const key=new URLSearchParams(location.search).get('request');
    if(!key)return;
    const target=emailTarget(key);
    if(!target)return;
    emailOpened=true;
    const date=target.event.date,first=new Date(date+'T12:00:00Z');first.setUTCDate(first.getUTCDate()-30);
    if(today()>date||today()<first.toISOString().slice(0,10)){
      const note=document.createElement('p');note.className='tc-alert';note.textContent=today()>date?'This event has passed. Please contact the Club about any outstanding request.':'This event’s request form opens 30 days before the event. Please contact the Club with questions.';
      document.querySelector('.hero .wrap')?.prepend(note);return;
    }
    open(target.figure,target.figure?.querySelector('.event-flyer-art')||document.querySelector('h1'),target.event);
  }

  function enhance(){document.querySelectorAll('.event-flyer-art').forEach(a=>{a.setAttribute('aria-haspopup','dialog');a.setAttribute('aria-label','Open event details and request form');});}
  enhance();openFromEmail();const gallery=document.querySelector('.event-flyers');if(gallery)new MutationObserver(()=>{enhance();openFromEmail();}).observe(gallery,{childList:true});
  form.addEventListener('submit',async e=>{
    e.preventDefault();if(form.querySelector('button[type=submit]').disabled)return;refreshAttendees();
    if(!form.checkValidity()){$('#tc-errors').hidden=false;$('#tc-errors').textContent='Please complete the required fields marked * and correct any highlighted items. Your entries have been kept.';form.reportValidity();return;}
    const member=line(form.elements.member.value),email=form.elements.email.value.trim();
    if(!member||!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)){$('#tc-errors').hidden=false;$('#tc-errors').textContent='Please enter your name and a valid email address.';return;}
    const party=Number(form.elements.party.value);
    const submit=form.querySelector('button[type=submit]');submit.disabled=true;submit.textContent='Saving request…';
    const controls=[...form.querySelectorAll('input,select,textarea')];controls.forEach(c=>c.disabled=true);
    let tracking;
    try{if(!capability||!window.TCRequestTracking)throw Error('Request tracking has not loaded. Please refresh the page before sending.');tracking=await window.TCRequestTracking.save(event,party,capability,{member,email,phone:line(form.elements.phone.value),attendees:attendees().map((a,i)=>({...a,name:i===0?member:a.name})),requests:form.elements.requests.value.trim(),payment:form.elements.payment.value,terms:$('#tc-terms').textContent,policyAccepted:form.elements.terms.checked});}
    catch(error){$('#tc-errors').hidden=false;$('#tc-errors').textContent=error.message||'Could not save the request. Your entries have been kept.';return;}
    finally{controls.forEach(c=>c.disabled=false);submit.disabled=false;submit.textContent='Submit request';}
    $('#tc-private-link').href=tracking.link;$('#tc-private-note').textContent=tracking.remembered?'Status is saved for this browser. Keep the private link if you want to check on another device. Do not share it.':'This browser cannot remember your request. Save the private link below to check its status later.';

    const delivery=tracking.request.email_delivery;
    $('#tc-delivery').textContent=delivery==='accepted'?'Your request has been saved and its notification accepted by the mail server. Jennifer has not confirmed your booking yet. Reference: '+reference:'Your request is saved, but email delivery is not confirmed. Please call the Club at (959) 264-2733 with reference '+reference+'. Please do not submit again.';
    form.hidden=true;$('#tc-prepared').hidden=false;
  });
})();
