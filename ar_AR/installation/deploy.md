---
<div dir="RTL">
lang: ar_AR

layout: تنصيب

meta_title: كيفية تثبيت ڨوست على الخادم الخاص بك - 
   دليل ڨوست  

meta_description: كل ما تحتاجه للحصول على منصة التدوين ڨوست 

 وتشغيلها على البيئة المحلية أو عن بعد.

heading: تثبيت ڨوست &amp; بدء العمل

subheading: الخطوات الأولى لإنشاء مدونتك للمرة الأولى.

/permalink: /ar_AR/installation/deploy

chapter: تركيب

section: نشر

prev_section: لينكس

next_section: ترقية
---
##    إنشاء ڨوست <a id="deploy"></a>

انت على استعداد لتركيب ڨوست؟ ممتاز!

اول شي تحتاج إلى التأكد، ما إذا كنت تريد تثبيت وإعداد ڨوست بنفسك، أو ما إذا كنت تفضل استخدام برنامج تنصيب.

### برامج التنصيب

هناك بضعة خيارات لتركيب بسيط في الوقت الراهن:

*   نشر إلى سحابة مع [Bitnami](http://wiki.bitnami.com/Applications/BitNami_Ghost).
*   إطلاق ڨوست مع [Rackspace deployments](http://developer.rackspace.com/blog/launch-ghost-with-rackspace-deployments.html).
*   الحصول على ڨوست وتشغيله مع [DigitalOcean Droplet](https://www.digitalocean.com/community/articles/how-to-use-the-digitalocean-ghost-application).

### تنصيب يدوي

سوف تحتاج الى استضافة لديها او تسمح بتثبيت [Node.js](http://nodejs.org).
    هذا يعني شيئا مثل سحابة ([Amazon EC2](http://aws.amazon.com/ec2/), [DigitalOcean](http://www.digitalocean.com), [Rackspace Cloud](http://www.rackspace.com/cloud/)), VPS ([Webfaction](https://www.webfaction.com/), [Dreamhost](http://www.dreamhost.com/servers/vps/))  أو حزمة أخرى لديها  SSH  وسوف تسمح لك لتثبيت Node.js. هناك الكثير و  يمكن أن تكون رخيصة .

ما لا يعمل في الوقت الراهن، هو استضافة مشتركة حيث ان هذا عادة ما تستهدف على وجه التحديد استضافة PHP. على الرغم من تقديم بعض الاستضافات Ruby، و قد تقدم Node.js في المستقبل بماانها  متشابهة الى حد ما.

<p>للأسف، فإن العديد من الحلول السحابية  مثل Nodejitsu   او Heroku غير متوافقة مع ڨوست  ستعمل في البداية، لكن سوف تحذف ملفاتك وبالتالي كل الملفات المرفوعه من الصور وقاعدة البيانات الخاصة بك سوف تختفي. Heroku يدعم MySQL لذلك يمكن أن تستخدم هذا، ولكن سوف  تفقد أي صور تم تحميلها.

الروابط التالية تحتوي على تعليمات حول كيفية الحصول على المنصة وتشغيلها مع:

*   [Dreamhost](http://www.howtoinstallghost.com/how-to-install-ghost-on-dreamhost/) - عن [howtoinstallghost.com](http://howtoinstallghost.com)
*   [DigitalOcean](http://ghosted.co/install-ghost-digitalocean/) - عن [Corbett Barr](http://ghosted.co)
*   [Webfaction](http://www.howtoinstallghost.com/how-to-install-ghost-on-webfaction-hosting/) - عن [howtoinstallghost.com](http://howtoinstallghost.com)
*   [Rackspace](http://ghost.pellegrom.me/installing-ghost-on-ubuntu/) (Ubuntu 13.04 + linux service) - from [Gilbert Pellegrom](http://ghost.pellegrom.me/)
*   [Ubuntu + nginx + forever](http://0v.org/installing-ghost-on-ubuntu-nginx-and-mysql/) - عن [Gregg Housh](http://0v.org/)
*   راجع هذا... [installation forum](https://en.ghost.org/forum/installation) لمزيد من الدروس... 

## جعل ڨوست يشتغل باستمرار

الطريقة الموصوفة سابقا لبدء ڨوست هي `npm start`. هذه طريقة جيدة للقيام بالتجربة والاختبارات  في بيئة محلية، ولكن إذا قمت بتشغيل ڨوست باستخدام سطر الأوامر فإنه يتوقف كلما  اغلقت نافذة  الأوامر تسجيل الخروج من SSH. لمنع  ذالك يجب تشغيل ڨوست كخدمة. هناك طريقتان لتحقيق ذلك.
###   <a id="forever"></a> [https://npmjs.org/package/forever](https://npmjs.org/package/forever))Forever)

يمكنك استخدام `forever` لتشغيل ڨوست كمهمة خلفية. `forever`  أيضا سوف  يهتم بمعاينة ملفات التثبيت الخاصة  بك و سيتم إعادة تشغيل  إذا تعطل.

*   لتثبيت `forever` اكتب `npm install forever -g` 
*   لتبدأ استعمال ڨوست عن طريق `forever`   اكتب من داخل مسار تنصيب ڨوست `NODE_ENV=production forever start index.js`
*   لإيقاف ڨوست اكتب `forever stop index.js`
*   للتحقق مما إذا ڨوست قيد التشغيل حاليا اكتب `forever list`

###  [http://supervisord.org/](http://supervisord.org/)) Supervisor) <a id="supervisor"></a>

توزيعات لينكس المعروفة &mdash;  مثل  فيدورا، ديبيان، وأوبونتو &mdash; تحتوي على حزمة Supervisor: نظام التحكم في العملية والذي يسمح لك بتشغيل ڨوست عند بدء التشغيل بدون استخدام البرامج النصية init scripts. على عكس Supervisor, init script هو محمول بين توزيعات لينكس والإصدارات.

*   [تثبيت Supervisor](http://supervisord.org/installing.html) كما هو مطلوب لتوزيعة لينكس الخاص بك. عادة، يكون:
    *    `apt-get install supervisor`:Debian/Ubuntu
    *    `yum install supervisor`:Fedora
    *   معظم التوزيعات الأخرى: `easy_install supervisor`
*   تأكد من أن Supervisor  قيد التشغيل, عن طريق كتابة `service supervisor start`
*   انشاء سكريبت بدءالتشغيل لملف تثبيت ڨوست الخاص بك. عادة هذا  يكون في : `/etc/supervisor/conf.d/ghost.conf`
مثال
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

*    بدء ڨوست باستخدام : `supervisorctl start ghost` 
*   لوقف ڨوست: `supervisorctl stop ghost`

يمكنك ان تطالع [documentation for Supervisor](http://supervisord.org) لمزيد من المعلومات

### Init Script <a id="init-script"></a>

نظام لينكس يستخدم Init Script لتعمل على نظام التشغيل. هذا السكريبت موجود في  /etc/init.d. لجعل قوست يشتغل باستمرار و يعيد الاشتغال بعد اعادة تشغيل النظام يمكنك اعداد init script  ليقوم بالامر. والمثال التالي يعمل على أوبونتو وتم اختباره على **Ubuntu 12.04**.

*   إنشاء ملف  etc/init.d/ghost/  باستخدام الأمر التالي :

    ```
    $ sudo curl https://raw.githubusercontent.com/TryGhost/Ghost-Config/master/init.d/ghost \
      -o /etc/init.d/ghost
    ```

*   افتح الملف باستخدام `nano /etc/init.d/ghost` وتحقق من التالي:
*   تغيير المتغير `GHOST_ROOT`  إلى المسار حيث قمت بتثبيت ڨوست 
*   تحقق مما إذا كان المتغير`DAEMON` هو نفس الناتج من `which node`
*    Init script يشتغل مع المستخدم و مجموعة المستخديم الخاصة به على ڨوست في النظام, لانشائهم نتبع التالي:

    ```
    $ sudo useradd -r ghost -U
    ```

*   لنتحقق من ان المستخدم له صلاحيات دخول ملف التثبيت:

    ```
    $ sudo chown -R ghost:ghost /path/to/ghost
    ```

*   تغيير إذن التنفيذ ل init script بكتابة:

    ```
    $ sudo chmod 755 /etc/init.d/ghost
    ```

*   الان يمكنك التحكم في ڨوست بالاوامر التالية:

    ```
    $ sudo service ghost start
    $ sudo service ghost stop
    $ sudo service ghost restart
    $ sudo service ghost status
    ```

*   لبدء ڨوست على نظام تشغيل init script الذي تم إنشاؤه حديثا لابد من يكون مسجلا في قائمة بدء التشغيل..
    اكتب الأمرين التاليين في سطر الأوامر:

    ```
    $ sudo update-rc.d ghost defaults
    $ sudo update-rc.d ghost enable
    ```

*   دعونا نتأكد من المستخدم الخاص بك يمكنه تغيير الملفات، config.js  مثال في مسارتنصيب ڨوست، على سبيل المثال عن طريق تعيينك  في مجموعة المستخدمين:
    ```
    $ sudo adduser USERNAME ghost
    ```

*   إذا قمت بإعادة تشغيل الخادم الخاص بك ڨوست ينبغي أن يشتغل اوتوماتكيا.


## اعداد ڨوست مع اسم نطاق <a id="nginx-domain"></a>

إذا كنت اعددت ڨوست للتشغيل الدائم يمكنك أيضا إعداد خادم ويب كبديل لخدمة مدونتك مع نطاقك.
في هذا المثال نفترض انك تستخدم **Ubuntu 12.04** و تستخدم **nginx** كما خادم ويب.
فإنه يفترض أيضا أن قوست قيد التشغيل في الخلفية مع واحدة من الطرق المذكورة أعلاه.

*   تنصيب nginx

    ```
    $ sudo apt-get install nginx
    ```
    <span class="note">This will install nginx and setup all necessary directories and basic configurations.</span>

*   اعداد موقعك

    *   انشاء ملف جديد في `/etc/nginx/sites-available/ghost.conf`
    *   افتح الملف بمحرر النصوص (e.g. `sudo nano /etc/nginx/sites-available/ghost.conf`)
        وقم بلصق التالي

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

    *   تغيير `server_name` لاسم نطاقك
    *   الارتباط الرمزي التكوين الخاص بك في `sites-enabled`:

    ```
    $ sudo ln -s /etc/nginx/sites-available/ghost.conf /etc/nginx/sites-enabled/ghost.conf
    ```

    *   اعادة تشغيل nginx

    ```
    $ sudo service nginx restart
    ```

## اعداد قوست مع SSL <a id="ssl"></a>

بعد إعداد النطاق المخصص بك ا من المستحسن تأمين واجهة الادارة أو ربما المدونة كلها باستخدام HTTPS. فإنه من االجيدحماية واجهة الادارة مع HTTPS لأن اسم المستخدم وكلمة المرور سوف يتم إرسالها في نص عادي إذا لم تقم بالتشفير.

والمثال التالي يظهر لك كيفية إعداد SSL. ونحن نفترض أن كنت قد اتبعت هذا الدليل حتى الآن، وتسخدم  nginx ك proxy server. الاعددات مع سرفر اخر  متشابهة

تحتاج أولا إلى الحصول على شهادة SSL من مزود تثق به. سوف يوفر دليل لكم من خلال عملية توليد المفتاح الخاص وطلب توقيع شهادة (CSR). بعد أن كنت قد حصلت على ملف الشهادة لديك انسخ ملف CRT من مزود شهادتك وملف KEY الذي يتم إنشاؤهه خلال إصدارCRT إلى السرفر.

- `mkdir /etc/nginx/ssl`
- `cp server.crt /etc/nginx/ssl/server.crt`
- `cp server.key /etc/nginx/ssl/server.key`

بعد وضع الملفين في مكانهما لابد من تحديث اعدادات nginx

*   افتح ملف اعدادات nginx بمحرر النصوص(e.g. `sudo nano /etc/nginx/sites-available/ghost.conf`)
*   إضافة الإعدادات المشار لها + لملف التكوين الخاص بك:
  
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

    *   اعادة تشغيل nginx

    ```
    $ sudo service nginx restart
    ```

بعد هذه الخطوات يجب أن تكون قادر على الوصول إلى منطقة  الادمن من مدونتك باستخدام اتصال HTTPS الآمن. إذا كنت تريد أن تجبر كل حركة المرور الخاصة بك لاستخدام SSL فمن الممكن لتغيير بروتوكول الإعداد  في ملف config.js الخاص لHTTPS (e.g.: `url: 'https://my-ghost-blog.com'`). وهذا يفرض استخدام SSL للالواجهة واالادمن. سيتم توجيه جميع الطلبات المرسلة عبر HTTP إلى HTTPS. إذا قمت بتضمين الصور في رسالتك التي تم استردادها من المجالات التي تستخدم HTTPسوف تظهر رسالة إنذار 'محتوى غير آمن'. سوف  تتوقف عن العمل الكتابات والخطوط من المجالات HTTP

في معظم الحالات سترغب في فرض SSL لواجهة إدارة وخدمة الواجهة الأمامية باستخدام HTTP و HTTPS. لإجبار SSL لمنطقة مشرف `forceAdminSSL: true`.

اذا كنت بحاجة الى مزيد من المعلومات حول كيفية إعداد SSL لخادم الوكيل الخاص بك في documention SSL الرسمي [nginx](http://nginx.org/en/docs/http/configuring_https_servers.html) و [apache](http://httpd.apache.org/docs/current/ssl/ssl_howto.html) مكان المثالي لبدء.
