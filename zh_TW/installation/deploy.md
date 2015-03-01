---
lang: zh_TW
layout: installation
meta_title: 如何在主機上安裝 Ghost - Ghost 繁體中文文件
meta_description: 這裡詳細敘述如何在本地或遠端環境中安裝 Ghost 部落格平台。
heading: 安裝 Ghost &amp; 開始嘗試
subheading: 開始創建新部落格的第一步
permalink: /zh_TW/installation/deploy/
chapter: installation
section: deploy
prev_section: linux
next_section: upgrading
---

## 讓 Ghost 上線 <a id="deploy"></a>

準備好讓 Ghost 上線了嗎？太棒了！

第一個要做的決定就是，要透過安裝程序來安裝，還是自己手動安裝 Ghost 。

### 安裝程序安裝

目前有以下幾種簡單的安裝程序：

*   使用 [Bitnami](http://wiki.bitnami.com/Applications/BitNami_Ghost) 部署到雲端。
*   使用 [Rackspace deployments](http://developer.rackspace.com/blog/launch-ghost-with-rackspace-deployments.html) 來執行 Ghost。
*   搭建在 [DigitalOcean Droplet](https://www.digitalocean.com/community/articles/how-to-use-the-digitalocean-ghost-application) 。

### 手動安裝

你需要一個主機空間，或者可以安裝 [Node.js](http://nodejs.org) 的伺服器。
    例如一個雲端空間 ([Amazon EC2](http://aws.amazon.com/ec2/)， [DigitalOcean](http://www.digitalocean.com)， [Rackspace Cloud](http://www.rackspace.com/cloud/))， VPS ([Webfaction](https://www.webfaction.com/)， [Dreamhost](http://www.dreamhost.com/servers/vps/)) 或者其他有 SSH (terminal) 並且可以安裝 Node.js 的平台。目前有很多這種平台，而且也都很便宜。

目前還不能在 cPanel 之類的虛擬主機（通常用於 PHP）上運行。雖然有些（cPanel）支援 Ruby， 或許將來也會支援 Node.js，但這些（cPanel）主機也同樣不支援 Ghost。

<p>很不幸地，一些 Node.js 主機提供商與 Ghost 並不兼容，比如說 **Nodejitsu** 和 **Heroku** 。它們可以安裝 Ghost，但你的檔案會被刪除，所以你上傳的圖片和資料庫的內容都會消失。Heroku 支援 MySQL 資料庫，你可以使用它來彌補這個問題，但一些上傳的圖片仍然會消失。

以下鏈接包含了如何開始和運行的說明：

*   [Dreamhost](http://www.howtoinstallghost.com/how-to-install-ghost-on-dreamhost/) - from [howtoinstallghost.com](http://howtoinstallghost.com)
*   [DigitalOcean](http://ghosted.co/install-ghost-digitalocean/) - from [Corbett Barr](http://ghosted.co)
*   [Webfaction](http://www.howtoinstallghost.com/how-to-install-ghost-on-webfaction-hosting/) - from [howtoinstallghost.com](http://howtoinstallghost.com)
*   [Rackspace](http://ghost.pellegrom.me/installing-ghost-on-ubuntu/) (Ubuntu 13.04 + linux service) - from [Gilbert Pellegrom](http://ghost.pellegrom.me/)
*   [Ubuntu + nginx + forever](http://0v.org/installing-ghost-on-ubuntu-nginx-and-mysql/) - from [Gregg Housh](http://0v.org/)
*   ...check the [installation forum](https://en.ghost.org/forum/installation) for more guides ...

## 讓 Ghost 持續執行

前面提到說需使用 `npm start` 命令來啟動 Ghost。這是一個在開發模式下啟動和測試的好方法，但是用這種命令列啟動有個缺點，即當你結速終端機或者從 SSH 登出時，Ghost 就停止了。為了防止 Ghost 停止執行，有兩種方式可以解決這個問題。

### Forever ([https://npmjs.org/package/forever](https://npmjs.org/package/forever))

你可以使用 `forever` 在背景執行 Ghost 。`forever` 將會按照 Ghost 的配置，若 node 程式當掉了，還是會自動重啟 node。

*   使用指令 `npm install forever -g` 安裝 `forever` 
*   為了讓 `forever` 從 Ghost 安裝目錄執 行，輸入 `NODE_ENV=production forever start index.js`
*   使用指令 `forever stop index.js` 來停止 Ghost
*   使用指令 `forever list` 來檢查 Ghost 是否仍在執行

### Supervisor ([http://supervisord.org/](http://supervisord.org/))

流行的 Linux 發行版——例如 Fedora， Debian 和 Ubuntu，都包含一個 Supervisor 包裝：這是一個進程控制系統，允許在啟動的時候無需初始化腳本就能執行 Ghost。不像初始化腳本一樣，Supervisor 可以移植到不同的發行版和版本。

*   根據不同的 Linux 發行版 [安裝 Supervisor](http://supervisord.org/installing.html) 。如下所示：
    *   Debian/Ubuntu： `apt-get install supervisor`
    *   Fedora： `yum install supervisor`
    *   其他大多數發行版： `easy_install supervisor`
*   使用指令 `service supervisor start` 來確保 Supervisor 順利執行
*   為 Ghost 創建一個啟動腳本。通常是 `/etc/supervisor/conf.d/ghost.conf` ，例如：

    ```
    [program:ghost]
    command = node /path/to/ghost/index.js
    directory = /path/to/ghost
    user = ghost
    autostart = true
    autorestart = true
    stdout_logfile = /var/log/supervisor/ghost.log
    stderr_logfile = /var/log/supervisor/ghost_err.log
    environment = NODE_ENV="production"
    ```

*   使用 Supervisor 啟動 Ghost：`supervisorctl start ghost`
*   停止 Ghost： `supervisorctl stop ghost`

詳細內容請參閱 [Supervisor 文件](http://supervisord.org)。

### 初始化腳本

Linux 系統在啟動的時候會運行初始化腳本。這些腳本通常存在於 /etc/init.d 。為了讓 Ghost 一直運行下去甚至自動重啟，你可以設置一個初始化腳本來完成這個任務。以下的例子工作在 Ubuntu ，並且在 **Ubuntu 12.04** 下通過測試。

*   使用以下命令創建 /etc/init.d/ghost 文件：

    ```
    $ sudo curl https://raw.githubusercontent.com/TryGhost/Ghost-Config/master/init.d/ghost \
      -o /etc/init.d/ghost
    ```

*   使用 `nano /etc/init.d/ghost` 命令打開文件並檢查以下內容：
*   將 `GHOST_ROOT` 變數的值更換為你的 Ghost 安裝路徑
*   檢查 `DAEMON` 變數的值是否和 `which node` 的輸出值相同
*   這個初始化腳本將在你的系統上以它自己的 Ghost 用戶和群組執行，使用以下命令來創建：

    ```
    $ sudo useradd -r ghost -U
    ```
    
*   確保 Ghost 用戶可以訪問安裝目錄：

    ```
    $ sudo chown -R ghost:ghost /你的 Ghost 安裝目錄
    ```

*   使用以下命令給這個初始化腳本加上可執行權限：

    ```
    $ sudo chmod 755 /etc/init.d/ghost
    ```

*   現在你可以使用以下的命令來控制 Ghost ：

    ```
    $ sudo service ghost start
    $ sudo service ghost stop
    $ sudo service ghost restart
    $ sudo service ghost status
    ```

*   為了讓 Ghost 能在系統啟動時同時啟動，我們必須要將剛剛創建的初始化腳本註冊為為啟動項。
    執行以下兩個命令：

    ```
    $ sudo update-rc.d ghost defaults
    $ sudo update-rc.d ghost enable
    ```
    
*   為了保證你的用戶可以更改 Ghost 目錄裏的文件和預設的 config.js ，需要將你加入 ghost 群組中：
    ```
    $ sudo adduser 你的用戶名 ghost
    ```

*   如果你現在重新啟動伺服器，Ghost 應該會自動運行。

## 配置 Ghost 域名

如果你已經讓 Ghost 持續執行了，你也可以設置一個代理服務器讓你的部落格可以使用域名訪問。以下的範例假設你的操作系統是 **Ubuntu 12.04** ，使用 **Nginx** 作為你的 Web 伺服務，已經使用以上任意一種方法讓 Ghost 在後台運行。

*   安裝 nginx

    ```
    $ sudo apt-get install nginx
    ```
    <span class="note">這個命令將會安裝 nginx 並且設定好所有必需的目錄和基礎配置。</span>
    
*   配置你的站點

    *   在 `/etc/nginx/sites-available` 創建一個 `ghost.conf` 文件
    *   使用文本編輯器打開這個文件 (e.g. `sudo nano /etc/nginx/sites-available/ghost.conf`)
        把以下內容複製到這個文件

        ```
        server {
            listen 80;
            server_name example.com;

            location / {
                proxy_set_header   X-Real-IP $remote_addr;
                proxy_set_header   Host      $http_host;
                proxy_pass         http://127.0.0.1:2368;
            }
        }

        ```

    *   將 `server_name` 的值改為你的域名
    *   把你的配置文件建立捷徑到 `sites-enabled` 資料夾下:

    ```
    $ sudo ln -s /etc/nginx/sites-available/ghost.conf /etc/nginx/sites-enabled/ghost.conf
    ```

    *   重啟 nginx

    ```
    $ sudo service nginx restart
    ```
