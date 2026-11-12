/**
 * Footer event configuration.
 * Ubah CURRENT_EVENT_ID saat event utama berganti, lalu tambahkan detail event
 * baru pada EVENTS. Halaman detail dapat menggunakan data-footer-event pada <body>.
 * Tidak bergantung pada database atau API pendaftaran.
 */
const EVENTS = {
  "hut-ppk-23": {
    title: "HUT PPK ke-23",
    theme: "Grace-Fueled Man",
    description: "Pria yang Digerakkan oleh Kasih Karunia · 1 Korintus 15:10"
  }
};
const CURRENT_EVENT_ID = "hut-ppk-23";

(function updateEventFooter() {
  const eventId = document.body.dataset.footerEvent || CURRENT_EVENT_ID;
  const event = EVENTS[eventId] || EVENTS[CURRENT_EVENT_ID];
  if (!event) return;
  document.querySelectorAll("[data-event-title]").forEach(el => { el.textContent = event.title; });
  document.querySelectorAll("[data-event-theme]").forEach(el => { el.textContent = event.theme; });
  document.querySelectorAll("[data-event-description]").forEach(el => { el.textContent = event.description; });
})();
