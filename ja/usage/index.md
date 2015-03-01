---
lang: ja
layout: usage
meta_title: Ghostの使い方 - Ghost日本語ガイド
meta_description: Ghostの利用方法を解説します。Ghostをセットアップしたら後にご覧ください。
heading: Ghostの使い方
subheading: 利用方法や、カスタマイズの手順を紹介します。
chapter: usage
next_section: configuration
---

## 概要 <a id="overview"></a>

Ghostがセットアップできたら、いよいよブログを書く時です。このガイドでは、Ghostについて知っておくべきことを全て紹介します。

### 初回アクセスの際に

Ghostのブログにはじめてアクセスした際に管理者ユーザーアカウントを作成する必要があります。<code class="path">&lt;ブログのURL&gt;/ghost/signup/</code>にブラウザでアクセスしてみてください。

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/ghost-signup.png)

*   **Full Name**: あなたのフルネームを入力してください。それぞれの記事のページで著者として表示されます。
*   **Eメールアドレス**と**パスワード** (最低8文字)を入力してください。
*   **Sign Up**ボタンをクリックすると、管理者としてログインされます。

これで記事を書けるようになりました。

#### メッセージについて

はじめてGhostにアクセスしたとき、次のようなメッセージが表示されます:

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/first-run-info.png)

ここには、Ghostの設定(どの環境で動いているか、どのURLに設定されているか)などが表示されます。環境などについては[高度な設定](/usage/configuration/)ページを参考ください。ログイン後、xをクリックするとこのメッセージを消すことができます。

また、こちらのオレンジのメッセージが表示されることもあります:

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/email-warning.png)

(訳: Ghostのメール設定が未設定なので、Ghostからメールが送信できません)

ブログを書き始めるにあたっては問題ないですが、[メール設定](/mail)ページを読んでメールの設定を済ませておくことを勧めます。現在、パスワードを忘れたときのみにメール機能が必要となっています。