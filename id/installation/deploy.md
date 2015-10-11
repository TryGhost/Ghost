---
lang: id
layout: installation
meta_title: Cara Menginstall Ghost di Server Anda - Ghost Docs
meta_description: Semua yang Anda butuhkan untuk menjalankan platform blogging Ghost di lingkungan lokal dan remote.
heading: Menginstall Ghost &amp; Memulai
subheading: Langkah awal untuk mengatur blog baru Anda untuk pertamakalinya.
permalink: /id/installation/deploy/
chapter: instalasi
section: deploy
prev_section: linux
next_section: mengupgrade
---
## Menjalankan Ghost secara Live <a id="deploy"></a>

Jadi Anda siap untuk menjalankan Ghost secara live? Excellent!

Keputusan pertama yang harus Anda buat, adalah apakah Anda ingin menginstall dan mengkonfigurasi Ghost secara manual, atau dengan bantuan installer.

### Installer

Ada beberapa opsi installer mudah untuk saat ini:

*   Luncurkan ke cloud dengan [Bitnami](http://wiki.bitnami.com/Applications/BitNami_Ghost).
*   Luncurkan Ghost dengan [Rackspace deployments](http://developer.rackspace.com/blog/launch-ghost-with-rackspace-deployments.html).
*   Jalankan Ghost secara cepat dengan sebuah [DigitalOcean Droplet](https://www.digitalocean.com/community/articles/how-to-use-the-digitalocean-ghost-application).

### Konfigurasi Manual

Anda membutuhkan paket hosting yang telah memiliki, atau mengijinkan Anda untuk menginstall [Node.js](http://nodejs.org).
    Ini berarti sesuatu yang mirip dengan cloud ([Amazon EC2](http://aws.amazon.com/ec2/), [DigitalOcean](http://www.digitalocean.com), [Rackspace Cloud](http://www.rackspace.com/cloud/)), VPS ([Webfaction](https://www.webfaction.com/), [Dreamhost](http://www.dreamhost.com/servers/vps/)) atau paket yang memiliki akses SSH (terminal) & mengijikan Anda untuk menginstall Node.js. Ada banyak opsi dan beberapa bisa berharga sangat murah.

Yang tidak bisa bekerja saat ini, adalah shared hosting gaya cPanel karena biasanya ia ditargetkan secara spesifik untuk hosting PHP. Meskipun beberapa menawarkan Ruby, dan mungkin menawarkan Node.js di kemudian hari karena kemiripannya.

<p>Sayangnya, banyak cloud hosting yang spesifik untuk Node seperti **Nodejitsu** & **Heroku** **TIDAK** kompatibel dengan Ghost. Awalnya mereka akan bekerja, tetapi mereka akan menghapus berkas Anda yang berarti semua gambar unggahan dan database Anda akan hilang. Heroku mempunyai support terhadap MySQL jadi Anda bisa menggunakannya, tetapi Anda tetap akan kehilangan semua gambar yang diunggah.

Link berikut ini memuat instruksi cara menjalankan Ghost dengan:

*   [Dreamhost](http://www.howtoinstallghost.com/how-to-install-ghost-on-dreamhost/) - dari [howtoinstallghost.com](http://howtoinstallghost.com)
*   [DigitalOcean](http://ghosted.co/install-ghost-digitalocean/) - dari [Corbett Barr](http://ghosted.co)
*   [Webfaction](http://www.howtoinstallghost.com/how-to-install-ghost-on-webfaction-hosting/) - dari [howtoinstallghost.com](http://howtoinstallghost.com)
*   [Rackspace](http://ghost.pellegrom.me/installing-ghost-on-ubuntu/) (Ubuntu 13.04 + linux service) - dari [Gilbert Pellegrom](http://ghost.pellegrom.me/)
*   [Ubuntu + nginx + forever](http://0v.org/installing-ghost-on-ubuntu-nginx-and-mysql/) - dari [Gregg Housh](http://0v.org/)
*   ...cek [installation forum](https://en.ghost.org/forum/installation) untuk panduan lainnya ...

## Membuat Ghost berjalan selamanya

Metode yang dijelaskan sebelumnya untuk menjalankan Ghost adalah `npm start`. Ini adalah cara yang baik untuk melakukan developmen dan tes lokal, tetapi jika Anda menjalankan Ghost dengan command line ia akan berhenti ketika jendela terminal ditutup atau anda keluar dari SSH. Untuk mencegah Ghost berhenti Anda harus menjalankan Ghost sebagai sebuah service. Ada dua cara untuk melakukan hal ini.

### Forever ([https://npmjs.org/package/forever](https://npmjs.org/package/forever)) <a id="forever"></a>

Ada dapat menggunakan `forever` untuk menjalankan Ghost sebagai background task. `forever` juga akan menjaga instalasi Ghost anda dan akan me-restart proses node jika terjadi crash.

*   Untuk menginstall `forever` ketik `npm install forever -g`
*   Untuk menjalankan Ghost menggunakan `forever` dari direktori instalasi Ghost ketik `NODE_ENV=production forever start index.js`
*   Untuk menghentikan Ghost ketik `forever stop index.js`
*   Untuk mengecek apakah Ghost sedang berjalan ketik `forever list`

### Supervisor ([http://supervisord.org/](http://supervisord.org/)) <a id="supervisor"></a>

Distribusi Linux Populer&mdash;seperti Fedora, Debian, dan Ubuntu&mdash;me-maintain paket untuk Supervisor: Sebuah sistem kontrol proses yang membuat anda dapat menjalankan Ghost saat komputer baru dinyalakan tanpa skrip init. Tidak seperti skrip init, Supervisor portabel di berbagai distribusi dan versi Linux.

*   [Install Supervisor](http://supervisord.org/installing.html) seperti yang dibutuhkan distribusi Linux Anda. Biasanya, ini adalah:
    *   Debian/Ubuntu: `apt-get install supervisor`
    *   Fedora: `yum install supervisor`
    *   Kebanyakan distribusi lainnya: `easy_install supervisor`
*   Pastikan Supervisor telah berjalan, dengan menjalankan `service supervisor start`
*   Buat skrip startup untuk instalasi Ghost Anda. Biasanya ini akan terletak di `/etc/supervisor/conf.d/ghost.conf` Contohnya:

    ```
    [program:ghost]
    command = node /path/to/ghost/index.js
    directory = /path/to/ghost
    user = ghost
    autostart = true
    autorestart = true
    stdout_logfile = /var/log/supervisor/ghost.log
    stderr_logfile = /var/log/supervisor/ghost_err.log
    environment = NODE_ENV="production"
    ```

*   Jalankan Ghost dengan Supervisor: `supervisorctl start ghost`
*   Untuk menghentikan Ghost: `supervisorctl stop ghost`

Anda dapat melihat [documentation for Supervisor](http://supervisord.org) untuk informasi lebih lanjut.

### Skrip Init <a id="init-script"></a>

Sistem Linux menggunakan skrip init untuk dijalankan saat sistem boot. Skrip ini terletak di /etc/init.d. Untuk membuat Ghost jalan selamanya dan bahkan tetap hidup saat reboot Anda dapat membuat skrip init yang menjalankan hal ini. Contoh berikut ini akan bekerja pada Ubuntu dan telah diuji pada **Ubuntu 12.04**.

*   Buat berkas /etc/init.d/ghost dengan perintah berikut:

    ```
    $ sudo curl https://raw.githubusercontent.com/TryGhost/Ghost-Config/master/init.d/ghost \
      -o /etc/init.d/ghost
    ```

*   Buka berkas dengan `nano /etc/init.d/ghost` dan cek hal berikut:
*   Ubah variabel `GHOST_ROOT` ke tempat anda menginstall Ghost
*   Cek apakah variabel `DAEMON` memiliki output yang sama dengan `which node`
*   Skrip init berjalan dengan akun dan grup Ghost tersendiri di sistem Anda, mari kita buat dengan cara berikut:

    ```
    $ sudo useradd -r ghost -U
    ```

*   Pastikan juga akun Ghost dapat mengakses instalasi:

    ```
    $ sudo chown -R ghost:ghost /path/to/ghost
    ```

*   Ubah izin eksekusi untuk skrip init dengan mengetik

    ```
    $ sudo chmod 755 /etc/init.d/ghost
    ```

*   Sekarang Anda dapat mengontrol Ghost dengan perintah berikut:

    ```
    $ sudo service ghost start
    $ sudo service ghost stop
    $ sudo service ghost restart
    $ sudo service ghost status
    ```

*   Untuk menjalankan Ghost saat sistem baru dinyalakan skrip init yang baru dibuat harus diregistrasi untuk start up.
    Ketik perintah berikut pada command line:

    ```
    $ sudo update-rc.d ghost defaults
    $ sudo update-rc.d ghost enable
    ```

*   Pastikan akun anda dapat mengubah berkas, contohnya config.js di direktori Ghost, dengan menambahkannya ke grup ghost.:
    ```
    $ sudo adduser USERNAME ghost
    ```

*   Jika Anda merestart server Anda Ghost harusnya sudah berjalan untuk Anda.


## Mengkonfigurasi Ghost dengan domain name <a id="nginx-domain"></a>

Jika anda telah mengkonfigurasi Ghost untuk jalan selamanya Anda juga dapat mengkonfigurasi sebuah web server sebagai proxy untuk melayani blog Anda dengan domain Anda.
Pada contoh ini kami mengasumsikan Anda menggunakan **Ubuntu 12.04** dan **nginx** sebagai web server.
Kami juga mengasumsikan Ghost telah berjalan di belakang layar dengan salah satu cara yang telah disebutkan.

*   Install nginx

    ```
    $ sudo apt-get install nginx
    ```
    <span class="note">Ini akan menginstall nginx dan mengkonfigurasi semua direktori yang dibutuhkan dan konfigurasi dasar.</span>

*   Mengkonfigurasi situs Anda

    *   Buat berkas baru di `/etc/nginx/sites-available/ghost.conf`
    *   Buka berkas tersebut dengan pengolah text (e.g. `sudo nano /etc/nginx/sites-available/ghost.conf`)
        dan ketik berikut:

        ```
        server {
            listen 80;
            server_name example.com;

            location / {
                proxy_set_header   X-Real-IP $remote_addr;
                proxy_set_header   Host      $http_host;
                proxy_pass         http://127.0.0.1:2368;
            }
        }

        ```

    *   Ubah `server_name` ke domain Anda
    *   Symlink konfigurasi Anda di `sites-enabled`:

    ```
    $ sudo ln -s /etc/nginx/sites-available/ghost.conf /etc/nginx/sites-enabled/ghost.conf
    ```

    *   Restart nginx

    ```
    $ sudo service nginx restart
    ```

## Mengkonfigurasi Ghost dengan SSL <a id="ssl"></a>

Setelah mengkonfigurasi domain mengamankan antarmuka admin atau bahkan seluruh blog Anda dengan HTTPS adalah ide yang baik. Disarankan untuk mengamankan antarmuka admin dengan HTTPS karena username dan pasword akan dikirimkan dalam bentuk plain text jika enkripsi tidak dinyalakan.
Contoh berikut akan menunjukkan cara untuk menkonfigurasi SSL. Kami berasumsi, bahwa Anda telah mengikuti panduan ini dan menggunakan nginx sebagai proxy server Anda. Sebuah konfigurasi dengan proxy server yang berbeda harusnya terlihat mirip.

Pertama Anda harus mendapatkan sertifikat SSL dari provider yang dipercaya. Provider Anda akan memandu Anda melalui proses pembuatan private key dan certificate signing request (CSR). Setelah anda menerima berkas sertifikatnya Anda harus membuat salinan berkas CRT dari provider sertifikat anda dan berkas KEY yang dihasilkan saat menerbitkan CSR ke server.

- `mkdir /etc/nginx/ssl`
- `cp server.crt /etc/nginx/ssl/server.crt`
- `cp server.key /etc/nginx/ssl/server.key`

Setelah kedua berkas ini ada di tempatnya Anda harus mengupdate konfigurasi nginx Anda.

*   Buka berkas konfigurasi nginx dengan pengolah teks (e.g. `sudo nano /etc/nginx/sites-available/ghost.conf`)
*   Tembahkan konfigurasi bertanda plus ke berkas konfigurasi Anda:

    ```
     server {
         listen 80;
    +    listen 443 ssl;
         server_name example.com;
    +    ssl_certificate        /etc/nginx/ssl/server.crt;
    +    ssl_certificate_key    /etc/nginx/ssl/server.key;
         ...
         location / {
    +       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    +       proxy_set_header Host $http_host;
    +       proxy_set_header X-Forwarded-Proto $scheme;
            proxy_pass http://127.0.0.1:2368;
            ...
         }
     }
    ```

    *   Restart nginx

    ```
    $ sudo service nginx restart
    ```

Setelah langkah-langkah tersebut Anda harus bisa mengakses area admin dari blog anda dengan koneksi aman HTTPS. Jika Anda ingin membuat semua traffic menggunakan SSL Anda dapat mengubah konfigurasi protokol url pada berkas config.js Anda ke https (e.g.: `url: 'https://my-ghost-blog.com'`). Hal ini akan memaksakan penggunaan SSL untuk frontend dan admin. Semua permintaan yang dikirim melalui HTTP akan diarahkan ke HTTPS. Jika anda menyisipkan gambar pada post Anda yang diambil dari domain yang menggunakan HTTP sebuah peringatan 'insecure content' akan muncul. Skrip dan font dari domain HTTP akan berhenti bekerja.

Pada kebanyakan kasus Anda akan ingin menggunakan SSL untuk antarmuka admin dan melayani frontend dengan HTTP dan HTTPS. Untuk memakai SSL pada area admin opsi `forceAdminSSL: true` telah diperkenalkan.

Jika Anda membutuhkan informasi lebih lanjut untuk cara mengkonfigurasi SSL untuk proxy server Anda dokumentasi resmi SSL [nginx](http://nginx.org/en/docs/http/configuring_https_servers.html) dan [apache](http://httpd.apache.org/docs/current/ssl/ssl_howto.html) adalah tempat yang sempurna untuk memulai.
