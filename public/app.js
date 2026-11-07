const $ = (selector) => document.querySelector(selector);
const menuButton = $('#menuButton');
const siteMenu = $('#siteMenu');
const modal = $('#registrationModal');
const form = $('#registerForm');
const carousel = $('#membersCarousel');
let cardCount = 0;
let lastFocus = null;
let toastTimer;

function toast(message) {
  const el = $('#toast');
  el.textContent = message; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
}
function showForm() {
  lastFocus = document.activeElement;
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  $('#formMessage').textContent = '';
  $('#formMessage').classList.remove('error');
  $('#fullName').focus();
}
function hideForm() {
  modal.hidden = true;
  document.body.style.overflow = '';
  lastFocus?.focus();
}
menuButton.addEventListener('click', () => {
  siteMenu.hidden = !siteMenu.hidden;
  menuButton.setAttribute('aria-expanded', String(!siteMenu.hidden));
});
document.addEventListener('click', event => {
  if (!event.target.closest('.top-actions')) {
    siteMenu.hidden = true; menuButton.setAttribute('aria-expanded', 'false');
  }
});
$('#openRegistration').addEventListener('click', showForm);
$('#closeRegistration').addEventListener('click', hideForm);
modal.addEventListener('click', e => { if (e.target === modal) hideForm(); });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') { if (!modal.hidden) hideForm(); siteMenu.hidden = true; menuButton.setAttribute('aria-expanded', 'false'); }
  if (event.key === 'Tab' && !modal.hidden) {
    const focusable = Array.from(modal.querySelectorAll('button:not([disabled]),input:not([disabled])'));
    const first = focusable[0], last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});

function renderMembers(members) {
  animateRegistrationCount(members.length);
  carousel.replaceChildren();
  $('#carouselDots').replaceChildren();
  cardCount = Math.ceil(members.length / 5);
  if (!cardCount) {
    const empty = document.createElement('div'); empty.className = 'empty-state';
    empty.textContent = 'Belum ada nama yang terdaftar. Jadilah yang pertama!';
    carousel.append(empty);
  }
  for (let i = 0; i < cardCount; i++) {
    const card = document.createElement('article'); card.className = 'member-card';
    const list = document.createElement('ol'); list.className = 'member-rows';
    members.slice(i * 5, i * 5 + 5).forEach((member, j) => {
      const row = document.createElement('li');
      const number = document.createElement('span'); number.className = 'member-number'; number.textContent = String(i * 5 + j + 1).padStart(2, '0');
      const name = document.createElement('span'); name.textContent = member.name;
      row.append(number, name); list.append(row);
    });
    card.append(list); carousel.append(card);
    const dot = document.createElement('button'); dot.className = 'dot'; dot.type = 'button'; dot.setAttribute('aria-label', `Lihat kelompok ${i + 1}`);
    dot.addEventListener('click', () => card.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' }));
    $('#carouselDots').append(dot);
  }
  carousel.scrollLeft = 0;
  updateCarousel();
}
function updateCarousel() {
  const cards = Array.from(carousel.querySelectorAll('.member-card'));
  if (!cards.length) {
    $('#carouselPosition').textContent = '0 dari 0 kartu';
    $('#prevCard').disabled = $('#nextCard').disabled = true;
    return;
  }
  let index = 0;
  let distance = Infinity;
  cards.forEach((card, i) => {
    const d = Math.abs(card.offsetLeft - cards[0].offsetLeft - carousel.scrollLeft);
    if (d < distance) { distance = d; index = i; }
  });
  $('#carouselPosition').textContent = `${index + 1} dari ${cardCount} kartu`;
  Array.from($('#carouselDots').children).forEach((dot, i) => dot.classList.toggle('active', i === index));
  $('#prevCard').disabled = index === 0;
  $('#nextCard').disabled = index === cardCount - 1 || carousel.scrollWidth <= carousel.clientWidth + 2;
}
carousel.addEventListener('scroll', updateCarousel, { passive: true });
window.addEventListener('resize', updateCarousel);
function moveCard(direction) {
  const cards = Array.from(carousel.querySelectorAll('.member-card'));
  if (!cards.length) return;
  let current = cards.reduce((best, card, i) => Math.abs(card.offsetLeft - cards[0].offsetLeft - carousel.scrollLeft) < Math.abs(cards[best].offsetLeft - cards[0].offsetLeft - carousel.scrollLeft) ? i : best, 0);
  current = Math.max(0, Math.min(cards.length - 1, current + direction));
  carousel.scrollTo({ left: cards[current].offsetLeft - cards[0].offsetLeft, behavior: 'smooth' });
}
$('#prevCard').addEventListener('click', () => moveCard(-1));
$('#nextCard').addEventListener('click', () => moveCard(1));
carousel.addEventListener('keydown', e => { if (e.key === 'ArrowRight') moveCard(1); else if (e.key === 'ArrowLeft') moveCard(-1); });
async function loadMembers() {
  try {
    const response = await fetch('/api/members', { cache: 'no-store' });
    if (!response.ok) throw new Error('Tidak dapat mengambil daftar anggota.');
    const data = await response.json(); renderMembers(data.members);
  } catch (error) { toast(error.message); }
}
form.addEventListener('submit', async e => {
  e.preventDefault();
  const name = $('#fullName').value.trim().replace(/\s+/g, ' ');
  const message = $('#formMessage');
  message.textContent = ''; message.classList.remove('error');
  if (name.length < 3) { message.textContent = 'Masukkan nama lengkap minimal 3 karakter.'; message.classList.add('error'); return; }
  const button = $('#submitRegistration'); button.disabled = true;
  try {
    const response = await fetch('/api/members', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Pendaftaran gagal.');
    form.reset(); hideForm(); toast(`Terima kasih, ${name}! Pendaftaran berhasil.`); await loadMembers();
  } catch (error) { message.textContent = error.message; message.classList.add('error'); }
  finally { button.disabled = false; }
});
loadMembers();
// Refresh periodically to show registrations made on other devices.
setInterval(() => { if (modal.hidden && document.visibilityState === 'visible') loadMembers(); }, 30000);

// Typewriter effect: refreshes when member totals change, without queuing stale timers.
let countTypingTimer;
let lastTypedCount = null;
function animateRegistrationCount(count) {
  if (lastTypedCount === count) return;
  lastTypedCount = count;
  const target = document.getElementById('typewriterText');
  if (!target) return;
  const phrase = `Sudah ${count} anggota mendaftar`;
  clearInterval(countTypingTimer);
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    target.textContent = phrase;
    return;
  }
  let i = 0;
  target.textContent = '';
  countTypingTimer = setInterval(() => {
    i += 1;
    target.textContent = phrase.slice(0, i);
    if (i >= phrase.length) clearInterval(countTypingTimer);
  }, 58);
}
