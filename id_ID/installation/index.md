---
lang: id_ID
layout: installation
meta_title: Bagaimana Cara Menginstall Ghost di Server Anda - Ghost Docs
meta_description: Semua yang Anda butuhkan untuk menginstal platform blogging Ghost dan menjalankannya pada server lokal atau remote.
heading: Menginstal &amp; Mulai Menjalankan Ghost
subheading: Langkah pertama untuk mengatur blog Anda untuk pertamakalinya.
chapter: installation
next_section: mac
---

## Overview <a id="overview"></a>

Dokumentasi Ghost merupakan karya yang masih dalam tahap pengerjaan, ia dimutakhirkan dan dikembangkan secara rutin. Jika Anda menghadapi masalah atau memiliki saran untuk pengembangannya, beritahu kami.

Ghost dibangun dengan [Node.js](http://nodejs.org), dan mensyaratkan versi `0.10.*` (versi stabil termutakhir).

Menjalankan Ghost secara lokal pada komputer Anda itu mudah saja, namun mensyaratkan Anda menginstal Node.js terlebih dahulu.

### Apakah Node.js itu?

[Node.js](http://nodejs.org) adalah platform modern untuk membangun aplikasi web secara cepat, mudah dikembangkan, dan efisien.
    Dalam 20 tahun terakhir, web telah berevolusi dari sekumpulan laman statik menjadi suatu platform yang mampu mendukung aplikasi web kompleks seperti Gmail dan facebook.
    JavaScript adalah bahasa pemrograman yang memampukan perkembangan ini.

[Node.js](http://nodejs.org) memampukan kita menuliskan JavaScript pada server. Dahulu, JavaScript hanya ada pada peramban, dan bahasa pemrograman kedua, semisal PHP, dibutuhkan untuk melakukan pemrograman pihak server. Memiliki sebuah aplikasi web yang terdiri dari bahasa pemrograman tunggal memberikan keuntungan yang besar, dan ini juga membuat Node.js dapat diakses oleh para pengembang yang selama ini bertahan pada pihak client.

Cara [Node.js](http://nodejs.org) menjadikan ini mungkin ialah dengan membungkus JavaScript engine dari peramban Chrome Google dan membuatnya bisa diinstal dimana saja. Ini berarti Anda bisa menginstal Ghist di komputer Anda untuk mencobanya dengan cepat dan mudah.
    Sesi berikut menyajikan rincian mengenai bagaimana menginstal Ghost pada server lokal dengan sistem operasi [Mac]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/mac/),  [Windows]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/windows/) atau [Linux]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/linux/) serta membantu Anda memasang Ghost pada sebuah akun [server atau hosting]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/deploy).

### Mulai Menjalankan

Jika Anda tidak tertarik untuk mengikuti instruksi instalasi Node.js dan Ghost secara manual, para pengembang di [BitNami](http://bitnami.com/) telah membuat [Ghost installers](http://bitnami.com/stack/ghost) untuk semua platform terpopuler.

Saya ingin menginstal Ghost pada:

<div class="text-center install-ghost">
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/mac/" class="btn btn-success btn-large">Mac</a>
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/windows/" class="btn btn-success btn-large">Windows</a>
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/linux/" class="btn btn-success btn-large">Linux</a>
</div>

Jika Anda telah memutuskan untuk memasang Ghost pada akun hosting atau server Anda, itu kabar baik! Dokumentasi berikut akan mengantarkan Anda pada berbagai opsi untuk memasang Ghost, dari langkah-langkah manual hingga installer satu-klik.

<div class="text-center install-ghost">
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/deploy/" class="btn btn-success btn-large">Jalankan Ghost</a>
</div>

Ingatlah bahwa Ghost masih baru, dan tim kami selalu bekerja keras untuk menyajikan fitur-fitur baru sesegera mungkin. Jika Anda perlu memutakhirkan Ghost ke versi terbaru, ikuti [dokumentasi pemutakhiran](/installation/upgrading/).
    Jika Anda menghadapi masalah, lihat [panduan solusi permasalahan]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/troubleshooting/),atau jika itu tidak membantu, silakan kunjungi [forum Ghost](http://ghost.org/forum) dimana staf dan komunitas Ghost siap membantu Anda dengan permasalahan apapun.

