---
lang: ja
layout: usage
meta_title: Ghostの使い方 - Ghost日本語ガイド
meta_description: Ghostの利用方法を解説します。Ghostをセットアップしたら後にご覧ください。
heading: Ghostの使い方
subheading: 利用方法や、カスタマイズの手順を紹介します。
chapter: usage
section: settings
permalink: /ja/usage/settings/
prev_section: configuration
next_section: managing
---

##  Ghostの設定について <a id="settings"></a>

<code class="path">&lt;ブログのURL&gt;/ghost/settings/</code>にブラウザでアクセスしてください。

ブログの設定を変更したあとは*必ず*"Save"ボタンを押してください。そうすることで変更が保存されます。

ブログのURLにブラウザでアクセスすることで、変更を確認することができます。

### ブログの設定 (<code class="path">/general/</code>)

以下のものが、ブログに関わる設定です。

*   **Blog Title**: あなたのブログのタイトルです。テーマからの参照時は`@blog.title`として参照されます。
*   **Blog Description**: あなたのブログの説明です。テーマからの参照時は`@blog.description`として参照されます。
*   **Blog Logo**: '.png', '.jpg', '.gif'のいずれかの形式でブログのロゴをアップロードできます。テーマからの参照時は`@blog.logo`として参照されます。
*   **Blog Cover**: '.png', '.jpg', '.gif'のいずれかの形式でブログのカバー画像をアップロードできます。テーマからの参照時は`@blog.cover`として参照されます。
*   **Email Address**: ここで設定したEmailアドレスは管理の通知用としても使用されます。*必ず*有効なEmailアドレスを入力してください。
*   **Posts per page**: 1ページに表示する投稿の数を設定できます。必ず数値を入力してください。
*   **Theme**: <code class="path">content/themes</code>ディレクトリにあるテーマを表示します。お好みのものを一つ選んでください。

### ユーザ設定 (<code class="path">/user/</code>)

ユーザや著者のプロフィールのための設定です。

*   **Your Name**: 記事投稿時にクレジットとして表示される名前です。テーマからの参照時は、(post) `author.name`として参照されます。
*   **Cover Image**: '.png', '.jpg', '.gif'のいずれかの形式で、プロフィールのカバー画像をアップロードできます。テーマからの参照時は、(post) `author.cover`として参照されます。
*   **Display Picture**: '.png', '.jpg', '.gif'のいずれかの形式であなたのプロフィール画像をアップロードできます。テーマからの参照時は、(post) `author.image`として参照されます。
*   **Email Address**: このEmailアドレスは、あなたの公のEmailアドレスとして使用されると共に通知を受け取るために使用されます。テーマからの参照時は、(post) `author.email`として参照されます。
*   **Location**: あなたの住んでいる場所を入力します。テーマからの参照時は、(post) `author.location`として参照されます。
*   **Website**: この欄には、あなたの個人WebサイトのURLや、ソーシャルネットワークの個人ページのURLなどを入力してください。テーマからの参照時は、(post) `author.website`として参照されます。
*   **Bio**: あなたについての説明を200文字以下で書くことができます。テーマからの参照時は、(post) `author.bio`として参照されます。

#### パスワードの変更

1.  現在のパスワードと、新しいパスワードを入力してください。
2.  **Change Password**ボタンをクリックしてください。
<p class="note">
    <strong>注意:</strong> パスワード変更のためには、"パスワード変更"ボタンをクリックする必要があります。"Save"ボタンを押すだけではパスワードは変更されません。
</p>

