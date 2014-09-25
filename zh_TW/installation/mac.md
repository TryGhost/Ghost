---
lang: zh_TW
layout: installation
meta_title: 如何在主機上安裝 Ghost - Ghost 繁體中文文件
meta_description: 這裡詳細敘述如何在本地或遠端環境中安裝 Ghost 部落格平台。
heading: 安裝 Ghost &amp; 開始嘗試
subheading: 開始創建新部落格的第一步
permalink: /zh_TW/installation/mac/
chapter: installation
section: mac
prev_section: installation
next_section: windows
---


# 安裝在 Mac 上 <a id="install-mac"></a>

<p class="note"><strong>Note</strong> Ghost requires Node.js <strong>0.10.x</strong> (latest stable). We recommend Node.js <strong>0.10.30</strong> & npm <strong>1.4.21</strong>.</p>

為了在你的 Mac 上安裝 Node.js 和 Ghost，首先你需要先打開一個 Terminal 終端機視窗。你可以透過 Spotlight 輸入 "Terminal" 來打開一個終端機視窗。

### 安裝 Node

*   在 [http://nodejs.org](http://nodejs.org) 點擊 Install, 將會下載一個 '.pkg' 檔案。
*   打開下載好的安裝程式可以同時安裝 node 和 npm。
*   點擊安裝程式、輸入你的密碼並按下「安裝軟體」。
*   安裝程序完成後，在終端機視窗中輸入 `echo $PATH` 來檢查 '/usr/local/bin/' 是否已經在你的環境變數之中。

<p class="note"><strong>注意：</strong> 如果 '/usr/local/bin' 沒有出現在你的 $PATH 環境變數之中, 請到 <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/troubleshooting#export-path">常見問題排除</a> 來查看如何加入它。</p>

如果你遇到了困難，可以參考 [這裡](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-node-mac.gif "Install Node on Mac") 來嘗試排除問題。

### 安裝並啟動 Ghost

*   在 [下載頁面](https://ghost.org/download/), 下載最新的 zip 壓縮檔。
*   按下最新下載檔案右邊的箭頭，選擇「在 Finder 中顯示」。
*   在 Finder 中點兩下剛下載的 zip 檔案來解開壓縮。
*   然後，將剛解開壓縮的「ghost-#.#.#」資料夾拖拉到終端機視窗的標簽頁，這樣將會開啟一個新的標簽頁並進入正確的檔案路徑。
*   在這個新開啟的終端機標簽頁上輸入 `npm install --production` <span class="note">請注意是兩個 `-` 符號</span>
*  當 npm 安裝完成之後，輸入 `npm start` 來啟動 Ghost 的開發模式。
*   在瀏覽器的導覽列中輸入 <code class="path">127.0.0.1:2368</code> 就能看到剛啟動的 Ghost 部落格。
*   在導覽列中輸入：<code class="path">127.0.0.1:2368/ghost</code>，您就可以註冊管理員帳號並進入到 Ghost 的控制台。
*   請參考 [使用說明](/usage) 來查看接下來幾個步驟的指引。

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-ghost-mac.gif)

