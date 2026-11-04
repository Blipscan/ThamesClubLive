(()=>{
 const button=document.querySelector('.menu-toggle'),nav=document.getElementById('home-menu');
 if(!button||!nav)return;
 const groups=[...nav.querySelectorAll('details')];
 const closeGroups=()=>groups.forEach(g=>g.open=false);
 const closeMenu=()=>{closeGroups();nav.classList.remove('open');button.setAttribute('aria-expanded','false')};
 button.addEventListener('click',()=>{const expanded=button.getAttribute('aria-expanded')==='true';if(expanded)closeMenu();else{button.setAttribute('aria-expanded','true');nav.classList.add('open')}});
 groups.forEach(group=>group.querySelector('summary').addEventListener('click',()=>{if(!group.open)groups.forEach(other=>{if(other!==group)other.open=false})}));
 document.addEventListener('keydown',e=>{
  if(e.key!=='Escape')return;
  const current=groups.find(g=>g.open);
  if(current){current.open=false;current.querySelector('summary').focus()}
  else if(nav.classList.contains('open')){closeMenu();button.focus()}
 });
 document.addEventListener('click',e=>{if(!nav.contains(e.target)&&!button.contains(e.target))closeMenu()});
 nav.addEventListener('click',e=>{if(e.target.closest('a'))closeMenu()});
 window.matchMedia('(min-width:1201px)').addEventListener('change',closeMenu);
})();
