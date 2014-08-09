---
<div dir="RTL">
lang: ar_AR
layout: تنصيب

meta_title: كيفية تثبيت ڨوست على الخادم الخاص بك - دليل ڨوست

meta_description: كل ما تحتاجه للحصول على منصة التدوين ڨوست وتشغيلها على البيئة المحلية أو عن بعد

heading: تثبيت ڨوست &amp; بدء العمل

subheading: الخطوات الأولى لإنشاء مدونتك للمرة الأولى.

permalink: /ar_AR/installation/upgrading/

chapter: تنصيب

section: الترقية

prev_section: نشر

next_section: مشاكل و حلول
---

# ترقية قوست <a id="upgrade"></a>

ترقية قوست سهلة و غير معقدة

هناك طرق كثيرة و مختلفة لتختار بينها .  فيما يلي وصف لما يجب أن يحدث, ووصف للعملية خطوة بخطوة عن طريق  [point-and-click style](#how-to) و عن طريق [سطر اللأوامر](#cli), و لك حرية الإختيار .

<p class="note"><strong>نسخ إحتياطي!</strong> دائماً إجراء نسخة احتياطية قبل الترقية.إقرأ أولا  <a href="#backing-up">خطوات أخذ نسخة إحطياطية</a> </p>

## نظرة عامة

<img src="https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/folder-structure.png" style="float:left" />

بمجرد تثبيت قوست بنية المجلد مماثلة للصورة الموجودة على اليسار. هناك مجلدين رئيسيين <code class="path">content</code> and <code class="path">core</code>,مع بعض الملفات في مسار الجذر root

ترقية قوست هي مسألة استبدال الملفات القديمة مع ملفات جديدة, أكتب من جديد في سطر الأوامر `npm install`لترقية <code class="path">node_modules</code>  ثم أعد تشغيل قوست لتنتهي الترقية.

إفتراضيا قوست يحفض صورك و القوالب و الاعدادات الخاصة في مسار<code class="path">content</code> , يجب حفظه في أمان! إستبدل فقط الملفات في مجلد <code class="path">core</code> و root, و كل شيئ سيكون جيد.

## النسخ الاحتياطي
 <a id="backing-up"></a>

<img src="https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/export.png" style="float:right" />

*   لحفظ جميع البيانات من قاعدة البيانات, أدخل إلى مجلد تثبيت قوست و إذهب إلى المسار التالي <code class="path">/ghost/debug/</code>. إضغط على export لتحميل ملفJSON يحتوي عل كل البيانات .
*   لعمل نسخة احتياطية من الصور و القالب الخاص بك, يجب عليك أخذ نسخة من الملفات الموجودة في <code class="path">content/themes</code> و <code class="path">content/images</code>

<p class="note"><strong>ملاحظة:</strong> يمكنك، إذا أردت، أخذ نسخة من قاعدة البيانات الخاصة بك من<code class="path">content/data</code> لكن <strong>كن حذرا</strong> لا تفعل ذالك و قوست يشتغل يجب أولا وقفه.</p>


## كيفية الترقية <a id="how-to"></a>

كيفية ترقية على الجهاز المحلي

<p class="warn"><strong>تحذير:</strong> لا <strong>تقم</strong>  بنسخ ولصق  مجلد قوست كامل على الجزء العلوي من مجلد التثبيت الموجود على ماك. لا <strong></strong> تختار <kbd> استبدال</kbd> إذا كان التحميل ببرنامج FTP, اختر  <strong>دمج</strong>.</p>

*   قم بتنزيل آخر إصدار من قوست من هذا الرابط [Ghost.org](http://ghost.org/download/)
*   قم باستخراج الملف المضعوط إلى مسار مؤقت
*   نسخ كافة الملفات الموجودة في مسار root   من الاصدار الجديد بما فيها : index.js, package.json, Gruntfile.js, config.example.js, the license and readme files.
*   التالي, قم بحذف ملف  <code class="path">core</code> , ثم استبدله بالملف الجيد <code class="path">core</code>  في مكانه.
*   في الاصدارات التي تحتوي على ترقية للقالب الافتراضي , إحذف القديم الموجود في مسار <code class="path">content/themes/casper</code> و استبدله بالجديد
*   أكتب `npm install --production`
*   أخيرا, إعادة تشغيل قوست لتصبح التغييرات سارية المفعول
## سطر الأوامر فقط <a id="cli"></a>

<p class="note"><strong>نسخة إحتياطية!</strong> إجراء نسخة احتياطية دائما قبل الترقية. إقرأ <a href="#backing-up">تعليمات النسخ الاحتياطي</a> أوّلا!</p>

### سطر الأوامر فقط في ماك <a id="cli-mac"></a>

الصورة التالية تبين خطوات ترقية قوست و قد تم تحميل الملف المضغوط في المسار التالي  <code class="path">~/Downloads</code> ومسار تثبيت قوست <code class="path">~/ghost</code> <span class="note">**ملاحظة:** `~` يعني المسار الرئيسي للمستخدم 
على لينكس وماك</span>

![ترقية قوست](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/mac-update.gif)

الخطوات المبينة في الصورة

*   <code class="path">cd ~/Downloads</code> - تغيير المسار إلى إلى مسار التحميل حيث تم حفظ أحدث نسخة من قوست
*   `unzip ghost-0.4.0.zip -d ghost-0.4.0` - إستخراج قوست في ملف<code class="path">ghost-0.4.0</code>
*   <code class="path">cd ghost-0.4.0</code> - تغيير المسار إلى مسار<code class="path">ghost-0.4.0</code> 
*   `ls` - تظهر كافة الملفات والمجلدات داخل هذا المسار
*   `cp *.js *.json *.md LICENSE ~/ghost` - نسخ  .md .js .txt and .json كل الملفات من هذا المسار <code class="path">~/ghost</code>
*   `rm -rf ~/ghost/core` - حذف  <code class="path">core</code>القديم 
*   `cp -R core ~/ghost` - نسخ مسار <code class="path">core</code> إلى  <code class="path">~/ghost</code>
*   `cp -R content/themes/casper ~/ghost/content/themes` - نسخ مسار <code class="path">casper</code>إلى <code class="path">~/ghost/content/themes</code>
*   `cd ~/ghost` - تغيير المسار إلى مسار <code class="path">~/ghost</code> 
*   `npm install --production` - تنصيب قوست
*   `npm start` - تشغييل قوست

### سطر الأوامر على سرفر لينكس فقط <a id="cli-server"></a>

*   أولا يجب أن تجد رابط آخر إصدار من قوست. سيكون الرابط مثل هذا `http://ghost.org/zip/ghost-latest.zip`.
*   إحضار الملف المضغوط بامر  `wget http://ghost.org/zip/ghost-latest.zip` (أو مهما كان رابط قوست).
*   حذف ملف  core القديم من مسار التنصيب
*   فك ضغط الملف  `unzip -uo ghost-0.4.*.zip -d path-to-your-ghost-install`
*   أكتب `npm install --production` لتثبيت أي تحديث جديد
*   أخيرا, قم بإعادة تشغيل قوست

**ملاحظة**: [howtoinstallghost.com](http://www.howtoinstallghost.com/how-to-update-ghost/) فيه أيظا كيفية ترقية قوست في سرفر لينكس.

### كيفية ترقية DigitalOcean دروبلات <a id="digitalocean"></a>

<p class="note"><strong>نسخة إحتياطية!</strong>دائما قم بحفظ نسخة إحتياطية قبل القيام بعملية الترقية. إطلع على <a href="#backing-up">backup instructions</a> أولا!</p>

*   أولا يجب أن تجد رابط آخر إصدار من قوست. سيكون الرابط مثل هذا `http://ghost.org/zip/ghost-latest.zip`.
*   في سطر الاوامر في دروبلات أكتب  `cd /var/www/` لتغير المسار.
*   التالي, أكتب `wget http://ghost.org/zip/ghost-latest.zip` (أو مهما كان رابط قوست).
*   حذف مسار  coreالقديم , `rm -rf ghost/core`
*   فك ضغط الملف `unzip -uo ghost-latest.zip -d ghost`
*   تأكد من أن جميع الملفات لديها الصلاحيات المطلوبة`chown -R ghost:ghost ghost/*`
*   إذهب إلى مسار  <code class="path">ghost</code> بكتابة  `cd ghost`
*   أكتب `npm install --production` لتحميل أي تحديث جديد
*   أخيرا, قم بإعادة تشغيل قوست عن طريق كتابة using `service ghost restart` (ستأخذ بعض الوقت)


## كيفية ترقية Node.js إلى آخر إصدار <a id="upgrading-node"></a>

إذا نصبت  Node.js من الموقع الرسمي [Node.js](nodejs.org), يمكنك ترقية  Node.js إلى آخر إصدار بتحميل البرنامج و تنصيبه. هذا سيغيير الاصدار القديم الى الاصدار الجديد
إذا كنت في اوبونتو, أو توزيعة لينكس اخرا تستعمل `apt-get`,نفس الامر للتنصيب و الترقية: `sudo apt-get install nodejs`.

لايوجد داعي لاعادة تشغيل السرفر أو قوست