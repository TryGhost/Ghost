---
lang: ja
layout: themes
meta_title: Ghostのテーマを作成するには - Ghost日本語ガイド
meta_description: Ghostのテーマを作成する手順です。
heading: Ghostのテーマの作成方法
subheading: あなたオリジナルのテーマを作成するための手順です。
chapter: themes
---

{% raw %}

## テーマの変更 <a id="switching-theme"></a>

Ghostのテーマは<code class="path">content/themes/</code>に配置されています。

デフォルトのCasperテーマ以外を使用したければ、公式の[マーケットプレイス・ギャラリー](http://marketplace.ghost.org/)をご覧ください。お好きなテーマファイルをダウンロードして展開し、Casperディレクトリと同じように<code class="path">content/themes</code>に配置してください。

独自のテーマを作りたければ、Casperディレクトリをコピペして編集してみることを推奨します。

新しく追加されたテーマに変更するには、

1.  Ghostを再起動する。今のところ、<code class="path">content/themes</code>に追加されたフォルダーは自動では検知されませんので、再起動が必要です。
2.  Ghostの管理画面にログインし、<code class="path">/ghost/settings/general/</code>にアクセスします。
3.  テーマ名を'Theme'ドロップダウンから選択します。
4.  'Save'をクリックします。
5.  ブログにアクセスして、テーマが変更されていることを確かめます。


##  Handlebarsとは? <a id="what-is-handlebars"></a>

[Handlebars](http://handlebarsjs.com/)とは、Ghostが利用しているテンプレート言語です。

> Handlebarsは、セマンティックなテンプレートを簡単に作成する機能を提供します。

もし独自のテーマを作成したければ、まずはHandlebarsのシンタックスに慣れたほうが良いでしょう。[Handlebarsのドキュメンテーション](http://handlebarsjs.com/expressions.html)、または[Treehouseのチュートリアル](http://blog.teamtreehouse.com/getting-started-with-handlebars-js)がおすすめです。チュートリアルをやる場合、Handlebarsのインストールと使い方の部分は読む必要はありません(Ghostに既にインストールされているからです)ので、'Basic Expressions'から始めてみてください。

## Ghostのテーマについて <a id="about"></a>

Ghostのテーマ作成・保守はシンプルにできるように設計されています。たとえば、テンプレート(HTML)とビジネスロジック(JavaScript)はハッキリと分離されています。Handlebarsは(ほぼ)ロジックが無く、関心の分離を規則としていますので、コンテンツを表示するためのビジネスロジックを独立させることができます。こうすることで、デザイナーと開発者が共同でテーマを作ることが容易になります。

Handlebarsのテンプレートは階層制(テンプレートがテンプレートを継承できる)になっており、部分テンプレートもサポートしています。Ghostはこれらを活用し、コードの重複を防ぎ、それぞれのテンプレートに単一責任の原則を適用しています。構成がしっかりしているテーマは保守も容易ですし、上手く分離されたすればコンポーネントはテーマ間で再利用がしやすくなります。

みなさんに「Ghostのテーマは扱いやすい」と思って頂けると幸いです。

## Ghostテーマのファイル構造 <a id="file-structure"></a>

次のようなファイル構造を推奨します。

```
.
├── /assets
|   └── /css
|       ├── screen.css
|   ├── /fonts
|   ├── /images
|   ├── /js
├── default.hbs
├── index.hbs [required]
└── post.hbs [required]
```

現在のところ、default.hbsや他のフォルダーは無くても構いません。<code class="path">index.hbs</code>と<code class="path">post.hbs</code>は必ず必要です。無いとGhostが動きません。<code class="path">partials</code>は特殊なディレクトリです。部分テンプレートを使いたければここに配置してください。たとえば、<code class="path">list-post.hbs</code>が連続する記事のうちのひとつを表示する部分テンプレートなら、これはホームページに使えますし、いずれアーカイブページやタグページにも使えるでしょう。<code class="path">partials</code>は、あらかじめGhostに組み込まれているテンプレートを上書きするテンプレート(ページ分割など)の配置場所でもあります。<code class="path">pagination.hbs</code>ファイルを<code class="path">partials</code>に入れれば、ページの分割に独自のHTMLを使うことができます。

### default.hbs

ベースとなるテンプレートで、全てのページに表示されるHTMLが含まれています。`<html>`、 `<head>`、`<body>`タグや、`{{ghost_head}}`や`{{ghost_foot}}`ヘルパー、そしてサイト全体で使われるヘッダーやフッターが含まれます。

default.hbsには`{{{body}}}`というHandlebarsのコードが含まれており、default.hbsを継承するテンプレートの内容が挿入される位置を示しています。テンプレートの最初の行に`{{!< default}}`と書けば、このテンプレートはdefault.hbsを継承することになり、ファイルの内容が`{{{body}}}`で指定された位置に挿入されます。

### index.hbs

これはホームページ用のテンプレートで、<code class="path">default.hbs</code>を継承します。ホームページに表示される記事のリストが渡されますので、<code class="path">index.hbs</code>はそれぞれの記事がどのように表示されるべきかを決めます。

Casper(現段階のデフォルトテーマ)では、ホームページには大きなヘッダーがあり、`@blog`のグローバル設定を利用してブログのロゴ、タイトル、説明を表示します。それに続いて、`{{#foreach}}`ヘルパーを利用して最新の記事が順番に表示されます。

### post.hbs

こちらは個別の記事を表示するためのテンプレートで、同じく<code class="path">default.hbs</code>を継承します。

Casper(現段階のデフォルトテーマ)では、個別の記事にはそれぞれヘッダーがあり、こちらも`@blog`のグローバル設定と`{{#post}}`データアクセサを利用して記事の詳細をすべて表示します。

### 記事のスタイリングとプレビューについて

Ghostのテーマを作成する際は、記事のCSSとその他のCSSが競合しないよう、クラスとIDのスコープに注意してください。記事の中でどんなクラスやID(見出し用に自動生成される)が使われるか分からないので、ページを個別のスコープで区切るべきです。#my-idは競合する可能性が高いですが、#themename-my-idは低いです。

Ghostの二画面エディタでは、実際の記事ページに近い、記事のプレビューが表示されます。しかし、プレビューを実際の記事ページと一致させるには、プレビュー用のCSSがテーマの一部として必要です。この機能はまだ実装されていませんが、実装された時に楽になるよう、記事用のCSSファイル(例:post.css)をテーマの他のCSS(例:style.css)と分けておくことを推奨します。

## 独自のテーマを作成する <a id="create-your-own"></a>

独自のテーマを作成するには、まずCasperをコピーするか、もしくは新しく任意の名前のフォルダーを<code class="path">content/themes</code>に作成してください(例: my-themeなど。テーマ名はすべて小文字にし、文字・数字・ハイフンのみを使用してください)。新しくフォルダーを作成した場合、空のindex.hbsとpost.hbsファイルを中に作ってください。まだ何も表示されませんが、それでもれっきとしたテーマです。

### 記事のリスト

<code class="path">index.hbs</code>には`posts`オブジェクトが渡され、foreachヘルパーを使って一つずつ記事を表示できます。例:

```
{{#foreach posts}}
// 記事のコンテクストの中です。
// ここに書かれることは個別の記事ごとに表示されます。
{{/foreach}}
```


詳しくは[`{{#foreach}}`](#foreach-helper)の欄をご覧ください。

#### ページ分割

詳しくは[`{{pagination}}`](#pagination-helper)の欄をご覧ください。

### 個別の記事を表示する

記事のリストの`foreach`ループ内や、<code class="path">post.hbs</code>内で個別の記事を扱う際に、以下の記事の属性を取得することができます。

現段階で取得できるのは、以下の値です。

*   id – *記事のID*
*   title – *記事のタイトル*
*   url – *記事の相対URL*
*   content – *記事のHTML*
*   published_at – *記事が表示*
*   author – *著者の詳細データ* (詳しくは下記を参照ください)

これらはすべてHandlebarsの表現(例:`{{title}}`)で表示できます。

<div class="note">
  <p>
    <strong>注意:</strong> <ul>
      <li>
        content属性は<code>{{content}}</code>によって上書きされ表示されます。これにより、HTMLが安全にかつ正しく表示されます。詳しくは<a href="#content-helper"><code>{{content}}</code>ヘルパー</a>の欄を参照ください。
      </li>
      <li>
        url属性は<code>{{url}}</code>ヘルパーによって出力されます。詳しくは<a href="#url-helper"><code>{{url}}</code>ヘルパー</a>の欄を参照ください。
      </li>
    </ul>
  </p>
</div>

#### 記事の著者について

個別の記事を扱う際に、下記の著者データを取得することができます:

*   `{{author.name}}` – 著者の名前
*   `{{author.email}}` – 著者のEメールアドレス
*   `{{author.bio}}` – 著者の説明
*   `{{author.website}}` – 著者のウェブサイト
*   `{{author.image}}` – 著者のプロフィール画像
*   `{{author.cover}}` – 著者のカバー画像

著者の名前は`{{author}}`でも表示できます。

ブロック表現を使うこともできます:

```
{{#author}}
    <a href="mailto:{{email}}">{{name}}にメールする</a>
{{/author}}
```

#### 記事のタグ

個別の記事を扱う際に、下記のタグデータを取得することができます:

*   `{{tag.name}}` – タグの名前

`{{tags}}`を使うとタグのリストがコンマで区切られて表示されます。`{{tags separator=""}}`を使えば好きな文字でタグを区切ることができます。

ブロック表現を使うこともできます:

```
<ul>
    {{#foreach tags}}
        <li>{{name}}</li>
    {{/foreach}}
</ul>
```

### グローバル設定

Ghostのテーマは`@blog`アクセサを通してグローバル設定にアクセスできます。

*   `{{@blog.url}}` – 現在の環境におけるブログのurl (<code class="path">config.js</code>で指定)
*   `{{@blog.title}}` – ブログのタイトル (設定ページで指定)
*   `{{@blog.description}}` – ブログの説明 (設定ページで指定)
*   `{{@blog.logo}}` – ブログのロゴ (設定ページで指定)

## Ghostに用意されているヘルパー <a id="helpers"></a>

Ghostはあらかじめテーマ作成用のヘルパーがいくつか用意されています。ブロックヘルパーと出力ヘルパーの二つがあります。

**[ブロックヘルパー](http://handlebarsjs.com/block_helpers.html)**には開始と終了タグがあります(例:`{{#foreach}}{{/foreach}}`)。タグの間はコンテクストが変更され、新しい属性に`@`でアクセスできるようになります。

**出力ヘルパー**はデータを表示する表現と見た目は変わりません(例:`{{content}}`)。出力ヘルパーは、データを表示する前に変更を加えたり、データの表示方法をカスタマイズ可能にします。一部の出力ヘルパーは、部分テンプレートのようにテンプレートを利用してデータをHTMLフォーマットに変更します。ブロックヘルパーと兼用で使える出力ヘルパーもあります。

### <code>foreach</code> <a id="foreach-helper"></a>

*   種類: ブロックヘルパー
*   オプション: `columns` (数字)

`{{#foreach}}`は記事のリスト用のループへルパーです。デフォルトだと、Handlebarsのヘルパーは`@index`(配列)と`@key`(オブジェクト)などの属性を追加しますので、これらを使うこともできます。

`foreach`は、さらに`@first`、`@last`、`@even`、`@odd`、`@rowStart`、`@rowEnd`を配列・オブジェクト両方に追加します。これにより、複雑な表示方法を簡単にすることができます。詳しは下記をご覧ください。

#### `@first` & `@last`

例:配列かオブジェクト(例:`posts`)の中身を順にチェックし、一番目かどうかチェックします。

```
{{#foreach posts}}
    {{#if @first}}
        <div>一番目の記事</div>
    {{/if}}
{{/foreach}}
```

`if`を使えば複数の属性をチェックすることができます。例:最初と最後の記事を他とは別に表示します。

```
{{#foreach posts}}
    {{#if @first}}
    <div>一番目の記事</div>
    {{else}}
        {{#if @last}}
            <div>最後の記事</div>
        {{else}}
            <div>他の記事</div>
        {{/if}}
    {{/if}}
{{/foreach}}
```

#### `@even` & `@odd`

例:偶数目の記事にeven、奇数目の記事にoddクラスを追加します。コンテンツを縞模様の背景にするのに便利です。

```
{{#foreach posts}}
        <div class="{{#if @even}}even{{else}}odd{{/if}}">{{title}}</div>
{{/foreach}}
```

#### `@rowStart` & `@rowEnd`

例:column(列)引数を追加すれば、それぞれの行の初めと最後の要素に別々な処置をすることができます。グリッドレイアウトを作るのに便利です。

```
{{#foreach posts columns=3}}
    <li class="{{#if @rowStart}}first{{/if}}{{#if @rowEnd}}last{{/if}}">{{title}}</li>
{{/foreach}}
```

### <code>content</code> <a id="content-helper"></a>

*   種類: 出力ヘルパー
*   オプション: `words` (数字), `characters` (数字) [デフォルトでは全て表示になります。]

`{{content}}`は記事の中身を表示するだけのヘルパーです。正しいHTMLが生成されるようになっています。

表示される長さは、オプションで指定することができます。

`{{content words="100"}}`とすれば、はじめの100単語だけが表示されます。HTMLの開始・終了タグもきちんと一致するように作られています。

### <code>excerpt</code> <a id="excerpt-helper"></a>

*   種類: 出力ヘルパー
*   オプション: `words` (数字), `characters` (数字) [デフォルトでは50単語になります。]

`{{excerpt}}`は記事の中身をHTMLタグ無しで表示します。記事の抜粋に役立ちます。

表示される長さは、オプションで指定することができます。

`{{excerpt characters="140"}}`とすれば、はじめの140文字だけが表示されます。

### <code>date</code> <a id="date-helper"></a>

*   種類: 出力ヘルパー
*   オプション: `format` (日付フォーマット。デフォルトは“MMM Do, YYYY”), `timeago` (ブーリアン)

`{{date}}`は日付を様々なフォーマットで表示するためのヘルパーです。日付とフォーマット用の文字列を渡すことができます。

```
// 例:'July 11, 2014'
{{date published_at format="MMMM DD, YYYY"}}
```

もしくは、日付とtimeago(現在時刻からどれくらい前か)フラグを渡すことができます:

```
// 例:'5 mins ago'
{{date published_at timeago="true"}}
```

`{{date}}`をフォーマット無しで使った場合、“MMM Do, YYYY”となります。

`{{date}}`を記事のコンテクスト内で使い、どの日付を使うか指定しない場合、`published_at`が使われます。

`{{date}}`を記事のコンテクスト外で使った場合、現在時刻が使われます。

`date`は日付のフォーマットに[moment.js](http://momentjs.com/)を使用しています。フォーマット用の文字列についての詳細については、moment.jsの[ドキュメンテーション](http://momentjs.com/docs/#/parsing/string-format/)をご覧ください。

### <code>url</code> <a id="url-helper"></a>

*   種類: 出力ヘルパー
*   オプション: `absolute`

`{{url}}`は、記事のコンテクスト内で使うと、記事の相対URLを表示します。記事のコンテクスト外だと何も表示されません。

強制的に絶対URLを表示させるには、absoluteオプションを利用してください。例:`{{url absolute="true"}}`

###  <code>pagination</code> <a href="pagination-helper"></a>

*   種類: 出力ヘルパー、テンプレートを利用
*   オプション: 無し (もうすぐ追加されます)

`{{pagination}}`はテンプレートを利用して新しい記事と古い記事へのリンク(もし新しい記事や古い記事があれば)や、現在のページ番号を含むHTMLを出力します。

このHTMLは<code class="path">content/themes/<テーマの名前>/partials</code>内に<code class="path">pagination.hbs</code>を追加することにより上書きすることができます。

### <code>body_class</code> <a id="bodyclass-helper"></a>

*   種類: 出力ヘルパー
*   オプション: 無し

`{{body_class}}` – <code class="path">default.hbs</code>内の`<body>`タグ用のクラス名を出力します。個別のページにスタイルを適用するのに適しています。

### <code>post_class</code> <a id="postclass-helper"></a>

*   種類: 出力ヘルパー
*   オプション: 無し

`{{post_class}}` – 記事を含むタグ用のクラス名を出力します。個別の記事にスタイルを適用するのに適しています。

### <code>ghost_head</code> <a id="ghosthead-helper"></a>

*   種類: 出力ヘルパー
*   オプション: 無し

`{{ghost_head}}` – <code class="path">default.hbs</code>の`</head>`タグの直前に配置され、メタ属性、スクリプト、スタイルタグを出力するのに使います。いずれフックできるようになります。

### <code>ghost_foot</code> <a id="ghostfoot-helper"></a>

*   種類: 出力ヘルパー
*   オプション: 無し

`{{ghost_foot}}` – <code class="path">default.hbs</code>の`</body>`タグの直前に配置され、スクリプトタグを出力するのに使います。デフォルトではjqueryを読み込んでいます。いずれフックできるようになります。

### <code>meta_title</code> <a id="metatitle-helper"></a>

*   種類: 出力ヘルパー
*   オプション: 無し

`{{meta_title}}` – 記事ページでは記事のタイトル、それ以外ではブログのタイトルを出力します。`</head>`ブロック内にタイトルを出力するのに適しています (例: `<title>{{meta_title}}</title>`)。いずれフックできるようになります。

### <code>meta_description</code> <a id="metatitledescription-helper"></a>

*   種類: 出力ヘルパー
*   オプション: 無し

`{{meta_description}}` - 記事ページでは今のところ何も表示されず、それ以外ではブログの説明を出力します。descriptionメタ属性を指定するのに適しています (例: `<meta name="description" content="{{meta_description}}" />`)。いずれフックできるようになります。

## テーマのトラブルシューティング <a id="troubleshooting"></a>

#### 1. エラー: Failed to lookup view "index" or "post"

テーマフォルダー内には必ずindex.hbsとpost.hbsが必要です。名前のミスに注意してください。

{% endraw %}