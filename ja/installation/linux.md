---
lang: ja
layout: installation
meta_title: Ghostをインストールするには - Ghost日本語ガイド
meta_description: ブログプラットフォーム「Ghost」をローカルやリモート環境でセットアップするための手順です。
heading: Ghostのインストール方法
subheading: Ghostで新しいブログを作成するための手順です。
permalink: /ja/installation/linux/
chapter: installation
section: linux
prev_section: windows
next_section: deploy
---


# LinuxにGhostをインストールする方法 <a id="install-linux"></a>

<p class="note"><strong>Note</strong> Ghost requires Node.js <strong>0.10.x</strong> (latest stable). We recommend Node.js <strong>0.10.30</strong> & npm <strong>1.4.21</strong>.</p>

### Node.jsのインストール手順

*   [http://nodejs.org](http://nodejs.org)から`.tar.gz`アーカイブをダウンロードするか、[パッケージマネージャからインストールする手順](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager)を参照ください。
*   インストールが完了したら、`node -v`、そして`npm -v`とターミナルで入力し、nodeとnpmがインストールされている事を確認ください。

### Ghostのインストール手順と起動手順


**Linuxをあなたのデスクトップで利用しているのなら、次の手順を踏んでください:**

*   [http://ghost.org](http://ghost.org)にログイン(もしくは登録)し、「Download Ghost Source Code」と書かれた青いボタンをクリックします。
*   [ダウンロードボタン](https://ghost.org/download/)をクリックすると、最新版のzipファイルがダウンロードされますので、中身をGhostを起動したいディレクトリに移動させます。


**LinuxをゲストOSとして利用しているか、SSH上で利用している場合、次の手順を踏んでください:**

*   次のコマンドを入力して、Ghostの最新版をダウンロードします:

    ```
    $ curl -L https://ghost.org/zip/ghost-latest.zip -o ghost.zip
    ```

*   アーカイブを展開し、展開されたディレクトリに移動します:

    ```
    $ unzip -uo ghost.zip -d ghost
    ```


**ファイルを展開したら、次の手順を踏んでください。まだターミナルを開いていなければ、開いてください:**

*   Ghostのディレクトリに移動していなければ、次のコマンドで移動します:

    ```
    $ cd /path/to/ghost
    ```

*   次に、Ghostをインストールします:

    ```
    npm install --production
    ```
    <span class="note">ダッシュ記号が二つあることに注意してください。</span>

*   npmがインストールを終了したら、次のコマンドを入力すればGhostが開発用モードで起動します:

    ```
    $ npm start
    ```

*   Ghostが**127.0.0.1:2368**で開始されます。<br />
    <span class="note">アドレスとポート番号は**config.js**で変更できます。</span>

*   ブラウザで<code class="path">127.0.0.1:2368</code>を表示すれば、たった今作成されたGhostブログが表示されます。
*   最後にブラウザで<code class="path">127.0.0.1:2368/ghost</code>を表示します。管理者アカウントを作成し、Ghostの管理画面に進めば完了です。
