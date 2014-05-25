---
lang: id_ID
layout: usage
meta_title: Bagaimana Cara Menggunakan Ghost - Ghost Docs
meta_description: Sebuah petunjuk mendalam untuk menggunakan platform blogging Ghost. Anda sudah memiliki Ghost tetapi belum yakin bagaimana cara menggunakannya? Mulailah dari sini!
heading: Menggunakan Ghost
subheading: Temukan caranya dan bersiap atur caranya semau Anda
chapter: usage
section: configuration
permalink: /id_ID/usage/configuration/
prev_section: usage
next_section: settings
---

## Konfigurasi Ghost <a id="configuration"></a>

Setelah Anda menjalankan Ghost untuk pertama kalinya, Anda akan menemukan sebuah berkas bernama `config.js` di dalam direktori root dari Ghost, bersama dengan berkas `index.js`. Berkas tersebut mengizinkan Anda untuk mengatur tingkat lingkungan konfigurasi untuk beberapa keperluan seperti URL, basis data, dan pengaturan surat.

Sebaliknya, jika Anda belum menjalankan Ghost untuk pertama kalinya, Anda tidak akan memiliki berkas-berkas tersebut. Oleh karena itu, Anda dapat membuatnya dengan menyalin berkas `config.example.js` - Itulah yang dilakukan Ghost ketika pertama kali dimulai.

