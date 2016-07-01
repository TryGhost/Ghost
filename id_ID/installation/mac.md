---
lang: id_ID
layout: installation
meta_title: Bagaimana Cara Menginstal Ghost di Server Anda - Dokumentasi Ghost
meta_description: Semua yang Anda butuhkan untuk membuat platform perblogan Ghost siap dan berjalan di lingkungan lokal ataupun remote.
heading: Menginstal &amp; Memulai Ghost
subheading: Langkah pertama untuk mengatur blog baru Anda untuk pertama kalinya.
permalink: /id_ID/installation/mac/
chapter: installation
section: mac
prev_section: installation
next_section: windows
---


# Menginstal di Mac <a id="install-mac"></a>

Untuk menginstal Node.js dan Ghost pada Mac, Anda membutuhkan sebuah jendela Terminal aktif. Anda dapat melakukannya dengan membuka spotlight dan mengetikkan "Terminal".

### Menginstal Node

*   Pada halaman [http://nodejs.org](http://nodejs.org) tekan install, maka sebuah berkas '.pkg' akan segera diunduh.
*   Klik pada unduhan untuk membuka installer, hal tersebut akan menginstal baik node maupun npm.
*   Klik dan ikuti installer teesebut, lalu akhiri dengan mengetikkan kata sandi Anda kemudian klik 'install software'.
*   Setelah intalasi selesai dilakukan, pergi ke jendela Terminal yang terbuka lalu ketik `echo $PATH` untuk memastikan '/usr/local/bin/' berada dalam path Anda.

<p class="note"><strong>Catatan:</strong> Jika '/usr/local/bin' tidak tampil pada $PATH Anda, lihat <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/troubleshooting#export-path">tips mengatasi masalah</a> untuk mencari tahu bagaimana cara menambahkannya</p>

Jika Anda menemui jalan buntu, Anda dapat melihat semua [proses menginstal di sini](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-node-mac.gif "Menginstall Node di Mac").

### Menginstal dan Menjalankan Ghost

*   Log in pada [http://ghost.org](http://ghost.org), kemudian klik tombol 'Download Ghost Source Code' berwarna biru.
*   Pada halaman Unduh, tekan tombol untuk mengunduh berkas zip termutakhir.
*   Klik pada tanda panah yang dekat dengan berkas yang telah diunduh, kemudian pilih 'show in finder'.
*   Di dalam finder, klik-ganda berkas zip unduhan untuk mengekstraknya.
*   Selanjutnya, klik dan tahan direktori 'ghost-#.#.#'' lalu seret ke atas bar tab pada jendela Terminal Anda, dengan melakukannya Anda akan membuka sebuah tab terminal baru yang merujuk pada lokasi di mana direktori berada.
*   Pada tab terminal yang baru saja dibuka, ketik `npm install --production` <span class="note">perhatikan tanda garis tengah dua kali</span>
*   Ketika npm selesai diinstal, ketikkan `npm start` untuk memulai Ghost dalam mode pengembangan.
*   Dalam browser, arahkan ke alamat <code class="path">127.0.0.1:2368</code> untuk melihat blog Ghost yang baru saja Anda atur.
*   Ubahlah url menjadi <code class="path">127.0.0.1:2368/ghost</code> dan buatlah akun pengguna admin Anda untuk login ke halaman admin Ghost.
*   Lihat [dokumentasi penggunaan](/usage) untuk instruksi-instruksi selanjutnya

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-ghost-mac.gif)

