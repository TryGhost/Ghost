---
lang: ja
layout: mail
meta_title: Ghostのメール設定 - Ghost日本語ガイド
meta_description: Ghostプラットフォームからメールを送るための手順です。
heading: Ghostのメール設定
chapter: mail
---


## メールの設定について <a id="email-config"></a>

このページでは、GhostのEメール設定について解説します。さらに詳しいことは、Ghostが利用している[Nodemailer](https://github.com/andris9/Nodemailer)のドキュメンテーションを参考にしてください。

### なぜメールの設定が必要なのですか?

PHPの開発経験がある方は、なぜEメールの設定をする必要があるのか疑問に思われるかもしれません。Nodeは開発されて間もない言語ですので、たまに煩雑な設定を要することもあるのです。

しかし、メールの設定は一度終えてしまえば後は気にする必要はありません。早速見てみましょう。

### メールの設定は絶対必要ですか?

現在、Ghostがメールを送るのは、ユーザーがパスワードを忘れて新しいパスワードをリクエストする時のみです。あまり使われない機能ですが、いざという時に機能していないと困ります。

また近い将来、GhostにはEメールで購読を可能にする機能や、新規ユーザーにアカウント情報のメールを送信する機能など、Eメールを多用する機能が追加される予定です。今のうちにメールの設定を終えておきましょう。

## メールの設定方法 <a id="how-to"></a>

まず、メール送信サービスのアカウントが必要です。Mailgunが特におすすめです。Mailgunの無料のアカウントなら、ほとんどのブログで必要とするメールの送信量をカバーできます。他にはGmailやAmazon SESを利用することができます。

次に、Ghostの設定ファイルを変更する必要があります。Ghostがインストールされたディレクトリの中の<code class="path">index.js</code>と同じ階層に<code class="path">config.js</code>というファイルがあれば、それが設定ファイルです。<code class="path">config.js</code>がまだ無ければ、<code class="path">config.example.js</code>をコピーしてファイル名を変更してください。

### Mailgunを使う場合 <a id="mailgun"></a>

Mailgunを利用される場合は、[mailgun.com](http://www.mailgun.com/)に行き新しいアカウントを作成してください。メールアドレスと、ドメイン名、もしくはサブドメイン名を聞かれます。これは後から変更できますので、あなたのブログの名前と近いサブドメイン名を適当につけても構いません。

次に、EメールアドレスをMailgun上でVerify(確認)する必要があります。確認後、Mailgun内で先ほどのドメイン/サブドメイン名の設定ページに行き、SMTP Authenticationボックス内に表示されているLoginとPasswordをコピーします。下の動画で確認してみてください。

<img src="http://imgur.com/6uCVuZJ.gif" alt="Mailgun details" width="100%" />

これですべて完了です。先ほどの<code class="path">config.js</code>ファイルを開き、開発(development)環境と本番(production)環境それぞれの値の中に、次のように書き加えてください:

```
mail: {
transport: 'SMTP',
    options: {
        service: 'Mailgun',
        auth: {
            user: '',
            pass: ''
        }
    }
}
```

そして、先ほどコピーした'Login'を'user'の値に、'Password'を'pass'の値に設定します。我々のtryghosttestアカウントの例はこちらです:

```
mail: {
    transport: 'SMTP',
    options: {
        service: 'Mailgun',
        auth: {
            user: 'postmaster@tryghosttest.mailgun.org',
            pass: '25ip4bzyjwo1'
        }
    }
}
```

「:」や「'」や「{}」などの記号が欠けていると正しく機能しませんので注意してください。

### Amazon SESを使う場合 <a id="ses"></a>

AmazonはSimple Email Serviceというメール送信サービスを提供しています: <http://aws.amazon.com/ses/> サインアップが完了すると、アクセスキーとシークレットキーが提供されます。

次に、先ほどの<code class="path">config.js</code>ファイルを開き、開発(development)環境と本番(production)環境それぞれの値の中に、アクセスキーとシークレットキーを書き加えてください:

```
mail: {
    transport: 'SES',
    options: {
        AWSAccessKeyID: "AWSACCESSKEY",
        AWSSecretKey: "/AWS/SECRET"
    }
}
```

### Gmailを使う場合 <a id="gmail"></a>

GhostからGmailを使ってEメールを送ることも可能です。その場合、個人用のアカウントのパスワードを使わないために、[新しいGmailアカウント](https://accounts.google.com/SignUp)を作成することをおすすめします。

新しいアカウントを作成したら、先ほどの<code class="path">config.js</code>ファイルを開き、開発(development)環境と本番(production)環境それぞれの値の中に、メールアドレスとパスワードを書き加えてください:

```
mail: {
    transport: 'SMTP',
    options: {
        auth: {
            user: 'youremail@gmail.com',
            pass: 'yourpassword'
        }
    }
}
```

### 差出人アドレス <a id="from"></a>

デフォルトの設定だと、Ghostが送信するメールの差出人アドレスはGhost上のGeneral Settingsページで指定されたものになります。<code class="path">config.js</code>ファイルで、これを上書きすることができます。

```
mail: {
    fromaddress: 'myemail@address.com',
}
```
