lang: id_ID
layout: usage
meta_title: Bagaimana Cara Menggunakan Ghost - Ghost Docs
meta_description: Sebuah petunjuk mendalam untuk menggunakan platform blogging Ghost. Anda sudah memiliki Ghost tetapi belum yakin bagaimana cara menggunakannya? Mulailah dari sini!
heading: Menggunakan Ghost
subheading: Temukan caranya dan bersiap atur caranya semau Anda
chapter: usage
section: settings
permalink: /id_ID/usage/settings/
prev_section: configuration
next_section: managing
---

##  Pengaturan Ghost <a id="settings"></a>

Pergi ke <code class="path">&lt;URL Anda&gt;/ghost/settings/</code>.

Setelah Anda selesai menyesuaikan pengaturan, *jangan* lupa menekan tombol "Save" untuk menyimpan perubahan yang Anda lakukan.

Anda dapat melihat perubahannya dengan mengunjungi URL blog Anda.

### Pengaturan Blog (<code class="path">/general/</code>)

Berikut adalah cara pengaturan Blog secara spesifik.

*   **Blog Title**: Ubah judul Blog Anda. Rujukan tema `@blog.title`.
*   **Blog Description**: Ubah deskripsi Blog Anda. Rujukan tema `@blog.description`.
*   **Blog Logo**: Unggah sebuah logo untuk blog Anda, dapat berupa ekstensi '.png', '.jpg' maupun '.gif'. Rujukan Tema `@blog.logo`.
*   **Blog Cover**: Unggah gambar penutup blog Anda, ekstensi dapat berupa '.png', '.jpg' ataupun '.gif'. Rujukan tema  `@blog.cover`.
*   **Email Address**: Email ini merupakan alamat email yang digunakan admin untuk dikirimi pesan notifikasi. *Harus* alamat email yang valid.
*   **Posts per page**: Bagian ini mengatur seberapa banyak artikel yang akan ditampilkan di setiap halaman. Isikan nilai numerik.
*   **Theme**: Bagian ini akan mendaftar semua tema di dalam direktori <code class="path">content/themes</code> Anda. Dengan memilih salah satu pilihan dari dropdown akan mengubah tampilan blog Anda.

### Pengaturan Pengguna (<code class="path">/user/</code>)

Berikut merupakan pengaturan yang mengontrol profil dari pengguna / penulis Anda.

*   **Your Name**: Nama Anda yang akan digunakan sebagai kredit ketika Anda mempublikasikan sebuah artikel. Rujukan tema (post) `author.name`.
*   **Cover Image**: Gambar latar belakang profil Anda diunggah di sini, baik itu berekstensi '.png', '.jpg' ataupun '.gif'. Rujukan tema (post) `author.cover`.
*   **Display Picture**: Bagian ini merupakan tempat untuk mengunggah foto pribadi sebagi foto display, dapat berupa '.png', '.jpg' atau format '.gif'. Rujukan tema (post) `author.image`.
*   **Email Address**: Alamat email ini akan tersedia sebagai alamat email publik Anda dan juga sebagai alamat Anda menerima notifikasi. Rujukan tema (post) `author.email`.
*   **Location**: Lokasi di mana Anda berada saat ini. Rujukan tema (post) `author.location`.
*   **Website**: Bagian URL website pribadi Anda atau bahkan salah satu URL jejaring sosial Anda. Rujukan tema (post) `author.website`.
*   **Bio**: Biografi Anda yang dapat Anda isi hingga 200 karakter yang mendeskripsikan siapa Anda. Rujukan tema (post) `author.bio`.

#### Mengubah Kata Sandi

1.  Isikan kotak input dengan kata sandi yang sesuai (kata sandi saat ini / yang terbaru).
2.  Selanjutnya klik **Change Password**.
<p class="note">
    <strong>Catatan:</strong> Agar kata sandi Anda sukses diubah Anda harus mengklik tombol "Change Password", tombol "Save" tidak akan mengubah kata sandi Anda secara otomatis.
</p>

