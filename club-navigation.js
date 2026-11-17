/* Shared public navigation. Keep desktop and mobile destinations identical. */
(()=>{'use strict';
const groups=[['Events & Arts',[['Club Events','events.html'],['We Support the Arts','arts.html'],['Private Events','event-planners.html'],['Event Rooms','event-rooms.html']]],['Bowling',[['Duckpin Bowling','bowling.html'],['Bowlers’ Home','https://duckpin-manager-production.up.railway.app/bowler-login'],['Thursday Dinner','dining.html#thursday-dinner']]],['About the Club',[['History','history.html'],['Community','community.html'],['Reciprocal Clubs','reciprocal-clubs.html'],['Submarineland','the_guide.html'],['Restoration','restoration.html'],['Pierson Gallery','pierson-gallery.html'],['Photo Gallery','gallery.html'],['Above & Below','above-below.html'],['All Publications','publications.html']]]];
const link=(label,path,cls='')=>`<a class="${cls}" href="${path}">${label}</a>`;
document.querySelectorAll('[data-tc-navigation]').forEach((host,index)=>{
const id='tc-menu-'+index;
host.innerHTML=`<nav class="tc-global-nav" aria-label="Main navigation"><div class="tc-nav-inner"><a class="tc-nav-brand" href="index.html"><img src="images/thames-club-monogram-gold.png" width="40" height="40" alt=""><span>The Thames Club<small>New London · Est. 1869</small></span></a><button class="tc-menu-toggle" type="button" aria-expanded="false" aria-controls="${id}">Menu</button><div class="tc-nav-menu" id="${id}">${link('Home','index.html')}${link('Dining','dining.html')}${groups.map(([name,items])=>`<details class="tc-nav-group"><summary>${name}</summary><div class="tc-dropdown">${items.map(([l,p])=>link(l,p)).join('')}</div></details>`).join('')}${link('Membership','membership.html')}${link('Arrange a Visit','visit.html','tc-visit')}<div class="tc-portals">${link('Staff Login','https://duckpin-manager-production.up.railway.app/staff-workspace')}</div></div></div></nav>`;
const menu=host.querySelector('.tc-nav-menu'),toggle=host.querySelector('.tc-menu-toggle'),dropdowns=[...host.querySelectorAll('details')];
const closeGroups=()=>dropdowns.forEach(g=>g.open=false);
const closeMenu=()=>{closeGroups();menu.classList.remove('tc-open');toggle.setAttribute('aria-expanded','false')};
toggle.addEventListener('click',()=>{if(toggle.getAttribute('aria-expanded')==='true')closeMenu();else{toggle.setAttribute('aria-expanded','true');menu.classList.add('tc-open')}});
dropdowns.forEach(g=>g.querySelector('summary').addEventListener('click',()=>{if(!g.open)dropdowns.forEach(other=>{if(other!==g)other.open=false})}));
host.addEventListener('keydown',e=>{if(e.key!=='Escape')return;const open=dropdowns.find(g=>g.open);if(open){open.open=false;open.querySelector('summary').focus()}else if(menu.classList.contains('tc-open')){closeMenu();toggle.focus()}});
document.addEventListener('click',e=>{if(!host.contains(e.target))closeMenu()});
menu.addEventListener('click',e=>{if(e.target.closest('a'))closeMenu()});
window.matchMedia('(min-width:1151px)').addEventListener('change',closeMenu);
const current=location.pathname.replace(/index\.html$/,'');host.querySelectorAll('a').forEach(a=>{if(a.origin===location.origin&&!a.hash&&a.pathname.replace(/index\.html$/,'')===current){a.setAttribute('aria-current','page');a.closest('details')?.querySelector('summary').classList.add('tc-current')}});
});})();
