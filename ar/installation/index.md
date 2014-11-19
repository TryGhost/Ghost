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

<p class="note"><strong>تنبية</strong> Ghost يتطلب Node.js اصدار <strong dir="ltr">0.10.x</strong> (آخر إصدار). ننصح بـ Node.js <strong>0.10.30</strong> و npm <strong>1.4.21</strong>.</p>

الشرح الموجود عن Ghost يتم تحديثه و تعديلة بشكل مستمر. لذا في حال واجه اي مشكلة او كان لديك اي ملاحظة لتطويرة فلاتتردد بالتواصل معنا.

Ghost تم بناءه بواسطة الـ [Node.js](http://nodejs.org), ويتطلب وجود الاصدار `*.10.0` (احدث إصدار مستقر).

الطريقة لكي يعمل Ghost على جهازك هي عملية واضحه وسهلة، ولكن لابد ان تكون قمت بتنصيب Node.js اولاً.

### ماهو الـ Node.js?

[Node.js](http://nodejs.org) عبارة عن منصة حديثه لبناء تطبيقات ويب سريعه، عملية و قابلة للتطوير. في السنوات العشرين الماضية، المواقع الالكترونية تطورت من محتوى ثابت إلى منصات قادرة على دعم تطبيقات الويب المعقدة كا Gmail و facebook مثلاً.
الـ JavaScript هي اللغة التي مكنت من كل هذا التطور.


[Node.js](http://nodejs.org) أتاح لنا كتابة الاكود البرمجية على الخادم. في الماضي الـ JavaScript تعمل فقط على المتصفح، ولغة ثانية مختلفه، مثل ال PHP, كانت مطلوبة لكي تقوم بمهام الخادم. ان يكون هناك تطبيق ويب مبني باستخدام لغة واحدة هي ميزة كبيرة، وهذا يجعل الـ Node.js في متناول المطورين اللذين يرغبون بالبرمجه على الخادم.

الطريقة التي تمكن الـ [Node.js](http://nodejs.org) من عمل ذلك، هم من خلال تغليف محرك JavaScript من متصفح Google's Chrome ويحعلة قابل للتثبيت من اي مكان. وهذا يعني انه لالامكان الحصول على Ghost وتثبيته على جهازك لتجربته بكل سهوله وبسرعة.
في الاقاسم القادمة شرح في كيفية تثبيت Ghost على جهاز [Mac]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/mac/),  [Windows]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/windows/) او [Linux]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/linux/) او كاخيار بديل بالامكان ان نساعدك بالحصول على Ghost ونشره على حساب [server or hosting]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/deploy).

### البداية

اذا كنت لاتفضل اتباع إرشادات تنصيب وتثبيت Node.js و Ghost يدوياً، بإمكانك استخدام أداة التثبيت [Ghost installers](http://bitnami.com/stack/ghost) من موقع [BitNami](http://bitnami.com/) لجميع أنظمة التشغيل المعروفة.

أرغب بتثبيت Ghost على جهاز:

<div class="text-center install-ghost">
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/mac/" class="btn btn-success btn-large">الماك</a>
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/windows/" class="btn btn-success btn-large">ويندوز</a>
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/linux/" class="btn btn-success btn-large">لينكس</a>
</div>

إذا كنت قد قررت نشر Ghost على الخادم الخاص بك أو حساب استضافة، فهذا خبر جيد! التعليمات القادمة فيها شرح لعدة خيارات لنشر او إستضافة Ghost، من الإعدادات اليدوية الى التثبيت بنقرة واحدة.

<div class="text-center install-ghost">
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/deploy/" class="btn btn-success btn-large">الحصول على Ghost</a>
</div>

تذكر ان Ghost عبارة عن منصة حديثة، وفريق العمل يعمل بجد لتقديم ميزات اضافية على خطوات مختلفة. اذا كنت تريد ترقسة Ghost لآخر إصدار، فابإمكانك اتباع التعليمات من هنا [upgrading documentation](/installation/upgrading/).
في حال واجهة مشكلة، اطلع على [troubleshooting guide]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/troubleshooting/)، او اذا كان هذا لم يساعدك ، فالرجاء التواصل معنا من خلال المنتدى [Ghost forum](http://ghost.org/forum) حيث الموظفين ولأعضاء على اتم الاستعداد لمساعدتك.