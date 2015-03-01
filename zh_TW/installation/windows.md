---
lang: zh_TW
layout: installation
meta_title: 如何在主機上安裝 Ghost - Ghost 繁體中文文件
meta_description: 這裡詳細敘述如何在本地或遠端環境中安裝 Ghost 部落格平台。
heading: 安裝 Ghost &amp; 開始嘗試
subheading: 開始創建新部落格的第一步
permalink: /zh_TW/installation/windows/
chapter: installation
section: windows
prev_section: mac
next_section: linux
---

# 安裝在 Windows 上<a id="install-windows"></a>

<p class="note"><strong>Note</strong> Ghost requires Node.js <strong>0.10.x</strong> (latest stable). We recommend Node.js <strong>0.10.30</strong> & npm <strong>1.4.21</strong>.</p>

### 安裝 Node

*   在 [http://nodejs.org](http://nodejs.org) 點擊 install, 並下載一個 '.msi' 的檔案。
*   點兩下所下載的檔案，然後開始安裝 Node 和 npm。
*   一直按下一步，直到出現 Node.js is installed 的訊息。

假如您遇到問題了，可以查閱 [這裡](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-node-win.gif "Install node on Windows").

### 下載 及 取得 Ghost

*   [在下載的頁面中](https://ghost.org/download/)，請點擊並下載最新的 zip 檔案。
*   點擊最新下載文件的下拉選單，然後選擇 '在檔案匣中顯示'。
*   當檔案匣打開時，請在剛下載的 zip 檔案上按右鍵並選擇 '全部解壓縮'。

假如您遇到問題了，可以查閱 [這裡](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-ghost-win.gif "Install Ghost on Windows Part 1").

### 安裝 並 執行 Ghost

*   在開始功能表中，找到 'Node.js' 並選擇 'Node.js Command Prompt'。
*   在 Node 命令列中，請先切換到剛才 Ghost 解壓縮的目錄。輸入: `cd Downloads/ghost-#.#.#` (請取代 `#` 字號為剛下載的 Ghost 版本)。
*   接著，在命令列中輸入 `npm install --production` <span class="note">注意是兩個 `-` 號</span>。
*   當完成 npm 的安裝，請輸入 `npm start` 來啟動在開發環境中的 Ghost。
*   開啟一個瀏覽器，並在導覽列中輸入：<code class="path">127.0.0.1:2368</code> 造訪您最新創建的 Ghost 部落格。
*   在導覽列中輸入：<code class="path">127.0.0.1:2368/ghost</code>，您就可以註冊管理員帳號並進入到 Ghost 的控制台。
*   請參考 [使用說明](/usage) 來查看接下來幾個步驟的指引。

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-ghost-win-2.gif "Install Ghost on Windows - Part 2")

