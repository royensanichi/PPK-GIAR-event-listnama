const menuButton=document.querySelector('#menuButton'),siteMenu=document.querySelector('#siteMenu');
if(menuButton&&siteMenu){menuButton.addEventListener('click',()=>{siteMenu.hidden=!siteMenu.hidden;menuButton.setAttribute('aria-expanded',String(!siteMenu.hidden))});document.addEventListener('click',e=>{if(!e.target.closest('.top-actions')){siteMenu.hidden=true;menuButton.setAttribute('aria-expanded','false')}});document.addEventListener('keydown',e=>{if(e.key==='Escape'){siteMenu.hidden=true;menuButton.setAttribute('aria-expanded','false')}})}
const gallery=document.querySelector('#documentationGallery');
if(gallery){
  // Tambahkan file foto setelah diunggah ke public/images/documentation/.
  const photos=[];
  const viewer=document.querySelector('#photoViewer'),enlarged=document.querySelector('#enlargedPhoto');
  const close=()=>{viewer.hidden=true;enlarged.removeAttribute('src');document.body.style.overflow=''};
  if(photos.length===0){const box=document.createElement('div');box.className='documentation-empty';box.innerHTML='<span class="documentation-empty-icon" aria-hidden="true">▧</span><strong>Dokumentasi segera hadir</strong><p>Foto-foto kegiatan akan ditambahkan di sini setelah acara berlangsung.</p>';gallery.append(box)}
  else photos.forEach((filename,i)=>{const button=document.createElement('button');button.type='button';button.className='documentation-photo';button.setAttribute('aria-label','Lihat foto '+(i+1));const img=document.createElement('img');img.loading='lazy';img.alt='Dokumentasi HUT PPK ke-23 – foto '+(i+1);img.src='/images/documentation/'+encodeURIComponent(filename);button.append(img);button.addEventListener('click',()=>{enlarged.src=img.src;enlarged.alt=img.alt;viewer.hidden=false;document.body.style.overflow='hidden';document.querySelector('#closePhoto').focus()});gallery.append(button)});
  document.querySelector('#closePhoto').addEventListener('click',close);viewer.addEventListener('click',e=>{if(e.target===viewer)close()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!viewer.hidden)close()})
}