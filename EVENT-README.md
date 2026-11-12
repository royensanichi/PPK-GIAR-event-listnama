# Event & Dokumentasi PPK GIA Rajawali

- **Main** tetap di `/`, termasuk pendaftaran dan daftar anggota.
- **Event** tersedia di `/events.html`.
- **HUT PPK ke-23** ada di `/events/hut-ppk-23.html` dengan brosur dan galeri dokumentasi.
- Letakkan foto brosur di `public/images/hut-ppk-23-poster.jpg` (berkas foto tersedia di ZIP lengkap).
- Untuk menambahkan foto kegiatan: unggah ke `public/images/documentation/` lalu tulis nama-nama file di array `photos` pada `public/events.js`.
- Saat belum ada foto, halaman sengaja menampilkan status dokumentasi belum tersedia.
- API pendaftaran, database, admin, dan Netlify config **tidak diubah**.

## Footer Event Saat Ini
Footer di Main, Event, detail event, dan Admin menampilkan **nama event aktif**, diikuti **tema** dan **deskripsi tema**. Data dikelola dari `public/event-footer.js`. Untuk mengganti event aktif di masa depan, tambahkan objek event pada `EVENTS` dan ubah `CURRENT_EVENT_ID`; tidak perlu mengedit footer pada setiap HTML. Pada halaman detail khusus, `data-footer-event="id-event"` di elemen `<body>` dapat memilih event tertentu.
