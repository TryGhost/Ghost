---
lang: ar
layout: installation
meta_title: How to Install Ghost on Your Server - Ghost Docs
meta_description: Everything you need to get the Ghost blogging platform up and running on your local or remote environement.
heading: تنصيب Ghost والبداية
subheading: الخطوة الآولى لإعداد مدونتك الجديدة
permalink: /ar/installation/mac/
chapter: installation
section: mac
prev_section: installation
next_section: windows
---


# التثبيت على الماك <a id="install-mac"></a>

<p class="note"><strong>تنبية</strong> Ghost يتطلب Node.js اصدار <strong dir="ltr">0.10.x</strong> (آخر إصدار). ننصح بـ Node.js <strong>0.10.30</strong> و npm <strong>1.4.21</strong>.</p>

لتنصيب Node.js و Ghost على جهاز الماك تحتاج لفتح نافذة الـ terminal. بإمكانك الحصول عليه من خلال فتح spotlight و كتابة "Terminal".

### تنصيب الـ Node

*   من [http://nodejs.org](http://nodejs.org) انقر على تثبيت (install), سيتم تحميل ملف '.pkg'.
*   انقر على ملف التحميل لفتح المثبت, وسايقوم بتثبيت كلاً من ال Node و Npm.
*   قم بالنقر خلال التثبيت, اخيرً ادخل كلمة السر وانقر على 'install software'.
*   عند اتمام عملية التثبيت، اذهب الى نافذة terminal وقم بكتابة التالي `echo $PATH` للتأكد من ان المسار '/usr/local/bin/' هو مسارك.

<p class="note"><strong>تنبيه:</strong> في حالة ان '/usr/local/bin' لم يظهر في المسار - $PATH, شاهد <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/troubleshooting#export-path">troubleshooting tips</a> لتتعرف على طريقة اضافته</p>

في حالة واجهة مشكلة بإمكانك مشاهدة [process in action](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-node-mac.gif "Install Node on Mac").

### تثبيت و تشغيل Ghost

*	قم بالدخول في [http://ghost.org](http://ghost.org)، ومن ثم اضفط على ايقونة 'Download Ghost Source Code'.
*	في صفحة التحميل، اضغط على الايقونة لتحميل الملف (zip).
*	انقر على السهم بجانب الملف الذي تم تنزيله، واختيار 'show in finder'.
*   في الـ finder,  انقر نقرا مزدوجا على الملف المضغوط اللذي تم تحميله لاستخراجه.
* ثم اسحب المجلد المسخرج 'ghost-#.#.#' وضعع في نافذة الـ "Terminal"، وسوف يقوم بفتح نافذه جديدة تحتوي على المسار الصحيح لمكان المجلد.
*	في النافذة الجديدة للـ "Terminal" اكتب  `npm install --production` <span class="note">لاحظ الشرطتين</span>
*	عند انتهاء الـ npm من التنصيب، اكتب `npm start` لكي يعمل Ghost على نمط التطوير.
*	في المتصفح، اذهب الى الرابط التالي <code class="path">127.0.0.1:2368</code> لتشاهد صفحة مدونه Ghost الجديدة
*	غير مسار الرابط الى <code class="path">127.0.0.1:2368/ghost</code> وقم بإنشاء حساب الادمن لكي تتمكن من الدخول لصفحة الادمن
*	شاهد صفحة [usage docs](/usage) للإرشادات حول الخطوة القادمة

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-ghost-mac.gif)

