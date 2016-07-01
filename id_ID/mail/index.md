---
lang: id_ID
layout: mail
meta_title: Konfigurasi Surat pada Ghost - Ghost Docs
meta_description: Bagaimana mengonfigurasi server surat elektronik (email) Anda dan mengirim email dengan platform blogging Ghost. Semua yang perlu Anda ketahui.
heading: Mengatur Email
chapter: mail
---


## Konfigurasi Surat Elektronik (Email) <a id="email-config"></a>

Dokumentasi berikut merinci bagaimana mengkonfigurasi email pada Ghost. Ghost menggunakan [Nodemailer](https://github.com/andris9/Nodemailer), dokumentasi mereka bahkan berisi lebih banyak contoh. 

### Tunggu dulu, Apa?

Jika Anda sudah familiar dengan PHP, kemungkinan Anda sudah terbiasa dengan kenyataan bahwa email secara ajaib telah berfungsi di platform hosting Anda. Dalam hal ini, Node sedikit berbeda. Meskipun sangat berkilau, Node masih terbilang baru dan masih banyak yang harus disempurnakan.

Namun, jangan takut, mengatur email Anda agar siap berfungsi merupakan sebuah hal mudah dan kami di sini untuk menuntun Anda melakukannya.

### Tapi Mengapa?

Saat ini, Ghost hanya menggunakan email untuk kepentingan mengirimi Anda kata sandi baru jika Anda lupa. Tidak banyak memang, tapi jangan pernah meremehkan bagaimana bergunanya fitur tersebut ketika Anda benar-benar membutuhkannya.

Di masa yang akan datang, Ghost juga akan mendukung pengaturan berlangganan artikel blog Anda yang berbasis email. Mengirimkan email terkait akun para pengguna baru dan fitur-fitur berguna lainnya yang terkait dengan kemampuan untuk kirim-mengirim email akan juga disediakan.

## Ok, jadi bagaimana Saya melakukannya? <a id="how-to"></a>

Hal pertama yang akan Anda butuhkan adalah sebuah akun dengan layanan pengiriman email. Kami sangat menyarankan untuk menggunakan Mailgun. Mereka mempunyai free akun pemula yang tidak hanya memungkinkan Anda untuk mengirim lebih banyak email dari yang lainnya tetapi juga dapat mengatur blog email berbasis langganan paling produktif. Anda juga dapat menggunakan Gmail atau Amazon SES.

Setelah Anda memutuskan layanan email mana yang baik untuk digunakan, Anda juga harus menambahkan pengaturan pada berkas konfigurasi Ghost. Dimanapun Anda menginstal Ghost, Anda dapat menemukan sebuah berkas <code class="path">config.js</code> di dalam direktori root Ghost Anda berdampingan dengan berkas <code class="path">index.js</code>. Jika Anda belum memiliki berkas <code class="path">config.js</code>, salinlah berkas <code class="path">config.example.js</code> dan ubah nama berkasnya.

### Mailgun <a id="mailgun"></a>

Kunjungilah [mailgun.com](http://www.mailgun.com/) dan buatlah akun baru di sana. Anda akan membutuhkan sebuah alamat email selain Mailgun, dan Mailgun akan meminta Anda untuk menyediakan nama domain atau subdomain. Anda dapat mengubahnya lain waktu jika Anda tidak puas. Untuk sementara, registrasikanlah sebuah subdomain yang bernama sama dengan nama blog Anda.

Untuk mengakses panel kontrol Mailgun, Anda harus terlebih dahulu memverifikasi alamat email Anda. Anda akan menemukan username dan kata sandi layanan email yang telah mereka buat untuk Anda (bukan akun yang Anda buat ketika mendaftar), dengan mengklik domain Anda pada bagian kanan... lihatlah *screencast* berikut untuk membantu Anda menemukan rinciannya.

<img src="https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/mailgun.gif" alt="Mailgun details" width="100%" />   
  
Baiklah, Anda telah memiliki semua yang diperlukan, sekarang saatnya untuk membuka berkas konfigurasi Anda. Buka berkas <code class="path">config.js</code> pada aplikasi editor yang Anda sukai. Arahkan kepada lingkungan pengaturan email yang Anda inginkan, lalu ubahlah pengaturan email Anda sehingga terlihat seperti ini:

```
mail: {
transport: 'SMTP',
    options: {
        service: 'Mailgun',
        auth: {
            user: '',
            pass: ''
        }
    }
}
```

Letakkan 'Login' yang Anda dapatkan dari mailgun di antara tanda petik sebelah 'user' dan 'Password' Anda dari mailgun di dalam tanda petik sebelah 'pass'. Sebagai contoh, jika Saya mengkonfigurasi mailgun untuk akun 'tryghosttest', hasilnya akan terlihat seperti ini:

```
mail: {
    transport: 'SMTP',
    options: {
        service: 'Mailgun',
        auth: {
            user: 'postmaster@tryghosttest.mailgun.org',
            pass: '25ip4bzyjwo1'
        }
    }
}
```

Perhatikan semua titik dua, tanda petik, dan kurung kurawal. Salah meletakkan salah satu dari mereka, maka Anda akan mendapati galat yang aneh.

Anda dapat menggunakan ulang pengaturan Anda untuk lingkungan pengembangan dan produksi jika Anda menjalankan Ghost pada mode keduanya.

### Amazon SES <a id="ses"></a>

Anda dapat mendaftarkan sebuah akun ke Amazon Simple Email Service di <http://aws.amazon.com/ses/>. Setelah Anda selesai mendaftar, Anda akan mendapatkan kunci akses dan kunci rahasia (AWSAccessKeyID dan AWSSecretKey).

Bukalah berkas <code class="path">config.js</code> dari Ghost pada pengubah teks kesayangan Anda. Arahkan pada lingkungan yang Anda inginkan untuk mengatur email Anda, kemudian tambahkan kunci akses dan kunci rahasia dari Amazon ke pengaturan email Anda seperti di bawah ini:

```
mail: {
    transport: 'SES',
    options: {
        AWSAccessKeyID: "AWSACCESSKEY",
        AWSSecretKey: "/AWS/SECRET"
    }
}
```

### Gmail <a id="gmail"></a>

Ghost memungkinkan penggunaan Gmail untuk mengirim email. Jika Anda ingin melakukannya, kami menyarankan Anda untuk [membuat akun baru](https://accounts.google.com/SignUp) untuk tujuan tersebut daripada menggunakan akun email pribadi yang sudah Anda miliki.

Setelah Anda membuat akun baru, Anda dapat mengkonfigurasi pengaturannya pada berkas <code class="path">config.js</code>. Buka berkas tersebut pada pengubah teks pilihan Anda. Loncatlah ke baris kode dari lingkungan email yang ingin Anda atur, kemudian lakukan perubahan seperti berikut:

```
mail: {
    transport: 'SMTP',
    options: {
        auth: {
            user: 'emailanda@gmail.com',
            pass: 'katasandi'
        }
    }
}
```

### Dari Alamat <a id="from"></a>

Secara baku, perujuk 'dari' alamat email yang dikirim Ghost akan diatur ke alamat email yang terdapat pada halaman pengaturan umum. Apabila Anda ingin mengubahnya menjadi alamat email yang berbeda, Anda dapat mengkonfigurasinya di dalam berkas <code class="path">config.js</code>.

```
mail: {
    fromaddress: 'emailsaya@alamat.com',
}
```
