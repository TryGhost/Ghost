---
<div dir="RTL">
lang: ar_AR
layout: التشغيل السريع
meta_title: قوست التشغيل السريع
heading: قوست التشغيل السريع
subheading: العمل مع قوست و تشغيله.
chapter: التشغيل السريع
section: التشغيل السريع
---

# نظرة عامة <a id="overview"></a>

ويهدف دليل التشغيل السريع إلى الحصول على قوست وتشغيله و يناسب أولئك  الذين هم بالفعل على دراية [Node](http://nodejs.org), أو شي مماثل مثل  ruby on rails. إذا كنت جديد من المستحسن الاطلاع على [دليل التنصيب](/installation.html).

## لتشغيل قوست محليا <a id="ghost-local"></a>

قوست يحتاج إلى node `0.10.*` (آخر إصدار مستقر ).

إذا لم تتحصل عليه, إذهب إلى موقع <http://nodejs.org> و حّمل آحر إصدار Node.js. سيتم تنصيب Node و  npm.

لمستعملي لينكس, بدلا من تثبيت من .tar.gz archive, قد ترغب في [install from a package manager](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager)

حمل آخر إصدار قوست من [Ghost.org](http://ghost.org). فك الأرشيف إلى مجلد حيث  ترغب في تشغيل قوست - في أي مكان!

Fire up your terminal (mac/linux) or command prompt (windows) and navigate to the root directory of your unpacked Ghost archive (where package.json lives).

لتثبيت قوست, أكتب `npm install --production`

<!--<h2 id="customise">Customise & Configure Ghost</h2>

<h2 id="ghost-deploy">Deploy Ghost</h2>

<ol>
    <li>In the Terminal / Command Prompt, type <code>npm start</code></li>
    <li><p>This will have launched your Ghost blog, visit one  <a href="http://localhost:2368/">http://localhost:2368/</a> to see</p></li>
</ol>
-->