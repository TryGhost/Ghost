---
lang: ja
layout: installation
meta_title: Ghostをインストールするには - Ghost日本語ガイド
meta_description: ブログプラットフォーム「Ghost」をローカルやリモート環境でセットアップするための手順です。
heading: Ghostのインストール方法
subheading: Ghostで新しいブログを作成するための手順です。
permalink: /ja/installation/mac/
chapter: installation
section: mac
prev_section: installation
next_section: windows
---


# MacにGhostをインストールする方法 <a id="install-mac"></a>

<p class="note"><strong>Note</strong> Ghost requires Node.js <strong>0.10.x</strong> (latest stable). We recommend Node.js <strong>0.10.30</strong> & npm <strong>1.4.21</strong>.</p>

Node.jsとGhostをMacにインストールするには、まずターミナルを開きます。Spotlightを開いて、「ターミナル」と検索し、検索結果を選択すれば開くことができます。

### Node.jsのインストール手順

*   [http://nodejs.org](http://nodejs.org)に行き、「Install」をクリック。.pkgファイルがダウンロードされます。
*   ダウンロードされたファイルをクリックすると、インストーラーが開きます。nodeとnpmをインストールするためのものです。
*   インストーラーの手順に従うと、最後にMacのパスワードを入れる画面が表示されるので、指示通りに入力します。最後に「Install Software」をクリックして終了です。
*   インストーラーが終了したら、先ほど開いておいたターミナルに`echo $PATH`と入力し、実行結果に'/usr/local/bin/'という文字列が含まれていることを確認してください。

<p class="note"><strong>注意:</strong> もし'/usr/local/bin'が$PATHに含まれていなければ、<a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/troubleshooting#export-path">トラブルシューティングガイド</a>を参照ください。</p>

ご不明な点がございましたら、[こちらの動画をご覧ください](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-node-mac.gif "Install Node on Mac")。

### Ghostのインストール手順と起動手順

*   [ダウンロードボタン](https://ghost.org/download/)をクリックすると、最新版のzipファイルがダウンロードされます。
*   ダウンロードされたzipファイルをファインダーで表示します。
*   zipファイルをダブルクリックして展開します。
*   展開されて表示された'ghost-#.#.#'フォルダーを先ほどのターミナルにドラッグします。ターミナルのタブが新しく開きます。
*   このタブを開いたまま、`npm install --production`と入力します。<span class="note">ダッシュ記号が二つあることに注意してください。</span>
*   npmがインストールを終了したら、`npm start`と入力すれば、Ghostが開発用モードで起動します。
*   ブラウザで<code class="path">127.0.0.1:2368</code>を表示すれば、たった今作成されたGhostブログが表示されます。
*   最後にブラウザで<code class="path">127.0.0.1:2368/ghost</code>を表示します。管理者アカウントを作成し、Ghostの管理画面に進めば完了です。
*   [使い方ガイド](/usage)にお進みください。

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/install-ghost-mac.gif)

