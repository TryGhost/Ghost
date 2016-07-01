---
lang: id_ID
layout: usage
meta_title: Bagaimana Cara Menggunakan Ghost - Ghost Docs
meta_description: Sebuah petunjuk mendalam untuk menggunakan platform blogging Ghost. Anda sudah memiliki Ghost tetapi belum yakin bagaimana cara menggunakannya? Mulailah dari sini!
heading: Menggunakan Ghost
subheading: Temukan caranya dan atur caranya semau Anda
chapter: usage
section: writing
permalink: /id_ID/usage/writing/
prev_section: managing
next_section: faq
---

##  Menulis Artikel <a id="writing"></a>

Artikel-artikel blog pada Ghost ditulis menggunakan Markdown. Markdown merupakan sintaksis minimal untuk menandai dokumen dengan format menggunakan tanda baca dan karakter-karakter khusus. Sintaksisnya ditujukan untuk mencegah intrupsi pada aliran penulisan, karenanya memungkinkan Anda untuk lebih fokus pada isi daripada tampilannya.

###  Petunjuk Markdown <a id="markdown"></a>

[Markdown](http://daringfireball.net/projects/markdown/) adalah sebuah bahasa markah (*markup language*) yang dirancang untuk meningkatkan efisiensi dalam menulis, dengan cara membuatnya semudah mungkin untuk dibaca.

Ghost menggunakan semua jalan pintas (*shortcut*) baku dari Markdown ditambah dengan beberapa tambahan dari kami. Daftar lengkap dari jalan pintas tersebut terdaftar sebagai berikut.

####  Header

Header dapat diatur menggunakan tanda hash sebelum teks judul. Jumlah dari tanda hash sebelum teks judul akan menentukan kedalaman dari header. Kedalam dari header sendiri terdiri dari 1-6.

*   H1 : `# Header 1`
*   H2 : `## Header 2`
*   H3 : `### Header 3`
*   H4 : `#### Header 4`
*   H5 : `##### Header 5`
*   H6 : `###### Header 6`

####  Text Styling

*   Tautan : `[Judul](URL)`
*   Tebal : `**Tebal**`
*   Miring : `*Miring*`
*   Paragraf : dipisahkan spasi baris di antara paragraf
*   Daftar : `* Sebuat tanda bintang di setiap item daftar`
*   Kutipan : `> Kutipan`
*   Kode : `` `kode` ``
*   Garis Pemisah : `==========`

####  Gambar

Untuk menyisipkan gambar ke dalam artikel, yang harus Anda lakukan adalah menuliskan `![]()` ke dalam panel pengubah Markdown. Dengan demikian sebuah kotak pengunggah gambar akan dibuat di dalam panel pratampil Anda.

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/Screen%20Shot%202013-10-14%20at%2012.45.08.png)

Selanjutnya Anda dapat menyeret dan meletakkan sembarang gambar (.png, .gif, .jpg) dari Desktop Anda di atas kotak pengunggah gambar untuk menyertakannya di dalam artikel, atau sebagai alternatif, Anda dapat mengklik kotak pengunggah gambar untuk menggunakan standar jendela pengunggah gambar.

Jika Anda memutuskan untuk menyertakan sebuah url dari gambar, klik ikon 'tautan' yang terletak di kiri bawah kotak pengunggah gambar, hal tersebut akan meizinkan Anda menyisipkan URL dari gambar.

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/Screen%20Shot%202013-10-14%20at%2012.34.21.png)

Untuk menambahkan judul pada gambar Anda, yang Anda butuhkan hanyalah menempatkan teks judul di antara kurung siku, sebagai contoh; `![Ini merupakan judul gambar]()`. 

##### Menghapus gambar

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/Screen%20Shot%202013-10-14%20at%2012.56.44.png)

Untuk menghapus sebuah gambar, klik ikon 'hapus', yang terletak di bagian sudut kanan atas pada gambar yang telah disisipkan. Hal ini akan menyebabkannya berubah kembali menjadi kotak pengunggah gambar yang dapat Anda gunakan untuk menyisipkan ulang sebuah gambar baru.