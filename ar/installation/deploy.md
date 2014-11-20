---
lang: ar
layout: installation
meta_title: How to Install Ghost on Your Server - Ghost Docs
meta_description: Everything you need to get the Ghost blogging platform up and running on your local or remote environement.
heading: تنصيب Ghost والبداية
subheading: الخطوة الآولى لإعداد مدونتك الجديدة
permalink: /ar/installation/deploy/
chapter: installation
section: deploy
prev_section: linux
next_section: upgrading
---
## الحصول على Ghost <a id="deploy"></a>

إذن انت على استعداد للحصول على Ghost؟ ممتاز!

القرار الأول الذي تحتاج إليه، هو ما إذا كنت تريد تثبيت وإعداد Ghost بنفسك، أو ما إذا كنت تفضل استخدام المثبت.

### التثبيت

يوجد اكثر من خيار لتنصيب في الوقت الحالي:

*   نشر على السحابة مع [Bitnami](http://wiki.bitnami.com/Applications/BitNami_Ghost).
*   إطلاق Ghost مع [Rackspace deployments](http://developer.rackspace.com/blog/launch-ghost-with-rackspace-deployments.html).
*   الحصول عليه وتشغيله مع [DigitalOcean Droplet](https://www.digitalocean.com/community/articles/how-to-use-the-digitalocean-ghost-application).

### الإعدادات اليدوية

سوف تحتاج الى حزمه استضافه توفر لك او سوف توفر تثبيت [Node.js](http://nodejs.org).
    وهذا يعني شي مثل سحابة ([Amazon EC2](http://aws.amazon.com/ec2/), [DigitalOcean](http://www.digitalocean.com), [Rackspace Cloud](http://www.rackspace.com/cloud/)), VPS ([Webfaction](https://www.webfaction.com/), [Dreamhost](http://www.dreamhost.com/servers/vps/)) او حزمه اخرى لديها دخول لـ SSH (terminal) وتسمح لك بتثبيت Node.js. هناك الكثير من الخيارات وايضا رخيصة جداً.

في الوقت الحالي لن يعمل معك الاستضافة العادية او الاستضافة المشتركة - cPanel-style - لأنها عادةً ما تستهدف على وجه التحديد استضافة PHP. وعلى الرغم من انا بعضها توفر استضافة Ruby, وبعضها سوف توفر Node.js وهذا كله متشابهه.

<p>لسوء الحظ، فإن العديد من حلول الاستضافة السحابية والتي تستهدف الـ Node.js كا **Nodejitsu** ومثل **Heroku** هي **غير متوافقة** مع Ghost. وسوف تعمل معك في البداية، لكنها سوف تحذف الملفات الخاصة بك، وبالتالي كل الملفات المرفوعه من الصور وقاعدة البيانات الخاصة بك سوف تختفي. Heroku يدعم MySQL  بحيث يمكن استخدامه، ولكن سوف تفقد أي صوره تمق بتحميلها.

الروابط التالية تحتوي على تعليمات حول كيفية الحصول على وتشغيلها مع:

*   [Dreamhost](http://www.howtoinstallghost.com/how-to-install-ghost-on-dreamhost/) - [howtoinstallghost.com](http://howtoinstallghost.com)
*   [DigitalOcean](http://ghosted.co/install-ghost-digitalocean/) - [Corbett Barr](http://ghosted.co)
*   [Webfaction](http://www.howtoinstallghost.com/how-to-install-ghost-on-webfaction-hosting/) - [howtoinstallghost.com](http://howtoinstallghost.com)
*   [Rackspace](http://ghost.pellegrom.me/installing-ghost-on-ubuntu/) (Ubuntu 13.04 + linux service) - [Gilbert Pellegrom](http://ghost.pellegrom.me/)
*   [Ubuntu + nginx + forever](http://0v.org/installing-ghost-on-ubuntu-nginx-and-mysql/) - [Gregg Housh](http://0v.org/)
*   ...او إطلع على [installation forum](https://en.ghost.org/forum/installation) لتفاصيل اكثر ...

## لجعل Ghost يعمل بشكل مستمر - Forever

الطريقة المشروحة سابقا لبدء Ghost وهي `npm start`. هي الوسيلة الجيدة للقيام بتطوير واجراء الاختبارات على جهازك، ولكن إذا كنت تستخدم Ghost من خلال  سطر الأوامر فإنه سيتم ايقافة كلما قمت بإغلاق نافذة terminal أوقمت بتسجيل الخروج من SSH. لمنع ايقاف Ghost لديك يجب تشغيل Ghost كخدمة. وهناك طريقتان لتحقيق ذلك.

### Forever ([https://npmjs.org/package/forever](https://npmjs.org/package/forever)) <a id="forever"></a>

يمكنك استخدام `forever` لتشغيل Ghost كمهام تعمل بخلفية الجهاز. `forever` أيضا أن تأخذ الرعاية من ناحية تنصيب Ghost الخاصة بك، وسوف يقوم بإعادة التشغيل في حالة تعطل الـ Node.

*   لتثبيت باستخدام `forever` اكتب `npm install forever -g`
*   لبدء Ghost باستخدام `forever` من مسار مجلد Ghost اكتب `NODE_ENV=production forever start index.js`
*   لإيقاف عمل Ghost اكتب `forever stop index.js`
*   للتحقق مما إذا Ghost قيد التشغيل حاليا اكتب `forever list`

### Supervisor ([http://supervisord.org/](http://supervisord.org/)) <a id="supervisor"></a>

توزيعات لينكس- المشهوره كما فيدورا، ديبيان، وأوبونتو تعمل على حزم المشرف (Supervisor): نظام التحكم في العملية والذي يسمح لك لتشغيل Ghost عند بدء التشغيل بدون استخدام البرامج النصية. وعلى عكس البرامج النصيه (init script)، المشرف (Supervisor) هو محمول بين توزيعات لينكس والإصدارات.

*   تثبيت [Install Supervisor](http://supervisord.org/installing.html) على النحو المطلوب لتوزيع لينكس الخاص بك. عادة، يكون بالطريقة التالية:
    *   Debian/Ubuntu: `apt-get install supervisor`
    *   Fedora: `yum install supervisor`
    *   معظم التوزيعات الأخرى: `easy_install supervisor`
*   تأكد من أن المشرف - Supervisor - قيد التشغيل، عن طريق تشغيل `service supervisor start`
*   إنشاء البرنامج النصي لبدء التشغيل لتثبيت Ghost. وعادةً هذا يكون كالتالي `/etc/supervisor/conf.d/ghost.conf` ومثال على ذلك:

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

*   بدء Ghost باستخدام المشرف - Supervisor: `supervisorctl start ghost`
*   لإيقاف Ghost: `supervisorctl stop ghost`

وبإمكان الإطلاع على [documentation for Supervisor](http://supervisord.org) لمعلومات اكثر.

### Init Script <a id="init-script"></a>

لينكس تستخدم سكربتات ال init لتشغيلها على نظام التشغيل. توجد هذه البرامج النصية في /etc/init.d. ولجعل Ghost يعمل بشكل مستمر، وحتى مع اعاده التشغيل يمكن إنشاء سكربت الـ init لإنجاز تلك المهمة. والمثال التالي يعمل على أوبونتو وتم اختباره على **Ubuntu 12.04**.

*   إنشاء ملف /etc/init.d/ghost مع الأمر التالي:

    ```
    $ sudo curl https://raw.githubusercontent.com/TryGhost/Ghost-Config/master/init.d/ghost \
      -o /etc/init.d/ghost
    ```

*   افتح الملف مع `nano /etc/init.d/ghost` وتحقق ما يلي:
*   تعديل المتغير `GHOST_ROOT` إلى المسار حيث قمت بتثبيت Ghost
*   معرفة ما اذا كان المتغير `DAEMON`  هو نفس الناتج من `which node`
*   The Init script runs with it's own Ghost user and group on your system, let's create them with the following:
*   الـ init سكريبت يعمل مع نفس المستخدم لـ Ghost ومع نفس المحموعة في النظام، وهذا يكون كالتالي:

    ```
    $ sudo useradd -r ghost -U
    ```

*  لنتأكد ان مستخدم Ghost لديه الصلاحية لدخول على التثبيتك

    ```
    $ sudo chown -R ghost:ghost /path/to/ghost
    ```

*   Change the execution permission for the init script by typing
*   تغيير إذن التنفيذ للبرنامج النصي -init script- عن طريق كتابة:

    ```
    $ sudo chmod 755 /etc/init.d/ghost
    ```

*  الآن يمكنك التحكم بـ Ghost مع الأوامر التالية:

    ```
    $ sudo service ghost start
    $ sudo service ghost stop
    $ sudo service ghost restart
    $ sudo service ghost status
    ```

*    لتشغيل Ghost على النظام نكتب الأوامر الاتالية:

    ```
    $ sudo update-rc.d ghost defaults
    $ sudo update-rc.d ghost enable
    ```

*   لنتأكد ان المستخدم يستطيع التعديل على الملفات، config.js كامثال والموجود في مسار Ghost، وذلك عن طريق تسجيلك في مجموعة Ghost:

    ```
    $ sudo adduser USERNAME ghost
    ```

*   اذا قمت بإعادة تشغيل السيرفر الآن يجب ان يكون Ghost قيد التشغيل.


## اعداد Ghost ليعمل على عنوان الدومين <a id="nginx-domain"></a>

إذا كنت قمت بإعداد Ghost ليعمل دون توقف يمكنك أيضا إعداد خادم الويب كا بروكسي لخدمة المدونه الخاص بك مع المجال الخاص بك. في هذا المثال افترضنا كنت تستخدم **Ubuntu 12.04** واستخدام **nginx** كا خادم ويب. ويفترض أيضا أن Ghost قيد التشغيل في الخلفية مع واحدة من الطرق المذكورة أعلاه.

*   تثبيت nginx

    ```
    $ sudo apt-get install nginx
    ```
    <span class="note">هذا وسوف يقوم بتثبيت nginx وإعداد كافة الدلائل اللازمة والتكوينات الأساسية.</span>

*   تكوين موقعك

    *   قم بإنشاء ملف جديد `/etc/nginx/sites-available/ghost.conf`
    *   افتح الملف في محرر النصوص (e.g. `sudo nano /etc/nginx/sites-available/ghost.conf`)
        وقم بإلصاق التالي

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

    *   قم بتغيير `server_name` للدومين الخاص بك
    *   ضع الارتباط الرمزي -Symlink- في التكوين الخاص بك في `sites-enabled`:

    ```
    $ sudo ln -s /etc/nginx/sites-available/ghost.conf /etc/nginx/sites-enabled/ghost.conf
    ```

    *   قم بإعادة تشغيل الـ nginx

    ```
    $ sudo service nginx restart
    ```

## اعداد Ghost ليعمل مع الـSSL <a id="ssl"></a>

بعد إعداد الدومين الخاص بك، فكرة جيدة ان تقوم بتأمين واجهة الادارة أو ربما المدونة الخاص بك بأكملها باستخدام HTTPS. فإنه من المستحسن لحماية واجهة الادارة مع HTTPS لأن اسم المستخدم وكلمة المرور تنتقل من و إلى كا نص عادي إذا لم تقم بتمكين التشفير.

والمثال التالي تظهر لك كيفية إعداد SSL. ونحن نفترض أن كنت قد اتبعت هذا دليل حتى الآن، واستخدامة nginx كاخادم ووكيل الخاص بك. والإعداد مع خادم وكيل آخر يجب أن يتشابه.

تحتاج أولا إلى الحصول على شهادة SSL من مزود تثق به. سوف يقوم مزود التوثيق بشرح الطريقة لكم من خلال عملية توليد مفتاح التوثيق الخاص وطلب توقيع الشهادة (CSR). وبعد حصولك على ملف الشهادة انسخ ملف CRT من مزود شهادتك وانسخ ملف المفتاح الذي تم إنشاؤه أثناء إصدار CSR إلى السيرفر كالتالي:

- `mkdir /etc/nginx/ssl`
- `cp server.crt /etc/nginx/ssl/server.crt`
- `cp server.key /etc/nginx/ssl/server.key`

بعد وضع الملفين في مكانهما تحتاج لتحديث ملف التكوين -configuration- في nginx

*   افتح ملف ال -configuration- في nginx (e.g. `sudo nano /etc/nginx/sites-available/ghost.conf`)
*   اضف الإعدادات التالية كماهي لملف الـ -configuration- :

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

    *   اعد تشغيل الـnginx

    ```
    $ sudo service nginx restart
    ```

بعد هذه الخطوات يجب أن تكون قادر على الوصول إلى منطقة الادمن من المدونة الخاص بك باستخدام اتصال HTTPS الآمن. إذا كنت تريد أن تجبر كل حركات المرور الخاصة بك لاستخدام SSL فمن الممكن تغيير بروتوكول الرابط في config.js  إلى https (e.g.: `url: 'https://my-ghost-blog.com'`). وهذا يفرض استخدام SSL لواجهة والادارة او الادمن. سيتم إعادة توجيه جميع الطلبات التي يتم إرسالها عبر HTTP إلى HTTPS.  إذا قمت بتضمين الصور في رسالتك التي تم استردادها من المجالات التي تستخدم HTTP سيظهر تحذير "محتوى غير آمن". والنصوص والخطوط من المجالات HTTP تتوقف عن العمل.

في معظم الحالات سوف تريد فرض SSL لواجهة إدارة وخدمة الواجهة باستخدام HTTP و HTTPS. لاجبار SSL لمنطقة الادمن الخيار  `forceAdminSSL: true` تم تقديمحه.

اذا كنت بحاجة الى مزيد من المعلومات حول كيفية إعداد SSL لخادم الوكيل الخاص بك: [nginx](http://nginx.org/en/docs/http/configuring_https_servers.html) و [apache](http://httpd.apache.org/docs/current/ssl/ssl_howto.html) هو المكان الافضل لك.
