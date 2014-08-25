---
lang: ar
layout: installation
meta_title: How to Install Ghost on Your Server - Ghost Docs
meta_description: Everything you need to get the Ghost blogging platform up and running on your local or remote environement.
heading: Installing Ghost &amp; Getting Started
subheading: The first steps to setting up your new blog for the first time.
permalink: /ar/installation/mac/
chapter: installation
section: mac
prev_section: installation
next_section: windows
---


# التنصيب على أجهزة الماك <a id="install-mac"></a>

لتثبيت Node.js و Ghost على نظام الماك تحاج لفتح الـ Terminal وتستطيع أن تجدة تحت مجلد التطبيقات. 

### تثبيت Node

*   من خلال موقع [http://nodejs.org](http://nodejs.org) اضغط على install, سوف يتم تحميل ملف '.pkg'. 
*   قم بالظغط على الملف الذي تم تحميله لكي تفتخ لك نافذة التثبيت، حيث ستم تثبيت الـ Node و npm.
*   اتبع خطوات التثبيت، في اخر خطوه سوف يطلب منك ادخال كلمة المرور لجهازك وبعدها اضغط على 'install software'.
*   عند الإنتهاء من عملية التثبيت، اذهب الى الـ Terminal ومن ثم اكتب التالي echo $PATH للتآكد من ان '/usr/local/bin/' هو المسار الإفتزاضي.

<p class="note"><strong>ملاحظة:</strong> اذا كان '/usr/local/bin' لم يظهر كا مسارك الإفتزاضي, اضغط على الرابط التالي <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/troubleshooting#export-path">troubleshooting tips</a> لتتمكن من إضافة المسار</p>

اذا واجهة اي مشكلة بإمكانك مشاهدة الطريقة مرئياً [here](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-node-mac.gif "Install Node on Mac").

### تركيب وتشغيل Ghost

*   قم بتسجيل الدخول في [http://ghost.org](http://ghost.org), ومن ثم اضغط على 'Download Ghost Source Code'. 
*   في صفحة التحميل، اضغط على الايقونة لتحميل أحدث ملف مضغوط.
*   اضغط على السهم بجانب الملف الذي تم تحميلة، ومن ثم قم باختيار 'show in finder'.
*   قم بالضغظ على الملف المضغوط لاستخراج محتوى الملف
*   بعد ذلك، قم بسحب مجلد 'ghost-#.#.#' ومن ثم اضافته في نافذة الـ Terminal, سوف يقوم بفتح نافذة جديدة متضمنه المسار الصحيح للملجد.
*   في نافذة الـ Terminal الجديدة اكتب `npm install --production` <span class="note">لاتنسى كتابة الشرطتيين</span>
*   عندما تنتهي عملية التثبيت، اكتب `npm start` لكي يبدأ Ghost في تحت وضع التطوير
*   في المتصفح، ادخل العنوان التالي <code class="path">127.0.0.1:2368</code> لمشاهدة عملية البدء في تنصيب مدونة Ghost
*   الآن غير العنوان لـ <code class="path">127.0.0.1:2368/ghost</code> وقم بإنشاء حساب الادمن لتسجيل الدخول لصفحة الادمن لـ Ghost
*   شاهد [usage docs](/usage) للإطلاع  على الخطوات مرئياً.

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-ghost-mac.gif)

