---
lang: zh_TW
layout: installation
meta_title: How to Install Ghost on Your Server - Ghost Docs
meta_description: Everything you need to get the Ghost blogging platform up and running on your local or remote environement.
heading: Installing Ghost &amp; Getting Started
subheading: The first steps to setting up your new blog for the first time.
chapter: installation
next_section: mac
---

## 概述 <a id="overview"></a>

Ghost 的文件尚不完整，它不斷地在被更新以及改進。當您閱讀此文件遇到困難，請通知我們。

Ghost 是用 [Node.js](http://nodejs.org) 打造的，需要 Node.js `0.10.*` (最新穩定版)以上版本。

請先在您的電腦安裝 Node.js，然後就可以很容易地在本地端安裝 Ghost。

### 什麼是 Node.js 呢？

[Node.js](http://nodejs.org) 作為一個先進的平台，為的是打造速度快、可擴充、高效率的網站應用程式。
	在過去的 20 年，網站已經從靜態頁面進步到能處理許多複雜資訊的網路應用程式，例如：Gmail 和 facebook。
	JavaScript 是實現這個進展的程式語言。

[Node.js](http://nodejs.org) 讓我們能夠用 JavaScript 來寫出伺服器端的應用程式。以前，JavaScript 只會用在瀏覽器，而且是個次等的程式語言；在伺服器端需要用別種程式語言來撰寫。只用一種程式語言來開發網路應用程式會有很多好處，這也讓前端開發人員能更快上手 Node.js。

[Node.js](http://nodejs.org) 達成這個目的的方法是將 Google's Chrome 的 JavaScript 引擎(V8)打包成能夠跨平台運行。也就是說，您非常容易就可以下載 Ghost 並安裝在您的電腦上。
	接下來的章節中將詳細說明如何將 Ghost 安裝在本地的 [Mac]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/mac/),  [Windows]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/windows/) or [Linux]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/linux/) 或是佈署在 [伺服器或虛擬空間]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/deploy)。

### 開始吧！

如果您不想按照以下步驟手動安裝 Node.js 和 Ghost，已經有善心人士在 [BitNami](http://bitnami.com/) 做好各種平台的 [Ghost installers](http://bitnami.com/stack/ghost)。 

我想把 Ghost 安裝在：

<div class="text-center install-ghost">
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/mac/" class="btn btn-success btn-large">Mac</a>
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/windows/" class="btn btn-success btn-large">Windows</a>
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/linux/" class="btn btn-success btn-large">Linux</a>
</div>

假如您已經決定在伺服器或虛擬空間上佈署 Ghost，那真是太好了！接下來的文件會帶領你透過各種方式來佈署 Ghost，無論您想要手動安裝，或是使用一鍵完成。

<div class="text-center install-ghost">
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/deploy/" class="btn btn-success btn-large">讓 Ghost 上線</a>
</div>

Ghost 是一個新品牌，整個團隊正如火如荼地在釋出新的特色。假如您想使用最新版的 Ghost，請密切注意我們的 [升級文件](/installation/upgrading/)。
	假如您卡住了，請先參考 [troubleshooting guide]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/troubleshooting/)，假如它不管用，請在 [Ghost 論壇](http://ghost.org/forum)回應您的問題，會有 Ghost 的核心成員以及社群夥伴來協助您排除困難。

