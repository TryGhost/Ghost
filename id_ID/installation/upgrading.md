---
lang: id_ID
layout: installation
meta_title: Bagaimana Cara Menginstall Ghost di Server Anda - Ghost Docs
meta_description: Semua yang Anda butuhkan untuk menginstal platform blogging Ghost dan menjalankannya pada server lokal atau remote.
heading: Menginstal &amp; Mulai Menjalankan Ghost
subheading: Langkah pertama untuk mengatur blog Anda untuk pertama kalinya.
permalink: /id_ID/installation/upgrading/
chapter: installation
section: upgrading
prev_section: deploy
next_section: troubleshooting
---

# Memperbaharui Ghost <a id="upgrade"></a>

Memperbaharui Ghost sangatlah mudah.

Terdapat dua cara yang dapat Anda tempuh untuk memperbaharui Ghost, yaitu [tipe tunjuk-dan-klik](#how-to) dan [command line](#cli). Berikut akan dijelaskan apa saja yang akan terjadi dan bagaimana proses per-langkahnya untuk kedua pilihan tersebut. Anda dibebaskan untuk memilih metode yang Anda anggap nyaman untuk Anda.

<p class="note"><strong>Buat cadangan (back-up)!</strong> Selalu cadangkan data dan pengaturan yang telah Anda miliki sebelum melakukan pembaharuan. Silahkan baca <a href="#backing-up">instruksi untuk membuat cadangan</a> terlebih dahulu!</p>

## Overview

<img src="https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/folder-structure.png" style="float:left" />

Setelah terinstal, Ghost mempunyai struktur direktori yang mirip dengan apa yang ditunjukkan di samping kiri. Didalamnya terdapat dua direktori utama, yaitu <code class="path">content</code> dan <code class="path">core</code>, ditambah beberapa berkas pada level root.

Memperbaharui Ghost sama halnya dengan mengganti berkas-berkas yang lama dengan berkas-berkas yang baru, menjalankan ulang `npm install` untuk memutakhirkan direktori <code class="path">node_modules</code> dan kemudian melakukan start ulang Ghost untuk melihat efeknya.

Ingatlah, secara standar, Ghost menyimpan semua data suai, tema, foto, dsb di dalam direktori <code class="path">content</code>. Jadi, pastikan direktori tersebut tetap aman! Gantilah berkas-berkas yang hanya terdapat pada direktori <code class="path">core</code> dan root, dengan demikian semuannya akan baik-baik saja.

## Membuat Cadangan <a id="backing-up"></a>

<img src="https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/export.png" style="float:right" />

*   Untuk membuat cadangan semua data dari basis data Anda, masuklah ke instalasi Ghost Anda lalu pergilah ke <code class="path">/ghost/debug/</code>. Tekan tombol export untuk mengunduh berkas JSON yang berisikan semua data. Dan... tugas Anda Selesai
*   Untuk membuat cadangn tema dan foto-foto Anda, Anda dapat menyalin berkas-berkas tersebut dari <code class="path">content/themes</code> dan <code class="path">content/images</code>

<p class="note"><strong>Catatan:</strong> Jika Anda suka, ambilah salinan basis data Anda dari <code class="path">content/data</code> tetapi <strong>ingatlah</strong> jangan lakukan hal ini ketika Ghost sedang berjalan. Silahkan berhentikan Ghost terlebih dahulu untuk melakukannya.</p>


## Cara Memperbaharui <a id="how-to"></a>

Bagaimana cara memperbaharui mesin lokal Anda

<p class="warn"><strong>PERINGATAN:</strong> <strong>JANGAN</strong> menyalin dan menempel keseluruhan direktori Ghost di atas instalasi yang sudah ada. <strong>JANGAN</strong> memilih <kbd>REPLACE</kbd> jika Anda mengunggah dengan menggunakan Transmit atau perangkat lunak FTP lainnya, sebaliknya pilihlah <strong>MERGE</strong>.</p>

*   Unduhlah versi Ghost termutakhir dari [Ghost.org](http://ghost.org/download/)
*   Ekstrak berkas zip ke sebuah lokasi sementara
*   Salin semua berkas pada level root dari versi termutakhir. Termasuk didalamnya: berkas index.js, package.json, Gruntfile.js, config.example.js, the license dan berkas readme.
*   Selanjutnya, hapus semua direktori <code class="path">core</code> lama, kemudian simpan direktori <code class="path">core</code> baru sebagai penggantinya.
*   Untuk rilis yang terdapat Casper (tema standar dari Ghost) didalamnya, hapus direktori <code class="path">content/themes/casper</code> lama dan ganti dengan yang baru.
*   Jalankan `npm install --production`
*   Terakhir, start ulang Ghost untuk melihat perubahannya.

## Command line <a id="cli"></a>

<p class="note"><strong>Buat cadangan (back-up)!</strong> Selalu cadangkan data dan pengaturan yang telah Anda miliki sebelum melakukan pembaharuan. Silahkan baca <a href="#backing-up">instruksi untuk membuat cadangan</a> terlebih dahulu!</p>

### Command line untuk Mac <a id="cli-mac"></a>

*Screencast* berikut menunjukkan langkah-langkah yang diperlukan untuk memperbaharui Ghost di mana berkas zip telah diunduh ke direktori <code class="path">~/Downloads</code> dan Ghost telah terinstal di <code class="path">~/ghost</code> <span class="note">**Catatan:** `~` berarti direktori home pengguna pada Mac dan Linux</span>

![Perbaharui ghost](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/mac-update.gif)

Langkah-langkah dalam *screencast* tersebut adalah sebagai berikut:

*   <code class="path">cd ~/Downloads</code> - ubah direktori menjadi direktory Downloads, di mana Ghost versi termutakhir berada
*   `unzip ghost-0.4.0.zip -d ghost-0.4.0` - ekstrak ghost menjadi direktori <code class="path">ghost-0.4.0</code>
*   <code class="path">cd ghost-0.4.0</code> - ubah lokasi direktori menjadi direktori <code class="path">ghost-0.4.0</code>
*   `ls` - tunjukkan semua berkas dan direktori yang terdapat di dalam direktori ini
*   `cp *.js *.json *.md LICENSE ~/ghost` - salin semua berkas .md .js .txt dan .json dari lokasi ini ke <code class="path">~/ghost</code>
*   `rm -rf ~/ghost/core` - hapus direktori <code class="path">core</code>
*   `cp -R core ~/ghost` - salin direktori <code class="path">core</code> dan semua isinya ke <code class="path">~/ghost</code>
*   `cp -R content/themes/casper ~/ghost/content/themes` - salin direktori <code class="path">casper</code> dan semua isinya ke <code class="path">~/ghost/content/themes</code>
*   `cd ~/ghost` - ubah direktori menjadi direktori <code class="path">~/ghost</code>
*   `npm install --production` - instal Ghost
*   `npm start` - jalankan Ghost

### Command line untuk server Linux <a id="cli-server"></a>

*   Pertama-tama, Anda harus menemukan URL dari versi Ghost termutakhir. URL tersebut harus seperti `http://ghost.org/zip/ghost-latest.zip`.
*   Ambil berkas zip dengan mengetikkan `wget http://ghost.org/zip/ghost-latest.zip` (atau URL apapun dari versi Ghost termutakhir).
*   Hapus direktori lama dari instalasi Anda
*   Ekstrak berkas zip yang didapat sebelumnya dengan `unzip -uo ghost-0.4.*.zip -d path-to-your-ghost-install`
*   Jalankan `npm install --production` untuk mendapatkan dependensi yang baru
*   Akhirnya, jalankan ulang Ghost untuk melihat perubahannya

**Tambahan**, halaman [howtoinstallghost.com](http://www.howtoinstallghost.com/how-to-update-ghost/) juga memaparkan instruksi-instruksi untuk memperbaharui Ghost untuk server berbasis Linux.

### Bagaimana memutakhirkan DigitalOcean Droplet <a id="digitalocean"></a>

<p class="note"><strong>Buat cadangan (back-up)!</strong> Selalu cadangkan data dan pengaturan yang telah Anda miliki sebelum melakukan pembaharuan. Silahkan baca <a href="#backing-up">instruksi untuk membuat cadangan</a> terlebih dahulu!</p>

*   Pertama-tama, Anda harus menemukan URL dari versi Ghost termutakhir. URL tersebut harus seperti `http://ghost.org/zip/ghost-latest.zip`.
*   Setelah Anda menemukannya, ketik `cd /var/www/` pada konsol Droplet Anda untuk mengubah direktori menjadi direktori di mana kode dasar Ghost berada.
*   Selanjutnya, ketikkan `wget http://ghost.org/zip/ghost-latest.zip` (atau URL apapun dari versi Ghost termutakhir).
*   Hapus direktori core lama dengan `rm -rf ghost/core`
*   Ekstrak berkas zip dengan `unzip -uo ghost-latest.zip -d ghost`
*   Pastikan semua berkas mempunyai izin yang benar untuk melakukan perubahan dengan `chown -R ghost:ghost ghost/*`
*   Ubah direktori ke <code class="path">ghost</code> dengan `cd ghost`
*   Jalankan `npm install --production` untuk mendapatkan dependensi yang baru
*   Akhirnya, jalankan ulang Ghost agar dapat melihat perubahannya dengan `service ghost restart` (akan cukup menyita waktu)


## Bagaimana memperbaharui Node.js menjadi versi termutakhir <a id="upgrading-node"></a>

Jika sebelumnya Anda menginstal Node.js dari website [Node.js](nodejs.org), Anda dapat memperbaharuinya dengan cara mengunduh dan menjalankan installer termutakhir. Hal tersebut akan menggantikan versi yang sekarang Anda punyai dengan versi terbaru.

Jika Anda menggunakan Ubuntu atau distribusi Linux lainnya yang menggunakan `apt-get`, perintah untuk memperbaharui node adalah sama dengan perintah menginstalnya: `sudo apt-get install nodejs`.

Anda **tidak** perlu menjalankan ulang server atau Ghost.