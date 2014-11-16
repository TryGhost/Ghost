---
lang: id
layout: installation
meta_title: Cara Menginstall Ghost di Server Anda - Ghost Docs
meta_description: Semua yang Anda butuhkan untuk menjalankan platform blogging Ghost di lingkungan lokal dan remote.
heading: Menginstall Ghost &amp; Memulai
subheading: Langkah awal untuk mengatur blog baru Anda untuk pertamakalinya.
chapter: installasi
next_section: mac
---

## Ikhtisar <a id="overview"></a>

<p class="note"><strong>Catatan</strong> Ghost membutuhkan Node.js <strong>0.10.x</strong> (versi stabil terakhir). Kami merekomendasikan Node.js <strong>0.10.30</strong> & npm <strong>1.4.21</strong>.</p>

Dokumentasi dari Ghost masih dalam tahap pengembangan dan selalu diperbaharui dan diperbaiki secara berkala. Jika Anda mengalami permasalahan atau mempunyai saran untuk perbaikan, beritahu kami.

Ghost dibangun di atas [Node.js](http://nodejs.org), dan membutuhkan versi `0.10.*` (versi stabil terakhir).

Menjalankan Ghost secara lokal pada komputer Anda adalah hal yang mudah, tetapi membutuhkan Anda untuk menginstall Node.js terlebih dahulu.

### Apa itu Node.js?

[Node.js](http://nodejs.org) adalah sebuah platform modern untuk membuat aplikasi web yang cepat, <em>scalable</em>, dan efisien.
    Dalam 20 tahun ke belakang, web telah berevolusi dari koleksi halaman statis menjadi sebuah platform yang mampu untuk mendukung berbagai aplikasi web yang kompleks seperti Gmail dan facebook.
    JavaScript adalah bahasa pemrograman yang telah memungkinkan perkembangan.

[Node.js](http://nodejs.org) memberikan kita kemampuan untuk menulis JavaScript pada server. Di masa lalu JavaScript hanya ada pada browser, dan bahasa pemrograman kedua, seperti PHP, dibutuhkan untuk melakukan pemrograman pada sisi server. Mempunyai sebuah aplikasi web yang terdiri dari satu bahasa pemrograman adalah sebuah keuntungan yang besar dan hal ini membuat Node.js menarik para developer yang secara tradisional akan tetap tinggal pada sisi klien.

Cara [Node.js](http://nodejs.org) membuat hal ini mungkin adalah dengan membungkus JavaScript engine dari browser Google Chrome dan membuatnya dapat di-install di mana saja. Ini berarti Anda dapat menginstall Ghost di komputer Anda untuk mencobanya dengan sangat mudah dan cepat.
    Bagian berikut menjelaskan cara menginstall Ghost secara lokal pada [Mac]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/mac/),  [Windows]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/windows/) atau [Linux]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/linux/) atau secara alternatif akan membantu Anda menggunakan Ghost pada akun [server or hosting]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/deploy).

### Memulai

Jika Anda tidak suka mengikuti instruksi untuk menginstall Node.js dan Ghost secara manual, orang-orang di [BitNami](http://bitnami.com/) telah membuat [Ghost installers](http://bitnami.com/stack/ghost) untuk semua platform besar.

Saya ingin menginstall Ghost pada:

<div class="text-center install-ghost">
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/mac/" class="btn btn-success btn-large">Mac</a>
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/windows/" class="btn btn-success btn-large">Windows</a>
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/linux/" class="btn btn-success btn-large">Linux</a>
</div>

Kabar baik jika Anda telah menentukan untuk menggunakan Ghost pada server atau akun hosting Anda. Dokumentasi berikut akan menuntun Anda melalui beberapa opsi untuk menggunakan Ghost, mulai dari pengaturan manual sampai instalasi sekali klik.

<div class="text-center install-ghost">
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/deploy/" class="btn btn-success btn-large">Mengudarakan Ghost</a>
</div>

Ingatlah bahwa Ghost masih baru, dan tim kami sedang bekerja keras untuk mengantarkan berbagai fitur dalam waktu singkat. Jika anda perlu untuk memperbahario Ghost ke versi terbaru, ikuti [upgrading documentation](/installation/upgrading/) kami.
    Jika Anda mengalami masalah, lihatlah [troubleshooting guide]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/troubleshooting/), atau jika halaman tersebut tidak membantu, Anda dapat menghubungi kami via [Ghost forum](http://ghost.org/forum) dimana staff Ghost dan komunitas kami selalu siap membantu permasalahan Anda.

