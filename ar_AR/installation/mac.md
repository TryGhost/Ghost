---
<div dir="RTL">
lang: ar_AR

layout: تنصيب

meta_title: كيفية تثبيت ڨوست على الخادم الخاص بك - دليل ڨوست

meta_description: كل ما تحتاجه للحصول على منصة التدوين ڨوست وتشغيلها على البيئة المحلية أو عن بعد.

heading: تثبيت ڨوست &amp; بدء العمل

subheading: الخطوات الأولى لإنشاء مدونتك للمرة الأولى

permalink: /ar_AR/installation/mac/

chapter: تركيب

section: ماك

prev_section: تركيب

next_section: وندوز
---


# التنصيب على الماك <a id="install-mac"></a>

لتنصيب Node.js و ڨوست في جهاز الماك خاصتك عليك أولا فتح الطرفية Terminal. فقط افتح spotlight و أكتب "Terminal".

### تثبيت Node

*   في صفحة [http://nodejs.org](http://nodejs.org) اضغط على وصلة التحميل الخاصة بماك سيتم تحميل ملف '.pkg'.
*   بعد فتح الملف الذي حملته سيتم تنصيب  node و npm.
*  من خلال النقر على ملف التثبيت، أدخل كلمة السر والضغط على 'تثبيت البرنامج'.
*    عند الانتهاء من التنصيب انتقل الى نافذة الطرفية المفتوحة و أكتب`echo $PATH`    للتثبت من أن  '/usr/local/bin/' هو المسار الصحيح 

<p class="ملاحظة"><strong>Note:</strong> أذا '/usr/local/bin' لم تظهر في المسار المطلوب $PATH, أنظر في قسم <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/troubleshooting#export-path"> مشاكل و حلول </a>  لتجد كيف تضيفه</p>

إذا واجهتك مشكلة يمكنك مشاهدة كامل العملية [كامل عملية التنصيب](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-node-mac.gif "Install Node on Mac").

### تنصيب و تشغيل ڨوست

*   الدخول على [http://ghost.org](http://ghost.org), و بعد ذالك انقر على 'Download Ghost Source Code'.
*   في صفحة التحميل, أنقر على زر تحميل آخر اصدارفي شكل أرشيف .
*   انقر على السهم بجانب الملف الذي تم تنزيله حديثا، واختيار "عرض في المستكشف".
*   في المستكشف، انقر نقرا مزدوجا على الملف المضغوط لفكه.
*   التالي,أسحب المجلد'ghost-#.#.#'  الذي تم استخراجه و اسحبه الى شريط العلامات في نافذة الطرفية المفتوحة و هذا سيفتح طرفية جديدة في المكان الصحيح .
*   في الطرفية الجديدة اكتب `npm install --production` 
*   عندما ينتهي تنصيب npm, أكتب `npm start` لتبدأ قوست في بيئة التطوير
*   في المتصفح انتقل الى <code class="path">127.0.0.1:2368</code> لرؤية مدونتك الجديدة
*   غيّر العنوان الى <code class="path">127.0.0.1:2368/ghost</code> أنشاء المستخدم المشرف admin لكي تدخل الى صفحة الدخول
*   أنظر في  [دليل الاستعمال](/usage) لمتابعة المرحلة التالية 

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-ghost-mac.gif)

