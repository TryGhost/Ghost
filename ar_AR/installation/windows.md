---
<div dir="RTL">
lang: ar_AR

layout: تنصيب

meta_title:كيفية تثبيت ڨوست على الخادم الخاص بك - دليل ڨوست

meta_description: كل ما تحتاجه للحصول على منصة التدوين ڨوست وتشغيلها على البيئة المحلية أو عن بعد

heading: تثبيت ڨوست &amp; بدء العمل

subheading: الخطوات الأولى لإنشاء مدونتك للمرة الأولى.

permalink: /ar_AR/installation/windows/

chapter: تنصيب

section: وندوز

prev_section: ماك

next_section: لينكس
---

# التنصيب في بيئة وندوز <a id="install-windows"></a>

### تنصيب Node

*   في موقع [http://nodejs.org](http://nodejs.org)إضغط على install, سيتم تحميل ملف  '.msi' 
*   إضغط على الملف الذي تم تحميله لتنصيبه, سيتم نتصيب   Node و npm.
*   عند النهاية ستظهر رسالة انه تم تنصيب Node.js بنجاح.

إذا ظهرت مشكلة يمكنك مشاهدة كامل عملية التنصيب هنا [process in action here](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-node-win.gif "Install node on Windows").

### تحميل و فك  ملف قوست

*   سجل الدحول إلى صفحة قوست [http://ghost.org](http://ghost.org), و إضغط على 'Download Ghost Source Code'.
*   في صفحة التحميل, إغط على رابك التحميل لتحصل على آخر إصدار
*   انقر على السهم بجانب الملف الذي تم تنزيله حديثا، واختيار "عرض في المجلد'.
*   عندما يفتح المجلد، انقر بزر الماوس الأيمن على ملف المضغوط واختيار "استخراج كل الملفات '.

ذا ظهرت مشكلة يمكنك مشاهدة كامل العملية هنا [process in action here](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-ghost-win.gif "Install Ghost on Windows Part 1").

### تنصيب و تشغيل قوست

*   في قائمة ابدأ الخاصة بك, أوجد 'Node.js' ثم آختر 'Node.js Command Prompt'
*   في سطر الاومر Node command prompt,يجب تغيير المسار إلى مسار فك ضغط قوست. أكتب: `cd Downloads/ghost-#.#.#` (استبدال تجزئات مع إصدار قوست الذي قمت بتحميله).
*  التالي, في سطر الأوامر اكتب `npm install --production` <span class="note">لا تنسى الشرطات</span>
*   عندما ينتهي تنصيب npm , أكتب `npm start` لبدء تشغيل قوست في وضع التطوير
*   في المتصفح, إذهب إلى  <codeإ class="path">127.0.0.1:2368</code> لمشاهدة قوست مباشر
*   غيّر الرابط إلى<code class="path">127.0.0.1:2368/ghost</code> و أنشي حساب المسوول للدحول إلى صفحة أدميين.
*   إطلع على [usage docs](/usage) للمرحلة القادمة

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-ghost-win-2.gif "Install Ghost on Windows - Part 2")

