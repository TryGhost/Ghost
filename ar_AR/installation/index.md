---
<div dir="RTL">
lang: ar_AR

layout: تنصيب

meta_title: كيفية تثبيت ڨوست على الخادم الخاص بك - دليل ڨوست

meta_description: كل ما تحتاجه للحصول على منصة التدوين ڨوست وتشغيلها على البيئة المحلية أو عن بعد.

heading: تثبيت ڨوست &amp; بدء العمل

subheading: الخطوات الأولى لإنشاء مدونتك للمرة الأولى.

chapter: تركيب

next_section: ماك
---

## نظرة عامة <a id="overview"></a>

دليل ڨوست هو عمل في طور التقدم يتم تحديثه و تطويره بانتظام إذا واجهتك مشكلة أو لديك اقتراحات لتحسينه، اتصل بنا.

ڨوست مبني على [Node.js](http://nodejs.org),و يتطلب اصدار `*.0.10` (اخر اصدار معتمد).

تشغيل ڨوست محليا على جهاز الكمبيوتر الخاص شيئ متقدم لكن يجب أولا تنصيب Node.js .

### ماهو Node.js؟

[Node.js](http://nodejs.org) عبارة عن منصة حديثة لبناء سريع و برمجة بكفاءة لتطبيقات الويب و هي قابلة للتطوير.
    على مدى السنوات العشرين الماضية، تطورت الشبكة من مجموعة من صفحات ثابتة إلى منصة قادرة على دعم تطبيقات الويب المعقدة مثل Gmail والفيس بوك.
      جافا سكريبت هي لغة البرمجة التي التي تمكننا من ذالك.

[Node.js](http://nodejs.org) يوفر لنا القدرة على كتابة سكريبت على السرفر. في الماضي قد لا توجد إلا جافا سكريبت في المتصفح، وبلغة ثانية من لغات برمجة، مثل PHP، وكان المطلوب القيام بالبرمجة  بجانب السرفر. والحصول على تطبيق ويب يتكون من لغة برمجة واحدة ذات فائدة عظيمة، وهذا أيضا يجعل Node.js موجوداً للمطورين الذين قد ظلوا تقليديا بجانب العميل.

الطريقة التي تجعل [Node.js](http://nodejs.org) من ذالك ممكنا, هي استخلاص  نواة جافا سكريبت و جعلها قابلة للتنصيب في أي مكان.  هذا يعني أنه يمكنك تنصيب ڨوست على جهازك و تجربته بكل سلاسة.
    الاقسام التالية تبين كيفية تثبيت قوست محليا [Mac]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/mac/),  [Windows]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/windows/) أو [Linux]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/linux/) أو بدلا من ذالك تساعدكا على نشر قوست في [server or hosting]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/deploy) account.

### البداية

إذا كنت غير ملم بتنصيب Node.js أو ڨوست يدويا , أصدقاءنا في [BitNami](http://bitnami.com/) "طوّرو [Ghost installers](http://bitnami.com/stack/ghost) لكل الانظمة.

أريد تنصيب ڨوست في

<div class="text-center install-ghost">
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/mac/" class="btn btn-success btn-large">Mac</a>
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/windows/" class="btn btn-success btn-large">Windows</a>
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/linux/" class="btn btn-success btn-large">Linux</a>
</div>

إذا كنت قد قررت تثبيت ڨوست على الخادم الخاص بك أو حساب استضافة ، هذا شي جيد! الوثائق التالية التي سوف تيسر لكم  العمل من خلال الخيارات المختلفة لنشر ڨوست، من الأجهزة اليدوية، للتركيب بنقرة واحدة.

<div class="text-center install-ghost">
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/deploy/" class="btn btn-success btn-large">Get Ghost Live</a>
</div>

تذكر أن ڨوست مازال في طريق البداية، والفريق يعمل بجد لتوفير ميزات بوتيرة سلسة. إذا كنت بحاجة إلى شبح الترقية إلى أحدث إصدار، تابع هنا [دليل الترقية](/installation/upgrading/).
    لو حصل خطأ ما فراجع [دليل الاخطاء]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/troubleshooting/), واذا لم تجد حل, راجعنا في المنتدى [Ghost forum](http://ghost.org/forum)حيث أعظاء الفريق و اعضاء آخرين يمكنهم المساعدة.

