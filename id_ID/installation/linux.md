---
layout: installation
meta_title: Bagaimana Cara Menginstall Ghost di Server Anda - Ghost Docs
meta_description: Semua yang Anda butuhkan untuk menginstal platform blogging Ghost dan menjalankannya pada server lokal atau remote.
heading: Menginstal &amp; Mulai Menjalankan Ghost
subheading: Langkah pertama untuk mengatur blog Anda untuk pertamakalinya.
permalink: /id_ID/installation/linux/
chapter: installation
section: linux
prev_section: windows
next_section: deploy
---


# Menginstal di Linux <a id="install-linux"></a>

### Instal Node

*   Anda bisa memilih untuk mengunduh arsip `.tar.gz` dari [http://nodejs.org](http://nodejs.org), atau mengikuti instruksi cara [menginstal dari package manager](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager).
*   Ricek apakah Anda sudah memiliki instalasi Node dan npm dengan mengetikkan `node -v` dan `npm -v` pada terminal

### Menginstal dan Menjalankan Ghost


**Jika Anda menggunakan Linux pada desktop, ikuti langkah-langkah berikut:**

*   Log in ke [http://ghost.org](http://ghost.org), lalu klik tombol 'Download Ghost Source Code' warna biru
*   Pada laman unduhan, tekan tombol untuk mengunduh berkas zip termutakhir kemudian ekstrak berkas itu ke lokasi yang Anda pilih untuk menjalankan Ghost


**Jika And menggunakan Linux sebagai guest OS atau melalui SSH dan hanya memiliki terminal, maka:**

*   Gunakan perintah berikut untuk mengunduh versi Ghost termutakhir:

    ```
    $ curl -L https://ghost.org/zip/ghost-latest.zip -o ghost.zip
    ```

*   Unzip arsip tersebut dan masuk ke direktori dengan perintah berikut:

    ```
    $ unzip -uo ghost.zip -d ghost
    ```


**Setelah Anda berhasil mengekstrak Ghost, buka terminal, jika belum, maka:**

*   Masuk ke direktori dimana Anda mengekstrak Ghost dengan perintah berikut:

    ```
    $ cd /path/to/ghost
    ```

*   Untuk menginstal Ghost, ketik:

    ```
    npm install --production
    ```
    <span class="note">perhatikan tanda strip (dash) ganda</span>

*   Sesudah npm usai menginstal, ketik perintah berikut untuk menjalankan Ghost dalam mode development: 

    ```
    $ npm start
    ```

*   Ghost akan berjalan pada **127.0.0.1:2368**<br />
    <span class="note">Anda bisa mengatur alamat IP dan port di **config.js**</span>

*   Dalam sebuah peramban, navigasikan ke [http://127.0.0.1:2368](http://127.0.0.1:2368) untuk melihat blog Ghost Anda yang sudah terpasang
*   Ubah url ke [http://127.0.0.1:2368/ghost](http://127.0.0.1:2368/ghost) dan buatlah akun admin user Anda untuk login ke panel administrasi Ghost
