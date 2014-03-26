---
lang: id_ID
layout: installation
meta_title: Bagaimana Menginstal Ghost di Server Anda - Ghost Docs
meta_description: Semua yang Anda butuhkan untuk menginstal platform blogging Ghost dan menjalankannya pada server lokal atau remote.
heading: Menginstal &amp; Mulai Menjalankan Ghost
subheading: Langkah pertama untuk mengatur blog Anda untuk pertamakalinya.
permalink: /id_ID/installation/windows/
chapter: installation
section: windows
prev_section: mac
next_section: linux
---

# Menginstal di Windows <a id="install-windows"></a>

### Instal Node

*   Pada [http://nodejs.org](http://nodejs.org) tekan install, sebuah berkas '.msi' akan diunduh
*   Klik pada file yang terunduh untuk membuka installer, ini akan menginstal Node dan npm.
*   Klik installer, hingga Anda melihat laman yang mengatakan bahwa Node.js sudah terinstal.

Jika Anda kebingungan, Anda bisa melihat seluruh [perjalanan proses di sini](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-node-win.gif "Install node on Windows").

### Unduh & Ekstrak Ghost

*   Log in ke [http://ghost.org](http://ghost.org), lalu klik tombol 'Download Ghost Source Code' warna biru.
*   Pada laman unduhan, tekan tombol untuk mengunduh berkas zip termutakhir.
*   Klik tanda panah di samping berkas yang baru saja terunduh, lalu pilih 'show in folder'.
*   Sesudah folder terbuka, klik kanan pada berkas zip terunduh dan pilih 'Extract all'.

Jika Anda kebingungan, Anda bisa melihat seluruh [perjalanan proses di sini](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-ghost-win.gif "Install Ghost on Windows Part 1").

### Instal dan Jalankan Ghost

*   Pada start menu, temukan 'Node.js' lalu pilih 'Node.js Command Prompt'
*   Pada Node command prompt, Anda harus mengganti direktori dimana Anda mengekstrak Ghost. Ketik: `cd Downloads/ghost-#.#.#` (gantikan tanda hash dengan versi Ghost yang Anda unduh).
*   Berikutnya, pada command prompt ketik `npm install --production` <span class="note">perhatikan tanda strip (dash) ganda</span>
*   Sesudah npm terinstal, ketik `npm start` untuk menjalankan Ghost dalam mode pengembangan
*   Pada sebuah peramban (browser), navigasikan ke <code class="path">127.0.0.1:2368</code> untuk melihat blog Ghost Anda yang baru saja terbangun
*   Ubah url ke <code class="path">127.0.0.1:2368/ghost</code> lalu buat admin user Anda untuk login ke Ghost admin.
*   Baca [dokumentasi penggunaan](/usage) untuk instruksi selanjutnya

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-ghost-win-2.gif "Install Ghost on Windows - Part 2")

