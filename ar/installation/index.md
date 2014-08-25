---
lang: ar
layout: installation
meta_title: How to Install Ghost on Your Server - Ghost Docs
meta_description: Everything you need to get the Ghost blogging platform up and running on your local or remote environement.
heading: Installing Ghost &amp; Getting Started
subheading: The first steps to setting up your new blog for the first time.
chapter: installation
next_section: mac
---

## نظرة عامة <a id="overview"></a>

التوضيح والشرح ل Ghost .هو مازال تحت التطوير والتعديل، لذا في حال واجهة اي مشكلة أو كان لديك ملاحظات أو اقتراحات، فضلاً تواصل معنا 

Ghost تم بناءه وتطويره باستخدام [Node.js](http://nodejs.org)، وتتطلب وجود النسخة رقم `0.10.*` أو الأحدث.

تنصيب Ghost في جهاز الكمبيوتر عبارة عن عملية بسيطة جداً ووتطلب فقط تنصيب Node.js اولاً.

### ماهو Node.js?

[Node.js](http://nodejs.org) هو عبارة عن منصة حديثة لبناء تطبيقات الويب بشكل سريع وفعال.
خلال العشرين سنة الماضية، تطورت المواقع الإلكترونية من مجوعة صفحات ثابتة إلي منصات قادرة على دعم تطبيقات الويب المعقدة ومن الامثلة على هذه التطبيقات: الجيميل والفيس بوك.
هنا تأتي لغة JavaScript وهي اللغة التي مكنت من هذا التقدم في تطبيقات الويب

[Node.js](http://nodejs.org) توفر لنا قدرة البرمجة على الخادم او السيرفر. في الماضي الجافا سكريبت كانت موجودة فقط في جهة المتصفح اي من جهة المستخدم، ولذا كان يجب عليك استخدام لغة اخرى مثل PHP للتعامل مع السيرفر. لذا وجود لغة واحدة تستخدمها لبرمجة تطبيق واحد بشكل كامل هي مكسب كبير، وهذا ماجعل Node.js في متناول المطورين بشكل بسيط. 

[Node.js](http://nodejs.org) يجعل هذا ممكناً عن طريق احتواء محرك الجافا سكريبت من متصفح Google's Chrome ويجعلة قابل للتثبيت اي مكان. وهذا يعني إمكانية تثيبت Ghost في جهاز الكمبيوتر الشخصي لتجربتها بشكل سريع وسهل.
    الاقسام التالية توضح طريقة تثبيت Ghost في جهازك الشخصي للـ [Mac]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/mac/),  [Windows]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/windows/) او [Linux]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/linux/) او بالامكان مساعدتك في رفع Ghost على [server or hosting]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/deploy) account.

### البداية

اذا كنت لاتفضل اتباع ارشادات تثبت Node.js و Ghost على جهازك، بأمكانك استخدام [BitNami](http://bitnami.com/) للتثبيت بواسطة [Ghost installers](http://bitnami.com/stack/ghost) لجميع المنصات الرئيسية.

ارغب بتثبيت Ghost على:

<div class="text-center install-ghost">
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/mac/" class="btn btn-success btn-large">Mac</a>
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/windows/" class="btn btn-success btn-large">Windows</a>
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/linux/" class="btn btn-success btn-large">Linux</a>
</div>

اذا كنت قررت رفع Ghost على سيرفر خاص بك او في حساب استضافة، فالخطوات التالية سوف تساعدك على اتباع الطريقة المناسبة لك من الطريقة اليدوية الى التثبيت بنقرة واحدة.

<div class="text-center install-ghost">
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/deploy/" class="btn btn-success btn-large">Get Ghost Live</a>
</div>

تذكر ان Ghost هي منصة حديثة، وفريق Ghost يعملون بجد لتقديم الميزات الأفضل. فإذا كنت ترغب في ترقية Ghost لآخر إصدار فالرجاء اتباع الخطوات هنا [upgrading documentation](/installation/upgrading/).
    واذا واجهة اي مشكله، اضغط هنا [troubleshooting guide]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/troubleshooting/), واذا لم تجد ضالتك، تواصل معنا هنا [Ghost forum](http://ghost.org/forum) حيث اعضاء وفريق Ghost على اتم الاستعداد لمساعدتك.

