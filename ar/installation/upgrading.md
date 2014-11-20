---
lang: ar
layout: installation
meta_title: How to Install Ghost on Your Server - Ghost Docs
meta_description: Everything you need to get the Ghost blogging platform up and running on your local or remote environement.
heading: تنصيب Ghost والبداية
subheading: الخطوة الآولى لإعداد مدونتك الجديدة
permalink: /ar/installation/upgrading/
chapter: installation
section: upgrading
prev_section: deploy
next_section: troubleshooting
---

# تحديث Ghost <a id="upgrade"></a>

تحديث Ghost هي عملية مباشرة جداً.

هناك عدة طرق مختلفة يمكنك اتباع اي منها. فيما يلي وصف ما يجب عمله، ومن ثم شرح خطوة بخطوة لكل ما يجب فعله، من النقر على الملفات [point-and-click style](#how-to) و من سطر الاوامر [command line](#cli)، بحيث تكون حراً في اختيار الطريقة التي هي الأكثر ارتياحا.

<p class="note"><strong>تنبية!</strong> دائماً قم بعمل نسخة احتياطية. اقرأ التالي <a href="#backing-up">backup instructions</a> اولاً!</p>

## نظرة عامة

<img src="https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/folder-structure.png" style="float:left" />

بمجرد تركيب Ghost، بنية المجلد مماثلة لتلك التي تظهر على اليسار. يوجد مجلديين رئيسيين <code class="path">content</code> و <code class="path">core</code>, بالإضافة إلى بعض الملفات الاخرى في الجذر

تحديث Ghost هي مسألة استبدال الملفات القديمة مع ملفات جديدة، `npm install` وهي الآلية التي تعمل إعادة تثبيت لتحديث المجلد <code class="path">node_modules</code> ثم إعادة تشغيل Ghost لتجعلها فعالة.

تذكر، Ghost افتراضياً يقوم بجمع البيانات الخاصة بك، والمواضيع، والصور وغيرها في مجلد <code class="path">content</code> لذلك احرص على الحفاظ عليه آمناً! استبدال فقط الملفات في <code class="path">core</code> والجذرية، وسوف تكون على ما يرام.

## عمل نسخة احتياطية <a id="backing-up"></a>

<img src="https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/export.png" style="float:right" />

*   لعمل نسخة احتياطية لجميع بياناتك من قاعدة البيانات، قم بتسجيل الدخول الى Ghost واذهب للرابط التالي <code class="path">/ghost/debug/</code>. اضغط على ايقونة export لتحميل ملف الـ JSON واللذي يحتوي علي كل بياناتك. وهنا قم بحفظ النسخة الاحتياطية
*   ولعمل نسخة احتياطية للصور والثيم الخاص بك، تحتاج لنسخ الملفات الموجوده في <code class="path">content/themes</code> and <code class="path">content/images</code>

<p class="note"><strong>تنبية:</strong>  بالامكان اخذ نسخه احتياطية من قاعدة بياناتك من مجلد <code class="path">content/data</code> but <strong>be warned</strong> ولكن انتبه يجب ان لاتفعل ذلك و Ghost في مرحلة التشغيل. يجب ايقافه اولاً.</p>


## كيفية التحديث <a id="how-to"></a>

كيف يمكن عمل تحديث على جهازك الشخصي

<p class="warn"><strong>تحذير:</strong>لاتقم بعملية النسخ واللصق لكامل مجلد Ghost، ولاتقم باستبدال اذا كنت تستخدم FTP اختر MEREGE بدالاً من ذلك.</p>

*   قم بتحميل اخر نسخة من Ghost من الموقع [Ghost.org](http://ghost.org/download/)
*   قم باستخراج الملف المضغوط لمكان مؤقت
*   قم بنسخ جميع الملفات من المجلد اللذي قمت بتحميلة، وهذا يحتوي على الملفات التالية: index.js, package.json, Gruntfile.js, config.example.js, license, readme.
*   الان قم بحذف مجلد <code class="path">core</code> القديم كاملاً، ومن ثم ضع المجلد الجديد <code class="path">core</code> مكانه.
*   في حال كان هناك تحديث لمجلد الثيم Casper (الثيم الافتراضي), قم بحذف المجلد القديم من <code class="path">content/themes/casper</code> وضع الجديد مكانه
*   قم بعمل `npm install --production`
*   اخيراً قم بإعادة تشغيل Ghost لتتم عملية التحديث

## من خلال سطر الأوامر <a id="cli"></a>

<p class="note"><strong>تنبية!</strong> دائماً قم بعمل نسخة احتياطية. اقرأ التالي <a href="#backing-up">backup instructions</a> اولاً!</p>

### من خلال سطر الأوامر على الماك <a id="cli-mac"></a>

الصورة المتحركة بالأسفل توضح خطوات تحديث Ghost، وذلك بعد تحميل الملف المضغوط في <code class="path">~/Downloads</code> Ghost تم تثبيته في <code class="path">~/ghost</code> 

<span class="note">**تنبية:** `~` تعني مسار المجلد الرئيسي للمستخدم في الماك واللينكس</span>

![Upgrade ghost](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/mac-update.gif)

الخطوات كما في الصورة المتحركة:

*   <code class="path">cd ~/Downloads</code> - تغيير مسار لمجلد التحميل حيث تم حفظ اخر نسخة من Ghost
*   `unzip ghost-0.4.0.zip -d ghost-0.4.0` - فك ضغط مجلد Ghost <code class="path">ghost-0.4.0</code>
*   <code class="path">cd ghost-0.4.0</code> - تغيير المسار لـ <code class="path">ghost-0.4.0</code>
*   `ls` - عرض كل الملفات والمجلدات داخل المجلد
*   `cp *.js *.json *.md LICENSE ~/ghost` - نسخ كل ملفات .md .js .txt .json من هذا المسار الى <code class="path">~/ghost</code>
*   `rm -rf ~/ghost/core` - حذف المجلد القديم <code class="path">core</code>
*   `cp -R core ~/ghost` - نسخ مجلد <code class="path">core</code> وكل محتوياته لـ <code class="path">~/ghost</code>
*   `cp -R content/themes/casper ~/ghost/content/themes` - نسخ مجلد <code class="path">casper</code> وكل محتوياته لـ <code class="path">~/ghost/content/themes</code>
*   `cd ~/ghost` - تغيير المسار الى مجلد <code class="path">~/ghost</code>
*   `npm install --production` - تثبيت Ghost
*   `npm start` - تشغيل Ghost

### Command line only on linux servers <a id="cli-server"></a>

*   First you'll need to find out the URL of the latest Ghost version. It should be something like `http://ghost.org/zip/ghost-latest.zip`.
*   Fetch the zip file with `wget http://ghost.org/zip/ghost-latest.zip` (or whatever the URL for the latest Ghost version is).
*   Delete the old core directory from your install
*   Unzip the archive with `unzip -uo ghost-0.4.*.zip -d path-to-your-ghost-install`
*   Run `npm install --production` to get any new dependencies
*   Finally, restart Ghost so that the changes will take effect

**Additionally**, [howtoinstallghost.com](http://www.howtoinstallghost.com/how-to-update-ghost/) also has instructions for upgrading Ghost on linux servers.

### How to update a DigitalOcean Droplet <a id="digitalocean"></a>

<p class="note"><strong>Back-it-up!</strong> Always perform a backup before upgrading. Read the <a href="#backing-up">backup instructions</a> first!</p>

*   First you'll need to find out the URL of the latest Ghost version. It should be something like `http://ghost.org/zip/ghost-latest.zip`.
*   Once you've got the URL for the latest version, in your Droplet console type `cd /var/www/` to change directory to where the Ghost codebase lives.
*   Next, type `wget http://ghost.org/zip/ghost-latest.zip` (or whatever the URL for the latest Ghost version is).
*   Remove the old core directory, `rm -rf ghost/core`
*   Unzip the archive with `unzip -uo ghost-latest.zip -d ghost`
*   Make sure all of the files have the right permissions with `chown -R ghost:ghost ghost/*`
*   Change into the <code class="path">ghost</code> directory with `cd ghost`
*   Run `npm install --production` to get any new dependencies
*   Finally, restart Ghost so that the changes take effect using `service ghost restart` (this can take a little while)


## How to upgrade Node.js to the latest version <a id="upgrading-node"></a>

If you originally installed Node.js from the [Node.js](nodejs.org) website, you can upgrade Node.js to the latest version by downloading and running the latest installer. This will replace your current version with the new version.

If you are on Ubuntu, or another linux distribution which uses `apt-get`, the command to upgrade node is the same as to install: `sudo apt-get install nodejs`.

You do **not** need to restart the server or Ghost.
