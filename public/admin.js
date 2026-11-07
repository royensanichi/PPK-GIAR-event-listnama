const $ = s => document.querySelector(s);
let members = [];
let pendingDelete = null;
let deleteTrigger = null;
let toastTimer;
function toast(message) { const node = $('#toast'); node.textContent = message; node.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => node.classList.remove('show'), 3000); }
async function api(url, options = {}) {
  const response = await fetch(url, { cache: 'no-store', ...options });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Terjadi kesalahan.');
  return body;
}
function setAuth(authenticated) {
  $('#loginPanel').hidden = authenticated;
  $('#dashboard').hidden = !authenticated;
  if (authenticated) { fetchMembers(); $('#searchMembers').focus(); }
  else $('#adminPassword').focus();
}
async function checkAuth() {
  try { const data = await api('/api/admin/status'); setAuth(data.authenticated); }
  catch (err) { toast(err.message); }
}
async function fetchMembers() {
  try { members = (await api('/api/members')).members; renderMembers(); }
  catch (err) { toast(err.message); }
}
function renderMembers() {
  const query = $('#searchMembers').value.trim().toLocaleLowerCase('id');
  const filtered = members.filter(m => m.name.toLocaleLowerCase('id').includes(query));
  $('#adminCount').textContent = members.length;
  $('#resultsText').textContent = `Menampilkan ${filtered.length} dari ${members.length} anggota`;
  const list = $('#adminList'); list.replaceChildren();
  if (!filtered.length) { const empty = document.createElement('p'); empty.className = 'admin-empty'; empty.textContent = 'Tidak ada nama yang cocok.'; list.append(empty); return; }
  filtered.forEach((member) => {
    const row = document.createElement('div'); row.className = 'admin-row';
    const text = document.createElement('span'); text.className = 'admin-row-name'; text.textContent = member.name;
    const button = document.createElement('button'); button.className = 'button-danger'; button.textContent = 'Hapus';
    button.addEventListener('click', () => openDelete(member, button));
    row.append(text, button); list.append(row);
  });
}
function openDelete(member, trigger) {
  pendingDelete = member; deleteTrigger = trigger;
  const description = $('#deleteDescription');
  description.replaceChildren();
  description.append(document.createTextNode('Anda akan menghapus “'));
  const boldName = document.createElement('strong');
  boldName.textContent = member.name;
  description.append(boldName, document.createTextNode('” dari daftar anggota. Tindakan ini tidak dapat dibatalkan.'));
  $('#deleteMessage').textContent = '';
  $('#deleteModal').hidden = false;
  $('#cancelDelete').focus();
}
function closeDelete() { $('#deleteModal').hidden = true; pendingDelete = null; deleteTrigger?.focus(); }
$('#cancelDelete').addEventListener('click', closeDelete);
$('#deleteModal').addEventListener('click', e => { if (e.target === $('#deleteModal')) closeDelete(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !$('#deleteModal').hidden) closeDelete();
  if (e.key === 'Tab' && !$('#deleteModal').hidden) {
    const first = $('#cancelDelete'), last = $('#confirmDelete');
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});
$('#confirmDelete').addEventListener('click', async () => {
  if (!pendingDelete) return;
  const button = $('#confirmDelete'); button.disabled = true;
  try {
    await api(`/api/admin/members/${encodeURIComponent(pendingDelete.id)}`, { method: 'DELETE' });
    closeDelete(); toast('Nama berhasil dihapus.'); await fetchMembers();
  } catch (err) { $('#deleteMessage').textContent = err.message; if (/login/i.test(err.message)) setAuth(false); }
  finally { button.disabled = false; }
});
$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault(); const message = $('#loginMessage'); message.textContent = '';
  const button = $('#loginForm button'); button.disabled = true;
  try {
    await api('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: $('#adminPassword').value }) });
    $('#adminPassword').value = ''; setAuth(true); toast('Berhasil masuk sebagai admin.');
  } catch (err) { message.textContent = err.message; message.classList.add('error'); }
  finally { button.disabled = false; }
});
$('#searchMembers').addEventListener('input', renderMembers);
$('#logoutButton').addEventListener('click', async () => { try { await api('/api/admin/logout', { method: 'POST' }); setAuth(false); toast('Anda sudah keluar.'); } catch (err) { toast(err.message); } });
checkAuth();

// Export always uses the complete member list, not search-filtered results.
function formatMemberReport() {
  return `Daftar Pria PPK HUT ke-23\n\nJumlah terdaftar saat ini ada ${members.length} anggota\n\nList Nama :\n\n${members.map((member, index) => `${index + 1}. ${member.name}`).join('\n')}`;
}
async function getLatestReport() {
  members = (await api('/api/members')).members;
  renderMembers();
  return formatMemberReport();
}
$('#copyMembers').addEventListener('click', async () => {
  try {
    const report = await getLatestReport();
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(report);
    } else {
      const area = document.createElement('textarea');
      area.value = report; area.style.position = 'fixed'; area.style.opacity = '0';
      document.body.append(area); area.select();
      const success = document.execCommand('copy'); area.remove();
      if (!success) throw new Error('Browser tidak mengizinkan menyalin otomatis.');
    }
    $('#copySuccessModal').hidden = false;
    $('#closeCopySuccess').focus();
  } catch (err) { toast(err.message); }
});
$('#whatsappMembers').addEventListener('click', async () => {
  try {
    const report = await getLatestReport();
    window.open(`https://wa.me/?text=${encodeURIComponent(report)}`, '_blank', 'noopener,noreferrer');
  } catch (err) { toast(err.message); }
});

function closeCopySuccess() {
  $('#copySuccessModal').hidden = true;
  $('#copyMembers').focus();
}
$('#closeCopySuccess').addEventListener('click', closeCopySuccess);
$('#copySuccessModal').addEventListener('click', e => {
  if (e.target === $('#copySuccessModal')) closeCopySuccess();
});
document.addEventListener('keydown', e => {
  if ($('#copySuccessModal').hidden) return;
  if (e.key === 'Escape') closeCopySuccess();
  if (e.key === 'Tab') { e.preventDefault(); $('#closeCopySuccess').focus(); }
});
