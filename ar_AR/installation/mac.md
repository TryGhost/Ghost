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

لتنصيب Node.js و ڨوست on your mac you'll need an open terminal window. You can get one by opening spotlight and typing "Terminal".

### Install Node

*   On [http://nodejs.org](http://nodejs.org) press install, a '.pkg' file will be downloaded
*   Click on the download to open the installer, this is going to install both node and npm.
*   Click through the installer, finally entering your password and clicking 'install software'.
*   Once the installer is complete, go into your open Terminal window and type `echo $PATH` to check that '/usr/local/bin/' is in your path.

<p class="note"><strong>Note:</strong> If '/usr/local/bin' does not appear in your $PATH, see the <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/troubleshooting#export-path">troubleshooting tips</a> to find out how to add it</p>

If you get stuck you can watch the whole [process in action here](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-node-mac.gif "Install Node on Mac").

### Install and Run Ghost

*   Log in to [http://ghost.org](http://ghost.org), and then click the blue 'Download Ghost Source Code' button.
*   On the downloads page, press the button to download the latest zip file.
*   Click on the arrow next to the newly downloaded file, and choose 'show in finder'.
*   In finder, double-click on the downloaded zip file to extract it.
*   Next, grab the newly extracted 'ghost-#.#.#' folder and drag it onto the tab bar of your open terminal window, this will make a new terminal tab which is open at the correct location.
*   In the new terminal tab type `npm install --production` <span class="note">note the two dashes</span>
*   When npm is finished installing, type `npm start` to start Ghost in development mode
*   In a browser, navigate to <code class="path">127.0.0.1:2368</code> to see your newly setup Ghost blog
*   Change the url to <code class="path">127.0.0.1:2368/ghost</code> and create your admin user to login to the Ghost admin.
*   See the [usage docs](/usage) for instructions on the next steps

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-ghost-mac.gif)

