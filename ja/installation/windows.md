---
lang: ja
layout: installation
meta_title: Ghostをインストールするには - Ghost日本語ガイド
meta_description: ブログプラットフォーム「Ghost」をローカルやリモート環境でセットアップするための手順です。
heading: Ghostのインストール方法
subheading: Ghostで新しいブログを作成するための手順です。
permalink: /ja/installation/windows/
chapter: installation
section: windows
prev_section: mac
next_section: linux
---

# WindowsにGhostをインストールする方法 <a id="install-windows"></a>

<p class="note"><strong>Note</strong> Ghost requires Node.js <strong>0.10.x</strong> (latest stable). We recommend Node.js <strong>0.10.30</strong> & npm <strong>1.4.21</strong>.</p>

### Node.jsのインストール手順

*   [http://nodejs.org](http://nodejs.org)に行き、「Install」をクリック。.msiファイルがダウンロードされます。
*   ダウンロードされたファイルをクリックすると、インストーラーが開きます。nodeとnpmをインストールするためのものです。
*   Node.jsがインストールされたと表示されるまで、インストーラーの手順に従ってください。

ご不明な点がございましたら、[こちらの動画をご覧ください](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-node-win.gif "Install node on Windows")。

### Ghostのダウンロード手順

*   [ダウンロードボタン](https://ghost.org/download/)をクリックすると、最新版のzipファイルがダウンロードされます。
*   ダウンロードされたzipファイルを含むフォルダーを表示します。
*   zipファイルを右クリックし、「すべて展開」を選択します。

ご不明な点がございましたら、[こちらの動画をご覧ください](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-ghost-win.gif "Install Ghost on Windows Part 1")。

### Ghostのインストール手順と起動手順

*   スタートメニューから'Node.js'を探し、'Node.js Command Prompt'を開いてください。
*   コマンドプロンプトを開いたらまず、ディレクトリをGhostをダウンロードしたフォルダーに変更する必要があります。`cd Downloads/ghost-#.#.#`と入力してください。(#をフォルダー名に合うようにあらかじめ変更してください)。
*   次に、コマンドプロンプトに`npm install --production`と入力します。 <span class="note">ダッシュ記号が二つあることに注意してください。</span>
*   npmがインストールを終了したら、`npm start`と入力すれば、Ghostが開発用モードで起動します。
*   ブラウザで<code class="path">127.0.0.1:2368</code>を表示すれば、たった今作成されたGhostブログが表示されます。
*   最後にブラウザで<code class="path">127.0.0.1:2368/ghost</code>を表示します。管理者アカウントを作成し、Ghostの管理画面に進めば完了です。
*   [使い方ガイド](/usage)にお進みください。

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-ghost-win-2.gif "Install Ghost on Windows - Part 2")

