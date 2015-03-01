---
lang: ja
layout: installation
meta_title: Ghostをインストールするには - Ghost日本語ガイド
meta_description: ブログプラットフォーム「Ghost」をローカルやリモート環境でセットアップするための手順です。
heading: Ghostのインストール方法
subheading: Ghostで新しいブログを作成するための手順です。
chapter: installation
next_section: mac
---

## 概要 <a id="overview"></a>

<p class="note"><strong>Note</strong> Ghost requires Node.js <strong>0.10.x</strong> (latest stable). We recommend Node.js <strong>0.10.30</strong> & npm <strong>1.4.21</strong>.</p>

注意:Ghostのドキュメンテーションは未完成です。間違いなどがございましたらお手数ですがご連絡ください。

Ghostは[Node.js](http://nodejs.org)で書かれています。必要バージョンは`0.10.*`(最新の安定版)です。

Ghostをセットアップするには、まずNode.jsをインストールしましょう。

### Node.jsとは?

[Node.js](http://nodejs.org)とは高速でスケーラブルなWebアプリケーションを作成するためのプラットフォームです。
    Webはもともと静的なページが中心でしたが、ここ20年で、GmailやFacebookなどの複雑なアプリケーションをサポートするまでに進化を遂げました。
    この進化を支えたのはJavaScriptというプログラミング言語です。

[Node.js](http://nodejs.org)を使えば、JavaScriptをサーバー上で動かすことができます。JavaScriptは元々ブラウザ上のみで動く言語で、サーバー上ではPHPなどの別な言語が必要でした。ブラウザ・サーバー両方で同じ言語を使えるメリットは大きいです。たとえば、主にフロントエンドを担当していた開発者も、Node.jsであればサーバー上の開発に参加しやすくなるでしょう。

具体的に言うと、[Node.js](http://nodejs.org)は、Google Chromeで使われているJavaScriptエンジンを取り出して、多くの環境にインストールできるようにしたものです。すなわち、あなたのコンピューターにもNode.jsをインストールすれば、Ghostをすぐに試すことができます。
    [Mac]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/mac/)、[Windows]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/windows/)、[Linux]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/linux/)へのインストール手順や、あなたの[サーバーやホスティング]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/deploy)アカウントへGhostをデプロイする方法は後述の部分を参照ください。

### はじめ方

注意:Node.jsとGhostをインストールするのが面倒でしたら、[BitNami](http://bitnami.com/)の方々が様々なプラットフォームに対応した[Ghostインストーラー](http://bitnami.com/stack/ghost)を公開されていますので、そちらをご覧ください。

GhostをインストールするOSを選んでください:

<div class="text-center install-ghost">
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/mac/" class="btn btn-success btn-large">Mac</a>
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/windows/" class="btn btn-success btn-large">Windows</a>
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/linux/" class="btn btn-success btn-large">Linux</a>
</div>

Ghostをサーバーやホスティングアカウントにデプロイしたい方は、下記のページをご覧ください。手動でセットアップする方法や、1クリックで済むインストーラーの解説をご用意しました。

<div class="text-center install-ghost">
    <a href="{% if page.lang %}/{{ page.lang }}{% endif %}/installation/deploy/" class="btn btn-success btn-large">Ghostをデプロイ</a>
</div>

Ghostはまだ生まれて間もないソフトウェアで、我々は日々機能を追加しています。Ghostを最新版にアップグレードするには、[アップグレードガイド](/installation/upgrading/)をご覧ください。
    分からない点がございましたら、まずは[トラブルシューティングガイド]({% if page.lang %}/{{ page.lang }}{% endif %}/installation/troubleshooting/)をご覧ください。それでも解決しない場合は、[フォーラム](http://ghost.org/forum)に書き込んで頂ければ、Ghostスタッフとコミュニティがあなたの質問に答えます。
