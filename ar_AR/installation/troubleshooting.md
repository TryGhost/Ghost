---
<div dir="RTL">
lang: ar_AR

layout: تنصيب

meta_title: كيفية تثبيت ڨوست على الخادم الخاص بك - دليل ڨوست

meta_description: كل ما تحتاجه للحصول على منصة التدوين ڨوست وتشغيلها على البيئة المحلية أو عن بعد

heading: تثبيت ڨوست &amp; بدء العمل

subheading: الخطوات الأولى لإنشاء مدونتك للمرة الأولى.

permalink: /ar_AR/installation/troubleshooting/

chapter: تركيب

section: مشاكل و حلول

prev_section: الترقية
---


# مشاكل و حلول و قسم الاسئلة <a id="troubleshooting"></a>

<dl>
    <dt id="export-path">'/usr/local/bin' لا تظهر في $PATH</dt>
    <dd>يمكنك اضافتها بعمل التالي:
        <ul>
            <li>في نافذة الطرفية أكتب <code>cd ~</code>, سوف تنتقل الى المسار  الاصلي home directory</li>
            <li>الآن أكتب <code>ls -al</code> لتظهر كل الملفات و المجلدات التي في هذا المسار حتى المخفية أيضا</li>
            <li>سوف ترى ملف باسم <code class="path">.profile</code> أو <code class="path">.bash_profile</code>اذا لم يوجد أكتب  <code>touch .bash_profile</code> لانشاء الملف</li>
            <li>لآن اكتب <code>open -a Textedit .bash_profile</code> لتفتح الملف في محرر النصوص.</li>
            <li>أضف <code>export PATH=$PATH:/usr/local/bin/</code> في آخر الملف , وأحفظه</li>
            <li>هذه الاعدادات سوف تعمل لم تفتح نافذة طرفية جديدة new Terminal, اذا أفتح طرفية جديدة و أكتب  <code>echo $PATH</code> لترى أن ملف  '/usr/local/bin/' موجودt.</li>
        </ul>
    </dd>
    <dt id="sqlite3-errors"> لم يتم تثبيتSQLite3</dt>
    <dd>
        <p> حزمةSQLite3  متوافقة مع أكثر النواة المعروفة . اذا كنت تستعمل توزيعة غير معروفة أو نواة أخرى فأن SQLite3 سوف يعطيك خطأ 404 لأنه لم يجد النواة المتوافقة لنظامك, .</p>
        <p>يمكن اصلاح ذالك باضطرار SQLite3 للبناء من جديد. هذا يتطلب python و gcc. جرب ذالك بكتابة الأمر <code>npm install sqlite3 --build-from-source</code></p>
        <p>اذا لم تنجح عملية البناء فانه حتما هناك شيئ  ناقص في  نواة python أو gcc, في لينكس جرب<code>sudo npm install -g node-gyp</code>, <code>sudo apt-get install build-essential</code> و <code>sudo apt-get install python-software-properties python g++ make</code> قبل البناء من المصدر.</p>
        <p>لمزيد من المعلومات حول بناء binaries يرجى الاطلاع: <a href="https://github.com/developmentseed/node-sqlite3/wiki/Binaries">https://github.com/developmentseed/node-sqlite3/wiki/Binaries</a></p>
        <p>بمجرد نجاح بناء ثنائي للنظام الخاص بك، الرجاء اتباع <a href="https://github.com/developmentseed/node-sqlite3/wiki/Binaries#creating-new-binaries">instructions here</a> لاضافة البناري الذي قمت ببنائه لمشروع node-sqlite لكي في المستقبل لا يكون نفس المشكل لمستخدمين آخرين.</p>
    </dd>
    <dt id="image-uploads">لا أستطيع تحميل الصور</dt>
    <dd>
        <p>إذا كنت على DigitalOcean  عندما كان ڨوست في v0.3.2، أو كنت تستخدم NGINX على منصة أخرى، قد  لا يمكنك تحميل الصور.</p>
        <p>ما يحدث في الواقع، هو لا يمكنك تحميل الصور أكبر من 1MB (جرب صورة صغيرة، سوف يعمل). وهذاحجم صغير جدا!</p>
        <p>لزيادة الحجم تحتاج إلى تحرير ملف الاعدادات NGINX الخاص بك، وتعيين الحجم إلى شيء آخر.</p>
        <ul>
            <li>سجل الدخول إلى الخادم الخاص بك، واكتب <code>sudo nano /etc/nginx/conf.d/default.conf</code>لتفتح ملف الاعدادات.</li>
            <li>بعد ذالك <code>server_name</code> أضف السطر التالي: <code>client_max_body_size 10M;</code></li>
            <li>أخيرا, أضغط <kbd>ctrl</kbd> + <kbd>x</kbd> للخروج. Nano سيسألك هل تريد حفظ الملف  أكتب,<kbd>y</kbd> أضغط <kbd>enter</kbd>للحفظ.</li>
        </ul>
    </dd>
</dl>

