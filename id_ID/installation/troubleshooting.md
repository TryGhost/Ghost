---
lang: id_ID
layout: installation
meta_title: Bagaimana Cara Menginstall Ghost di Server Anda - Ghost Docs
meta_description: Semua yang Anda butuhkan untuk menginstal platform blogging Ghost dan menjalankannya pada server lokal atau remote.
heading: Menginstal &amp; Mulai Menjalankan Ghost
subheading: Langkah pertama untuk mengatur blog Anda untuk pertama kalinya.
permalink: /id_ID/installation/troubleshooting/
chapter: installation
section: troubleshooting
prev_section: upgrading
---


# Troubleshooting & FAQ <a id="troubleshooting"></a>

<dl>
    <dt id="export-path">'/usr/local/bin' tidak tampak di $PATH</dt>
    <dd>Anda dapat menambahkannya dengan melakukan prosedur berikut:
        <ul>
            <li>Pada jendela terminal Anda, ketikkan <code>cd ~</code>, untuk berpindah ke direktori home Anda</li>
            <li>Selanjutnya ketikkan <code>ls -al</code> untuk memunculkan semua berkas dan direktori yang ada di dalam direktori ini, termasuk yang awalnya tersembunyi</li>
            <li>Anda akan melihat sebuah berkas yang bernama <code class="path">.profile</code> atau <code class="path">.bash_profile</code>, jika tidak, ketik <code>touch .bash_profile</code> untuk membuat sebuah berkas .bash_profile baru</li>
            <li>Lalu, ketik <code>open -a Textedit .bash_profile</code> untuk membuka berkas tersebut dengan Textedit.</li>
            <li>Tambahkan <code>export PATH=$PATH:/usr/local/bin/</code> pada bagian akhir berkas kemudia simpan</li>
            <li>Pengaturan baru ini akan dimuat ketika sebuah terminal baru dimulai, jadi cobalah buka sebuah tab atau jendela terminal baru kemudian ketik <code>echo $PATH</code> untuk melihat '/usr/local/bin/'.</li>
        </ul>
    </dd>
    <dt id="sqlite3-errors">SQLite3 tidak terinstal</dt>
    <dd>
        <p>Pada arsitektur yang umum, paket SQLite3 datang bersama *pre-built binaries*. Jika Anda menggunakan distribusi linux yang sedikit kurang populer atau tipe unix lainnya, Anda akan dapati bahwa SQLite3 akan memberikan pesan 404 kepada Anda. Hal ini dikarenakan tidak ditemukannya *pre-build binaries* pada platform yang Anda gunakan.</p>
        <p>Masalah ini dapat diselesaikan dengan memaksakan SQLite3 untuk melakukan kompilasi. Namun dibutuhkan python & gcc untuk melakukannya. Untuk mencobanya, ketikkan <code>npm install sqlite3 --build-from-source</code> pada terminal Anda</p>
        <p>Jika solusi di atas tidak mempan, mungkin terdapat dependensi python atau gcc yang hilang, pada linux cobalah jalankan <code>sudo npm install -g node-gyp</code>, <code>sudo apt-get install build-essential</code> dan <code>sudo apt-get install python-software-properties python g++ make</code> sebelum Anda mencoba membangun ulang Ghost dari kode sumber (source).</p>
        <p>Untuk informasi lebih lanjut mengenai bagaimana membangun bentuk biner, silahkan lihat: <a href="https://github.com/developmentseed/node-sqlite3/wiki/Binaries">https://github.com/developmentseed/node-sqlite3/wiki/Binaries</a></p>
        <p>Setelah Anda sukses membangun bentuk biner untuk platform Anda, silahkan ikuti <a href="https://github.com/developmentseed/node-sqlite3/wiki/Binaries#creating-new-binaries">instruksi-instruksi di sini</a> untuk mensubmit bentuk biner ke project node-sqlite, sehingga para pengguna selanjutnya tidak akan menemui masalah yang sama.</p>
    </dd>
    <dt id="image-uploads">Saya tidak dapat mengunggah foto</dt>
    <dd>
        <p>Jika Anda berada pada pengaturan DigitalOcean Droplet ketika versi Ghost masih v0.3.2, atau Anda menggunakan nginx pada beberapa platform, Anda akan kesulitan mengunggah foto.</p>
        <p>Apa yang sebenarnya terjadi adalah Anda tidak dapat mengunggah foto yang berukuran lebih besar dari 1MB (cobalah mengunggah foto yang berukuran kecil, pasti bisa). Batas 1MB terlalu kecil!</p>
        <p>Untuk meningkatkan batas maksimal pengunggahan, Anda harus mengubah konfigurasi nginx Anda. Cobalah atur ulang batas maksimalnya menjadi lebih besar dari 1MB.</p>
        <ul>
            <li>Masuklah ke server Anda, lalu ketik <code>sudo nano /etc/nginx/conf.d/default.conf</code> untuk membuka berkas konfigurasi Anda.</li>
            <li>Setelah baris <code>server_name</code>, tambahkan kode berikut: <code>client_max_body_size 10M;</code></li>
            <li>Akhirnya, tekan <kbd>ctrl</kbd> + <kbd>x</kbd> untuk keluar. Nano akan menanyakan apakah Anda ingin menyimpan perubahan yang Anda buat, ketik <kbd>y</kbd> untuk Ya, dan tekan <kbd>enter</kbd> untuk menyimpan berkas.</li>
        </ul>
    </dd>
</dl>

