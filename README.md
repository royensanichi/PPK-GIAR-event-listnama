# Website Pendaftaran HUT PPK ke-23 — GIA Rajawali

Website bertema biru-emas, responsif untuk desktop dan mobile, dengan carousel yang dapat di-swipe.

## Menjalankan

1. Instal Node.js versi 18 atau lebih baru.
2. Buka terminal di folder ini.
3. Jalankan `npm start`.
4. Buka **http://localhost:3000** di browser. Di komputer/HP lain dalam jaringan yang sama, gunakan IP komputer server, contoh `http://192.168.1.10:3000`.

Tidak memerlukan `npm install` atau paket pihak ketiga. Jika port 3000 dipakai aplikasi lain, atur variabel lingkungan `PORT`.

## Fitur

- Detail acara: Sabtu 21 November 2026, pukul 18.00 WIB, GIA Rajawali Lt. 1, Pdt. Rudy Hariyanto, dress code Casual.
- Tombol daftar membuka dialog ukuran sedang. Nama lengkap dapat dikirim dengan Enter atau tombol Daftar Sekarang.
- Jumlah anggota dan daftar nama otomatis dari data server; satu kartu berisi maks. 5 anggota. Kartu dapat digeser di mobile.
- Burger menu → Edit daftar anggota → halaman admin dengan password.
- Admin: cari nama, hapus dengan konfirmasi, keluar admin.
- Data tersimpan di `data/members.json` dan dibagikan untuk semua pengunjung yang mengakses **server yang sama**.
- Halaman daftar otomatis memperbarui data setiap 30 detik saat aktif.

## Admin

Password awal: **giar**. Untuk menggantinya tanpa mengubah kode, tetapkan variabel lingkungan `ADMIN_PASSWORD` sebelum menjalankan server. Contoh PowerShell: `$env:ADMIN_PASSWORD='password-baru'; npm start`.

**Penting:** `giar` adalah password sangat lemah dan tidak cocok untuk website publik. Untuk mengunggah website ke internet, gunakan hosting Node.js dengan penyimpanan permanen, HTTPS, serta ganti password dengan password kuat. Admin login menggunakan cookie HttpOnly dengan masa aktif 8 jam, dan ada pembatasan sederhana percobaan login. Ini situs sederhana, bukan solusi autentikasi produksi skala besar. Jangan deploy ke hosting statis seperti Netlify static tanpa backend karena endpoint pendaftaran tidak akan berfungsi. Pada hosting dengan filesystem ephemeral, pastikan folder `data` memakai persistent storage.

## Struktur

- `public/index.html` — halaman utama
- `public/admin.html` — halaman admin
- `public/style.css` — tema dan responsivitas
- `public/app.js` — pendaftaran dan carousel
- `public/admin.js` — login, pencarian dan penghapusan
- `server.js` — server Node.js tanpa dependensi
- `data/members.json` — daftar anggota bersama

Daftar awal sengaja kosong, sehingga tidak ada nama fiktif.
