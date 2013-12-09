---
lang: ja
layout: installation
meta_title: Ghostをインストールするには - Ghost日本語ガイド
meta_description: ブログプラットフォーム「Ghost」をローカルやリモート環境でセットアップするための手順です。
heading: Ghostのインストール方法
subheading: Ghostで新しいブログを作成するための手順です。
permalink: /ja/installation/troubleshooting/
chapter: installation
section: troubleshooting
prev_section: upgrading
---


# トラブルシューティングとFAQ <a id="troubleshooting"></a>

<dl>
    <dt id="export-path">'/usr/local/bin'が$PATHに含まれていません</dt>
    <dd>下記の手順で追加してください:
        <ul>
            <li>ターミナルに<code>cd ~</code>と入力し、ホームディレクトリに移動します。</li>
            <li><code>ls -al</code>と入力してこのフォルダーにある全ての(隠しファイルを含む)ファイルとフォルダーを表示します。</li>
            <li><code class="path">.profile</code>か<code class="path">.bash_profile</code>というファイルが存在するはずです。もし見つからなければ <code>touch .bash_profile</code>と入力して作成してください。</li>
            <li>次に、<code>open -a Textedit .bash_profile</code>と入力してこのファイルをTexteditで開きます。</li>
            <li>ファイルの最後の行に<code>export PATH=$PATH:/usr/local/bin/</code>と追加し、保存します。</li>
            <li>新しいターミナルのタブかウインドウを開けば設定が更新されます。そこでもう一度<code>echo $PATH</code>と入力し、'/usr/local/bin/'が表示されているかどうか確認ください。</li>
        </ul>
    </dd>
    <dt id="sqlite3-errors">SQLite3がインストールできません</dt>
    <dd>
        <p>SQLite3パッケージは多くのプラットフォームで既にバイナリがインストールされています。しかし、もしバイナリが含まれていないマイナーなLinuxか他のUnix系OSをご使用でしたら、SQLite3が404エラーを吐き出す可能性があります。</p>
        <p>これはSQLite3を強制的にコンパイルすれば解決します。pythonとgccが必要です。<code>npm install sqlite3 --build-from-source</code>と入力してみてください</p>
        <p>もし上記が失敗したら、pythonかgccがインストールされていないのかもしれません。Linuxでしたら、<code>sudo npm install -g node-gyp</code>、 <code>sudo apt-get install build-essential</code>、 <code>sudo apt-get install python-software-properties python g++ make</code>と入力してから再度コンパイルしてみてください。</p>
        <p>バイナリのビルドについては、こちらのリンクが参考になります: <a href="https://github.com/developmentseed/node-sqlite3/wiki/Binaries">https://github.com/developmentseed/node-sqlite3/wiki/Binaries</a></p>
        <p>バイナリのビルドが成功したら、<a href="https://github.com/developmentseed/node-sqlite3/wiki/Binaries#creating-new-binaries">こちらの手順</a>に従ってバイナリをnode-sqliteプロジェクトに追加してくれれば、次のユーザーの助けになります。</p>
    </dd>
    <dt id="image-uploads">画像がアップロードできません</dt>
    <dd>
        <p>もしあなたがDigitalOceanのDropletをGhostのv0.3.2で利用していた場合、もしくはnginxを他のプラットフォームで利用していた場合、画像のアップロードが失敗することがあります。</p>
        <p>この原因は、画像サイズの上限が1MBに設定されているからです。小さい画像なら成功するはずです。</p>
        <p>上限を増やすには、nginxの設定ファイルを編集する必要があります。</p>
        <ul>
            <li>サーバーにログインし、<code>sudo nano /etc/nginx/conf.d/default.conf</code>と入力して設定ファイルを開きます。</li>
            <li><code>server_name</code>の次の行に、こう追加します: <code>client_max_body_size 10M;</code></li>
            <li><kbd>ctrl</kbd> + <kbd>x</kbd>でエディタを終了しようとすると、ファイルを保存するか聞かれますので、<kbd>y</kbd>と入力して保存し、<kbd>enter</kbd>を押して完了します。</li>
        </ul>
    </dd>
</dl>

