---
lang: ja
layout: usage
meta_title: Ghostの使い方 - Ghost日本語ガイド
meta_description: Ghostの利用方法を解説します。Ghostをセットアップしたら後にご覧ください。
heading: Ghostの使い方
subheading: 利用方法や、カスタマイズの手順を紹介します。
chapter: usage
section: configuration
permalink: /ja/usage/configuration/
prev_section: usage
next_section: settings
---


## Ghostの高度な設定 <a id="configuration"></a>

Ghostを一度でも起動すると、Ghostをインストールしたディレクトリに`config.js`と`index.js`というファイルがあることに気づくかもしれません。このファイルを編集することで、ブログのURLや、データベースの設定、メールの設定などの環境設定を行うことができます。

Ghostを一度も起動したことがなければ、`config.js`はまだ作成されていません。`config.example.js`ファイルをコピーすることで作成することができます。(これは、Ghostが初回起動時に行っていることでもあります。)

GhostのブログURL、メールの設定、データベースの設定などを変更したい場合は、お好きなエディタで`config.js`を開き、設定変更を行ってください。設定が思い通りに行かない場合は、下記に続くドキュメントを参照してください。

## 環境について <a id="environments"></a>

Node.jsやGhostには、環境に関する概念が組み込まれています。環境を変えることで、異なる設定でGhostを動かすことができます。Ghostにはデフォルトで**development**と**production**という二つの環境が組み込まれています。

この二つの環境にはほとんど違いはありません。基本的には、**development**環境は、Ghostのデバッグなど開発を行うための環境です。一方で、**production**環境はGhostを公開する際に適した環境です。これらの環境の違いは、出力されるログメッセージやエラーメッセージの違い、静的ファイルがどの程度連結され圧縮されるかの違いなどです。**production**環境では一つのJavaScriptファイルで出力されるのに対し、**development**では複数のファイルで出力されるなどです。

Ghostが発展するにつれて、これらの違いはより顕著になり、公開されているブログが**production**環境で実行されることがますます重要になってくるでしょう。多くの人が**production**環境でブログを公開するのであれば、なぜデフォルトが**development**環境なの?と疑問に思うかもしれません。Ghostがデフォルトで**development**環境となっているのは、最初のセットアップ時に必要になるであろうデバッグ作業を行うのに最良の環境だからです。

##  環境を指定する <a id="using-env"></a>

環境変数を設定することで、Ghostを異なる環境で動作させることができます。例えば、普通`node index.js`と入力してGhostを起動するところを、以下のように入力し起動します。

`NODE_ENV=production node index.js`

foreverを使用しているのであれば、以下のようにします。

`NODE_ENV=production forever start index.js`

`npm start`を使う場合は、もう少し簡単に入力できます。

`npm start --production`

### どうして`npm install --production`を使用するのか?

Ghostのデフォルトの環境がdevelopment環境なのに、なぜインストールの際に`npm install --production`を使用するのか?という質問をしばしば頂きます。Ghostのインストール時に`--production`と付けなくても、何も悪いことは起こりません。ただ、そうすることでGhostのコア機能を開発する人のためのパッケージも余分にインストールされてしまいます。また、グローバル環境に`grunt-cli`をインストールする作業も必要となります。これは`npm install -g grunt-cli`と実行することで解決しますが、Ghostをブログとして使用したいだけの人にとっては余計な作業となります。