Untuk mengkonfigurasi pengaturan URL Ghost, surat atau basis data, bukalah berkas `config.js` pada aplikasi pengubah teks favorit Anda. Lalu mulailah ubah pengaturan untuk lingkungan yang Anda inginkan. Apabila lingkungan masih asing untuk Anda, cobalah baca [dokumentasi](#environments) berikut.

## Pilihan Konfigurasi

Ghost memiliki beberapa pilihan konfigurasi yang dapat Anda tambahkan untuk mengubah beberapa hal mengenai bagaimana seharusnya Ghost bekerja.

### Email

Mungkin bagian terpenting dalam konfigurasi adalah mengatur email Anda agar Ghost dapat mengizinkan Anda menata ulang kata sandi jika Anda lupa. Silahkan baca [dokumentasi email]({% if page.lang %}/{{ page.lang }}{% endif %}/mail) untuk informasi lebih lanjut.

### Basis Data

Secara baku, Ghost terkonfigurasi untuk menggunakan basis data SQLite, yang tidak membutuhkan konfigurasi lebih lanjut pada bagian Anda.

Walaupun demikian, jika Anda ingin menggunakan basis data MySQL, Anda dapat melakukannya dengan mengubah konfigurasi basis data. Pertama-tama, Anda harus membuat sebuah basis data dan pengguna. Anda dapat mengubah konfigurasi SQLite yang sudah ada menjadi seperti di bawah ini:

```
database: {
  client: 'mysql',
  connection: {
    host     : '127.0.0.1',
    user     : 'pengguna_basis_data_anda',
    password : 'kata_sandi_basis_data_anda',
    database : 'ghost_db',
    charset  : 'utf8'
  }
}
```

Anda juga dapat membatasi jumlah koneksi simultan yang Anda inginkan dengan menggunakan pengaturan `pool`.

```
database: {
  client: ...,
  connection: { ... },
  pool: {
    min: 2,
    max: 20
  }
}
```

### Server

Host server dan port merupakan sebuah alamat IP dan nomor port yang harus Anda dengarkan selama permintaan (*listen on requests*).

Dalam hal ini dimungkinkan juga untuk mengkonfigurasi Ghost untuk mendengarkan soket Unix dengan mengubah konfigurasi server sebagai berikut:

```
server: {
    socket: 'path/to/socket.sock'
}
```

### Pengecekan Pemutakhiran

Pada Ghost versi 0.4 telah diperkenalkan sebuah layanan pengecekan pemutakhiran otomatis untuk memberitahukan kepada Anda jika telah tersedia Ghost versi terbaru (yoo!). Ghost.org mengumpulkan statistik dasar penggunaan Ghost secara anonim dari permintaan pengecekan pemutakhiran. Untuk informasi lebih lanjut, silahkan lihat berkas [update-check.js](https://github.com/TryGhost/Ghost/blob/master/core/server/update-check.js) dalam kode inti Ghost.

Namun demikian Anda tetap dimungkinkan untuk menonaktifkan fitur pengecekan pemutakhiran dan pengumpulan data secara anonim dengan mengatur pilihan berikut:

`updateCheck: false`

Pastikan untuk menika bawah (*subscribe*) email dari Ghost, atau ikuti [blog Ghost](http://blog.ghost.org), agar Anda tetap mendapat informasi mengenai versi termutakhir. Informasi lebih lanjut tentang

### Penyimpanan Berkas

Beberapa platform seperti Heroku, tidak memiliki sistem berkas yang persisten. Sebagai akibat dari hal tersebut, sembaran gambar yang diunggah cenderung menghilang pada beberapa titik tertentu.
Dimungkinkan untuk menonaktifkan fitur penyimpanan berkas pada Ghost dengan cara:

`fileStorage: false`

Ketika penyimpanan berkas dinonaktifkan, peralatan pengunggah gambar pada Ghost akan meminta Anda untuk memasukkan URL secara baku, hal ini akan mencegah menghilangnya berkas ketika mengunggah.


## Mengenai Lingkungan <a id="environments"></a>

Node.js, dan karenanya Ghost, memiliki konsep lingkungan terbangun. Lingkungna tersebut memudahkan Anda untuk membuat konfigurasi yang berbeda untuk mode yang berbeda ketika Anda menjalankan Ghost. Secara standar, Ghost mempunyai dua tipe lingkungan terbangun: **pengembangan** dan **produksi**.

Terdapat sedikit perbedaan yang menonjol di antara dua mode lingkungan tersebut. Secara esensi, mode **pengembangan** dikhususkan untuk pengembangan dan secara spesifik mengawakutu Ghost. Sedangkan "produksi" ditujukan untuk digunakan ketika Anda menjalankan Ghost secara publik. Termasuk dalam perbedaan juga tentang bagaimana pesan galat dan log dikeluarkan, serta seberapa banyak aset-aset statis yang digabungkan dan diminifikasi. Dalam mode **produksi**, Anda hanya akan menjumpai satu berkas JavaScript saja yang didalamnya terdapat semua kode untuk admin, sedangkan dalam mode **pengembangan**, Anda akan mendapatkan lebih dari satu berkas.

Seiring berkembangnya Ghost, perbedaan-perbedaan tersebut akan tumbuh dan semakin terlihat, dan karenanya sangatlah penting untuk diperhatikan bahwa setiap blog untuk berjalan di lingkungan **produksi. Hal ini mungkin akan memunculkan pertanyaan, mengapa mode **pengembangan** dijadikan standar apabila kebanyakan orang di kemudian hari ingin menjalankannya dalam mode **produksi**? Ghost membuat mode **pengembangan** secara baku karena lingkungan tersebut merupakan lingkungan terbaik untuk mengawakutu masalah pada Ghost, yang cenderung akan Anda butuhkan ketika menjalankannya untuk pertama kali.

##  Menggunakan Lingkungan <a id="using-env"></a>

Untuk mempersiapkan Ghost agar berjalan di bawah lingkungan yang berbeda, Anda harus menggunakan sebuah variabel lingkungan. Sebagai contoh, jika secara normal Anda memulai Ghost dengan `node index.js`, Anda akan menggunakan:

`NODE_ENV=production node index.js`

Atau jika secara normal Anda menggunakannya untuk selamanya atau waktu yang lama, gunakan:

`NODE_ENV=production forever start index.js`

Atau jika Anda terbiasa menggunakan `npm start` Anda dapat menggunakan perintah yang lebih mudah untuk diingat, yaitu::

`npm start --production`

### Kenapa menggunakan `npm install --production`?

Kami telah sering mendapatkan pertanyaan seperti ini, jika Ghost secara baku dimulai dalam mode pengembangan, apakah dokumentasi instalasi menyarankan untuk menjalankan `npm install --production`? Ini merupakan sebuah pertanyaan yang bagus! Jika Anda tidak menyertakan `--production` ketika menginstal Ghost, tidak akan ada hal buruk yang terjadi. Namun hal tersebut akan mengakibatkan terinstalnya banyak sekali paket ekstra yang sebenarnya hanya akan berguna bagi para pengembang Ghost. Selain itu, juga akan mengakibatkan Anda harus memiliki satu paket khusus lagi, yaitu `grunt-cli` yang terinstal secara global, di mana harus dilakukan dengan cara `npm install -g grunt-cli`. Hal ini tentu saja merupakan usaha berlebih yang sebetulnya tidak dibutuhkan jika Anda hanya ingin menjalankan Ghost sebagai sebuah blog saja.