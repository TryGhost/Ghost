---
lang: ja
layout: installation
meta_title: Ghostをインストールするには - Ghost日本語ガイド
meta_description: ブログプラットフォーム「Ghost」をローカルやリモート環境でセットアップするための手順です。
heading: Ghostのインストール方法
subheading: Ghostで新しいブログを作成するための手順です。
permalink: /ja/installation/deploy/
chapter: installation
section: deploy
prev_section: linux
next_section: upgrading
---

## Ghostをデプロイする方法 <a id="deploy"></a>

Ghostをデプロイする方法はふたつあります。インストーラーを使うか、手動でインストールとセットアップを行う方法です。

### インストーラーを使うには

Ghostのインストーラーを用意しているホスティングサービスは以下の通りです。

*   [Bitnami](http://wiki.bitnami.com/Applications/BitNami_Ghost)
*   [Rackspace deployments](http://developer.rackspace.com/blog/launch-ghost-with-rackspace-deployments.html)
*   [DigitalOcean Droplet](https://www.digitalocean.com/community/articles/how-to-use-the-digitalocean-ghost-application)

### 手動でGhostをセットアップするには

手動セットアップには[Node.js](http://nodejs.org)があらかじめ導入されている、またはNode.jsをインストールできるホスティングサービスが必要です。
    [Amazon EC2](http://aws.amazon.com/ec2/)、[DigitalOcean](http://www.digitalocean.com)、[Rackspace Cloud](http://www.rackspace.com/cloud/)などのクラウドサービスや、[Webfaction](https://www.webfaction.com/)、[Dreamhost](http://www.dreamhost.com/servers/vps/)などのVPSなど、SSHアクセスが可能で、Node.jsをインストールすることができるサービスなら問題ありません。他にもコストがかからないホスティングサービスは多々あります。

PHPで作ったサイトをcPanelで管理するタイプのホスティングサービスは現在サポートされていません。ただ、Rubyをサポートし始めたものもあるので、Rubyと共通点が多いNodeがサポートされる日が来ないとも限りません。

残念ながら、Node専用のクラウドホスティングサービス(例:**Nodejitsu**、**Heroku**)はGhostと**互換性がありません**。動かすことは可能ですが、サーバー上にファイルが保存できませんので、アップロードした画像やデータベースファイルがすぐ消されてしまいます。HerokuはMySQLをサポートしていますが、それでも画像の問題は解決できません。

それぞれのホスティングサービスに手動でGhostをセットアップするには、以下のリンクを参考にしてください:

*   [Dreamhost](http://www.howtoinstallghost.com/how-to-install-ghost-on-dreamhost/) - [howtoinstallghost.com](http://howtoinstallghost.com)作成
*   [DigitalOcean](http://ghosted.co/install-ghost-digitalocean/) - [Corbett Barr](http://ghosted.co)作成
*   [Webfaction](http://www.howtoinstallghost.com/how-to-install-ghost-on-webfaction-hosting/) - [howtoinstallghost.com](http://howtoinstallghost.com)作成
*   [Rackspace](http://ghost.pellegrom.me/installing-ghost-on-ubuntu/) (Ubuntu 13.04 + linuxサービス) - [Gilbert Pellegrom](http://ghost.pellegrom.me/)作成
*   [Ubuntu + nginx + forever](http://0v.org/installing-ghost-on-ubuntu-nginx-and-mysql/) - [Gregg Housh](http://0v.org/)作成
*   その他のサービスでの手順は[フォーラム内の「Installation」](https://en.ghost.org/forum/installation)をご覧ください。

## Ghostを終了しないようにするには

以前のセクションで、Ghostの実行方法として`npm start`を紹介しました。これは開発環境やテスト環境では十分ですが、本番環境では不十分です。ターミナルウインドウを閉じたり、SSHからログアウトしてしまうとGhostが終了してしまうからです。これを解決するには、Ghostをサービスとして実行する必要があります。その方法を何通りか紹介します。


### Foreverを使う場合 ([https://npmjs.org/package/forever](https://npmjs.org/package/forever))

ひとつめは、`forever`を使ってGhostをバックグラウンドタスクとして実行する方法です。 Ghostのプロセスが終了しても`forever`が自動で再起動してくれます。

*   `forever`をインストールするには、`npm install forever -g`と入力します。
*   `forever`を実行するには、Ghostのディレクトリ内から`NODE_ENV=production forever start index.js`と入力します。
*   Ghostを終了するには、`forever stop index.js`と入力します。
*   Ghostが実行しているか確かめるには、`forever list`と入力します。

### Supervisorを使う場合 ([http://supervisord.org/](http://supervisord.org/))

Fedora、Debian、UbuntuなどのLinuxディストリビューションにはSupervisorというパッケージが存在します。Supervisorはプロセス管理システムで、起動スクリプトなしにシステムの起動時にGhostを実行することができます。起動スクリプトと違い、Linuxディストリビューションやバージョンが異なってもSupervisorの書き方は同じです。

*   [Supervisorをインストールします](http://supervisord.org/installing.html)。それぞれのLinuxディストリビューションによって方法が異なります:
    *   Debian/Ubuntu: `apt-get install supervisor`
    *   Fedora: `yum install supervisor`
    *   その他のディストリビューション: `easy_install supervisor`
*   Supervisorを実行します: `service supervisor start`
*   Ghost用に起動スクリプトを作成します。多くの場合、`/etc/supervisor/conf.d/ghost.conf`に次のように書きます:

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

*   Supervisorを使ってGhostを実行します: `supervisorctl start ghost`
*   Ghostを終了するには: `supervisorctl stop ghost`

詳しくは[Supervisorのドキュメンテーション](http://supervisord.org)を参照ください。

### 起動スクリプトを使う場合

Linuxはブート時に/etc/init.d内にある起動スクリプトを参照します。Ghostを常に稼動状態にし、リブート時にも自動で起動させるため、起動スクリプトを作るという方法もあります。以下の例はUbuntu用の起動スクリプトです。**Ubuntu 12.04**で動作確認されています。

*   /etc/init.d/ghostというファイルを作成します:

    ```
    $ sudo curl https://raw.githubusercontent.com/TryGhost/Ghost-Config/master/init.d/ghost \
      -o /etc/init.d/ghost
    ```

*   同ファイルを`nano /etc/init.d/ghost`で編集します。
*   `GHOST_ROOT`変数をGhostをインストールしたディレクトリに変更します。
*   `DAEMON`変数が`which node`の実行結果と一致するようにします。
*   起動スクリプトは独自のユーザーアカウントとグループで実行されますので、ユーザーアカウントとグループを作成します:

    ```
    $ sudo useradd -r ghost -U
    ```

*   このユーザーに、Ghostディレクトリへのアクセス許可を与えます:

    ```
    $ sudo chown -R ghost:ghost /path/to/ghost
    ```

*   起動スクリプトのパーミッションを変更します:

    ```
    $ sudo chmod 755 /etc/init.d/ghost
    ```

*   これで、Ghostを次のように操作することができるようになります:

    ```
    $ sudo service ghost start
    $ sudo service ghost stop
    $ sudo service ghost restart
    $ sudo service ghost status
    ```

*   システム起動時にGhostを起動するには、この起動スクリプトを登録する必要があります。次のコマンドを実行してください:

    ```
    $ sudo update-rc.d ghost defaults
    $ sudo update-rc.d ghost enable
    ```

*   最後に、ユーザーにファイル変更の権限を与えるため、ghostグループにユーザーを追加します:

    ```
    $ sudo adduser USERNAME ghost
    ```

*   サーバーを再起動すれば、Ghostが実行されているはずです。


## Ghostを独自ドメイン名で使う

Webサーバーをプロキシとしてセットアップすれば、あなたのGhostブログを独自ドメイン名で公開できます。この例では、**Ubuntu 12.04**上で**nginx**をウェブサーバーとして運用することを前提とします。また、上記したいずれかの方法で、Ghostがバックグラウンドで常に実行されていることも前提とします。

*   nginxをインストール

    ```
    $ sudo apt-get install nginx
    ```
    <span class="note">nginxと、それに必要なディレクトリや設定ファイルがインストールされます。</span>

*   設定を変更する

    *   `/etc/nginx/sites-available/ghost.conf`というファイルを作成します。
    *   このファイルをテキストエディターで開き(`sudo nano /etc/nginx/sites-available/ghost.conf`)、以下をコピペしてください。

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

    *   `server_name`をあなたのドメイン名に変更します。
    *   `sites-enabled`にsymlinkを作ります:

    ```
    $ sudo ln -s /etc/nginx/sites-available/ghost.conf /etc/nginx/sites-enabled/ghost.conf
    ```

    *   nginxを再起動します。

    ```
    $ sudo service nginx restart
    ```
