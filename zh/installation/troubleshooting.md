---
lang: zh
layout: installation
meta_title: 如何在服务器上安装Ghost - Ghost中文文档
meta_description: 这里详细讲述如何在你本地或远程环境中安装Ghost博客平台。
heading: 安装Ghost &amp; 开始尝试
subheading: 开始搭建新的博客的第一步
permalink: /zh/installation/troubleshooting/
chapter: installation
section: troubleshooting
prev_section: upgrading
---


# 纠错 & 常见问题 <a id="troubleshooting"></a>

<dl>
    <dt id="export-path">'/usr/local/bin' 没有添加到 $PATH</dt>
    <dd>你可以使用以下步骤添加它：
        <ul>
            <li>在你的终端窗口中输入 <code>cd ~</code>，切换到主目录</li>
            <li>然后输入 <code>ls -al</code> 显示当前文件夹内所有文件，包括隐藏的文件</li>
            <li>你应该看到一个名为 <code class="path">.profile</code> 或者 <code class="path">.bash_profile</code> 的文件。如果没有，输入  <code>touch .bash_profile</code> 创建这个文件</li>
            <li>输入 <code>open -a Textedit .bash_profile</code> ，用 Textedit 打开这个文件</li>
            <li>添加 <code>export PATH=$PATH:/usr/local/bin/</code> 到这个文件的尾部并保存</li>
            <li>这个新的设置将会在一个新的终端启动时载入，所以打开一个新的终端标签页或窗口，输入 <code>echo $PATH</code>  ，你可以看到 '/usr/local/bin/' 现在存在了</li>
        </ul>
    </dd>
    <dt id="sqlite3-errors">SQLite3 没有安装</dt>
    <dd>
        <p>SQLite3 包采用的预构建的二进制文件适应大多数架构。如果你使用的不常用的 linux   或者 unix 版本，你可能发现 SQLite3 报 404 错误，也就是说系统找不到这个二进制文件。</p>
        <p>可以强制编译 SQLite3 解决这个问题。这样的话需要 python & gcc ，尝试运行 <code>npm install sqlite3 --build-from-source</code>。</p>
        <p>如果你缺失 python 或者 gcc 组件，在 linux 下运行 <code>sudo npm install -g node-gyp</code>， <code>sudo apt-get install build-essential</code> 和 <code>sudo apt-get install python-software-properties python g++ make</code> 然后再重新尝试从源代码编译。</p>
        <p>更多关于构建二进制文件的信息参阅： <a href="https://github.com/developmentseed/node-sqlite3/wiki/Binaries">https://github.com/developmentseed/node-sqlite3/wiki/Binaries</a></p>
        <p>一旦你成功在你的平台上构建了二进制文件，按照 <a href="https://github.com/developmentseed/node-sqlite3/wiki/Binaries#creating-new-binaries">这里的说明</a> 的步骤提交你的 node-sqlite 项目，这样其他的用户就不会遇到同样的问题了。</p>
    </dd>
    <dt id="image-uploads">我不能上传图片</dt>
    <dd>
        <p>如果你在 DigitalOcean Droplet 上安装 Ghost v0.3.2 ，或者在其他平台上使用了 nginx，你可能发现不能上传图片。</p>
        <p>实际情况是，你不能上传超过 1MB 的图片（尝试上传小的图片），这只是一个小限制而已。</p>
        <p>为了提高限额，你可以编辑 nginx 配置文件来调整限制。</p>
        <ul>
            <li>登录到你的服务器，然后输入 <code>sudo nano /etc/nginx/conf.d/default.conf</code> 打开你的配置文件</li>
            <li>在 <code>server_name</code> 下一行，添加如下代码： <code>client_max_body_size 10M;</code></li>
            <li>最后，使用 <kbd>ctrl</kbd> + <kbd>x</kbd> 退出。Nano 将会询问你是否保存，输入 <kbd>y</kbd> 确认，然后按下 <kbd>enter</kbd> 保存文件</li>
        </ul>
    </dd>
</dl>

