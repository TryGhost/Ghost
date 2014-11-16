---
lang: id
layout: installation
meta_title: Cara menginstall Ghost pada Server Anda - Ghost Docs
meta_description: Semua yang Anda butuhkan untuk menjalankan platform blogging Ghost di lingkungan lokal dan remote.
heading: Menginstall Ghost &amp; Memulai
subheading: Langkah awal untuk mengatur blog baru Anda untuk pertamakalinya.
permalink: /id/installation/mac/
chapter: instalasi
section: mac
prev_section: instalasi
next_section: windows
---


# Menginstal pada Mac <a id="install-mac"></a>

<p class="note"><strong>Catatan</strong> Ghost membutuhkan Node.js <strong>0.10.x</strong> (versi stabil terakhir). Kami merekomendasikan Node.js <strong>0.10.30</strong> & npm <strong>1.4.21</strong>.</p>

Untuk menginstall Node.js dan Ghost pada mac Anda, Anda membutuhkan jendela terminal yang terbuka. Anda dapat membukanya dengan cara membuka spotlight dan mengetik "Terminal".

### Menginstall Node

*   Pada [http://nodejs.org](http://nodejs.org) tekan install, sebuah file '.pkg' akan di-download
*   Klik file yang telah di-download untuk membuka installer, installer ini akan menginstall node dan npm.
*   Klik untuk melalui installer, dan pada akhirnya masukkan password dan klik 'install software'.
*   Setelah instalasi selesai, klik pada jendela Terminal yang sudah dibuka dan ketik `echo $PATH` untuk mengecek bahwa '/usr/local/bin/' ada dalam Path Anda.

<p class="note"><strong>Catatan:</strong> Jika '/usr/local/bin' tidak muncul dalam $PATH Anda, silahkan lihat <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/troubleshooting#export-path">troubleshooting tips</a> untuk mengetahui cara menambahkannya.</p>

Jika Anda mengalami masalah, Anda dapat melihat seluruh [proses in-action di sini](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-node-mac.gif "Install Node on Mac").

### Install dan Jalankan Ghost

*   Log in ke [http://ghost.org](http://ghost.org), dan klik tombol biru 'Download Ghost Source Code'.
*   Pada halaman Downloads, klik tombol untuk mengunduh file zip terbaru.
*   Klik tanda panah next ke file yang telah diunduh dan pilih 'show in finder'.
*   Di dalam finder, double-click zip file yang telah diunduh untuk mengekstraknya.
*   Selanjutnya, ambil folder yang baru saja diekstrak 'ghost-#.#.#' dan drag ke tab bar dari jendela terminal yang terbuka, hal ini akan membuat tab terminal baru yang terbuka pada lokasi yang sesuai.
*   Pada tab terminal yang baru ketik `npm install --production` <span class="note">perhatikan tanda strip ganda</span>
*   Saat npm sudah selesai diinstall, ketik `npm start` untuk memulai Ghost pada mode Development.
*   Pada browser, arahkan ke <code class="path">127.0.0.1:2368</code> untuk melihat blog Ghost yang baru di setup.
*   Ganti url ke <code class="path">127.0.0.1:2368/ghost</code> dan buat admin user Anda untuk log in ke Ghost admin.
*   Lihat [usage docs](/usage) untuk instruksi selanjutnya.

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-ghost-mac.gif)

