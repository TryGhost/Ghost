---
lang: id
layout: installation
meta_title: Cara Menginstall Ghost di Server Anda - Ghost Docs
meta_description: Semua yang Anda butuhkan untuk menjalankan platform blogging Ghost di lingkungan lokal dan remote.
heading: Menginstall Ghost &amp; Memulai
subheading: Langkah awal untuk mengatur blog baru Anda untuk pertamakalinya.
permalink: /id/installation/linux/
chapter: instalasi
section: linux
prev_section: windows
next_section: deploy
---


# Menginstall pada Linux <a id="install-linux"></a>

<p class="note"><strong>Catatan</strong> Ghost membutuhkan Node.js <strong>0.10.x</strong> (versi stabil terakhir). Kami merekomendasikan Node.js <strong>0.10.30</strong> & npm <strong>1.4.21</strong>.</p>

### Install Node

*   Antara unduh arsip `.tar.gz` dari [http://nodejs.org](http://nodejs.org), atau Anda mungkin lebih memilih mengikuti instruksi cara [menginstall dari package manager](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager).
*   Cek lagi apakah Anda telah menginstall Node dan npm dengan mengetik `node -v` dan `npm -v` di jendela terminal

### Install dan Jalankan Ghost


**Jika Anda menggunakan Linux pada komputer anda ikuti langkah berikut:**

*   Masuk ke [http://ghost.org](http://ghost.org), dan klik tombol 'Download Ghost Source Code' berwarna biru
*   Pada halaman downloads, tekan tombol untuk mengunduh berkas zip terakhir & ekstrak berkas ke lokasi dimana Anda ingin menjalankan Ghost


**Jika Anda menggunakan Linux sebagai sistem operasi tamu atau melalui SSH dan hanya memiliki terminal, maka:**

*   Gunakan perintah berikut untuk mengunduh rilisan terbaru dari Ghost:

    ```
    $ curl -L https://ghost.org/zip/ghost-latest.zip -o ghost.zip
    ```

*   Ekstrak berkas dan ganti direktori dengan:

    ```
    $ unzip -uo ghost.zip -d ghost
    ```


**Setelah anda berhasil mengekstrak Ghost buka terminal, jika Anda belum, lalu:**

*   Ganti ke direktori dimana Anda telah mengekstrak Ghost dengan perintah berikut:

    ```
    $ cd /path/to/ghost
    ```

*   Untuk menginstall Ghost ketik:

    ```
    npm install --production
    ```
    <span class="note">note the two dashes</span>

*   Saat npm telah selesai menginstall, ketik berikut untuk menjalankan Ghost pada mode developmen: 

    ```
    $ npm start
    ```

*   Ghost akan dijalankan di **127.0.0.1:2368**<br />
    <span class="note">Anda dapat mengatur alamat IP dan port di **config.js**</span>

*   Pada browser, kunjungi [http://127.0.0.1:2368](http://127.0.0.1:2368) untuk melihat blog Ghost yang baru saja Anda buat
*   Ganti url ke [http://127.0.0.1:2368/ghost](http://127.0.0.1:2368/ghost) dan buat akun admin untuk masuk ke area admin Ghost
