---
lang: ja
layout: installation
meta_title: Ghostをインストールするには - Ghost日本語ガイド
meta_description: ブログプラットフォーム「Ghost」をローカルやリモート環境でセットアップするための手順です。
heading: Ghostのインストール方法
subheading: Ghostで新しいブログを作成するための手順です。
permalink: /ja/installation/upgrading/
chapter: installation
section: upgrading
prev_section: deploy
next_section: troubleshooting
canonical: http://support.ghost.org/how-to-upgrade/
redirectToCanonical: true
---

# Ghostのアップグレードについて <a id="upgrade"></a>

Ghostを最新版に更新するのはとても簡単です。

アップグレードする方法はいくつかあります。はじめに大まかな手順を解説し、続いて[GUIを使う手順と](#how-to)、[コマンドライン](#cli)からアップグレードする手順を解説します。どちらの方法でも構いません。

<p class="note"><strong>バックアップ推奨</strong>: アップグレードの前に<a href="#backing-up">バックアップの手順</a>を参考にバックアップを行ってください。</p>

## アップグレードの概要

<img src="https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/folder-structure.png" style="float:left" />

Ghostのフォルダー構造は左のようになっています。重要なのは<code class="path">content</code>と<code class="path">core</code>フォルダー、そしてルートディレクトリにあるいくつかのファイルです。

Ghostをアップグレードするには、古いファイルを新しいファイルに置き換え、`npm install`を実行して<code class="path">node_modules</code>フォルダーを更新し、Ghostを再起動する必要があります。

デフォルト設定だとGhostはデータ、テーマ、画像などを<code class="path">content</code>ディレクトリに保存しますので、アップグレードの際には触れないでください。<code class="path">core</code>ディレクトリとルートディレクトリのファイルだけを更新するように心がけてください。

## バックアップの手順 <a id="backing-up"></a>

<img src="https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/export.png" style="float:right" />

*   データをバックアップするには、Ghostにブラウザからログインし、<code class="path">/ghost/debug/</code>を開きます。Exportボタンをクリックすれば、全データを保管しているJSONファイルをダウンロードできます。
*   テーマや画像をバックアップするには、<code class="path">content/themes</code>と<code class="path">content/images</code>内のファイルをすべて保存してください。

<p class="note"><strong>注意:</strong> <code class="path">content/data</code>に保管されているデータベースをダウンロードすることも可能ですが、その前に<strong>必ず</strong>Ghostを終了させてください。</p>


## アップグレードの手順 (GUIを利用する場合) <a id="how-to"></a>

ローカル環境でアップグレードをする方法を紹介します。

<p class="warn"><strong>注意:</strong> Macを利用されている場合、<strong>絶対に</strong>新しいGhostフォルダーを古いGhostフォルダー上にコピペしないでください。TransmitなどのFTPソフトウェアを利用している場合も、<strong>絶対に</strong>フォルダを<kbd>置換</kbd>しないでください。代わりに<strong>マージ</strong>を選んでください。</p>

*   [Ghost.org](http://ghost.org/download/)から、Ghostの最新版をダウンロードします。
*   ダウンロードしたzipファイルを展開します。
*   ルートディレクトリにあるファイルを全てコピーします(フォルダーは除きます)。index.js、package.json、Gruntfile.js、config.example.js、ライセンス、READMEファイルなどです。
*   次に、古い<code class="path">core</code>ディレクトリを最新版の`core`ディレクトリに置き換えます。
*   デフォルトのテーマであるCasperが更新された場合、古い<code class="path">content/themes/casper</code>ディレクトリを新しいものと置き換えてください。
*   そして、`npm install --production`を実行します。
*   最後に、Ghostを再起動すれば完了です。

## アップグレードの手順 (コマンドラインを利用する場合) <a id="cli"></a>

<p class="note"><strong>バックアップ推奨</strong>: アップグレードの前に<a href="#backing-up">バックアップの手順</a>を参考にバックアップを行ってください。</p>

### Macの場合 <a id="cli-mac"></a>

こちらの動画を参考にしてください。Zipファイルを<code class="path">~/Downloads</code>にダウンロードし、Ghostを<code class="path">~/ghost</code>ディレクトリに配置した場合の手順です。 <span class="note">**注意:** MacとLinuxでは、`~`はユーザーのホームディレクトリを表しています。</span>

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/upgrade-ghost.gif)

上記の動画で実行されている手順はこちらです:

*   <code class="path">cd ~/Downloads</code> - 最新版のGhostが保存されているDownloadsフォルダーに移動します。
*   `unzip ghost-0.3.1.zip -d ghost-0.3.3` - Ghostを<code class="path">ghost-0.3.3</code>フォルダーに展開します。
*   <code class="path">cd ghost-0.3.3</code> - 展開された<code class="path">ghost-0.3.3</code>ディレクトリに移動します。
*   `ls` - このディレクトリ内のファイルとフォルダーを全て表示します。
*   `cp *.md *.js *.txt *.json ~/ghost` - ディレクトリ直下の.md .js .txt .jsonファイルを<code class="path">~/ghost</code>にコピーします。
*   `cp -R core ~/ghost` - <code class="path">core</code>ディレクトリとディレクトリ内の全てのファイルを<code class="path">~/ghost</code>にコピーします。
*   `cp -R content/themes/casper ~/ghost/content/themes` - <code class="path">casper</code>ディレクトリとディレクトリ内の全てのファイルを<code class="path">~/ghost/content/themes</code>にコピーします。
*   `cd ~/ghost` - <code class="path">~/ghost</code>ディレクトリに移動します。
*   `npm install --production` - Ghostをインストールします。
*   `npm start` - Ghostを起動します。

### Linuxサーバーの場合 <a id="cli-server"></a>

*   最新版のGhostを含むZipファイルのURLをコピーします。例: `http://ghost.org/zip/ghost-latest.zip`.
*   Zipファイルを`wget http://ghost.org/zip/ghost-latest.zip`でダウンロードします(あらかじめURLを置き換えてコマンドを入力してください)。
*   ダウンロードしたZipファイルを`unzip -uo ghost-latest.*.zip -d path-to-your-ghost-install`で展開します。
*   `npm install --production`と入力して必要なプログラムをインストールします。
*   Ghostを再起動してください。

**追記:** [howtoinstallghost.com](http://www.howtoinstallghost.com/how-to-update-ghost/)でLinuxサーバーでのより詳細なアップグレード方法を読むことができます。

### DigitalOceanのDropletの場合 <a id="digitalocean"></a>

<p class="note"><strong>バックアップ推奨</strong>: アップグレードの前に<a href="#backing-up">バックアップの手順</a>を参考にバックアップを行ってください。</p>

*   最新版のGhostを含むZipファイルのURLをコピーします。例: `http://ghost.org/zip/ghost-latest.zip`.
*   Dropletのコンソールを開き、`cd /var/www/`と入力してGhostのコードベースに移動します。
*   Zipファイルを`wget http://ghost.org/zip/ghost-latest.zip`でダウンロードします(あらかじめURLを置き換えてコマンドを入力してください)。
*   ダウンロードしたZipファイルを`unzip -uo ghost-0.3.*.zip -d ghost`で展開します。
*   パーミッションの設定を行います: `chown -R ghost:ghost ghost/*`
*   `npm install --production`と入力して必要なプログラムをインストールします。
*   `service ghost restart`でGhostを再起動して完了です。

## Node.jsを最新版にアップグレードするには <a id="upgrading-node"></a>

もし[Node.js](nodejs.org)からNode.jsをインストールしたのでしたら、もう一度最新版をダウンロードしてインストーラーを実行することによりNode.jsをアップグレードすることができます。

Ubuntuか、`apt-get`が使えるその他のLinuxディストリビューションをご利用でしたら、インストール時と同じコマンドでNode.jsをアップグレードできます: `sudo apt-get install nodejs`.

GhostやWebサーバーを再起動する必要は**ありません**。
