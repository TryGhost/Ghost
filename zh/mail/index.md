---
lang: zh
layout: mail
meta_title: Ghost电子邮件设置 - Ghost中文文档
meta_description: 关于怎样设置电子邮件服务以及如何用 Ghost 发送邮件，你需要知道的一切。
heading: 邮件设置
chapter: mail
---

## 邮件配置 <a id="email-config"></a>

接下来的文档将详细介绍如何设置 Ghost 邮件，Ghost 使用的是 [Nodemailer](https://github.com/andris9/Nodemailer)，在他们的文档中能找到更多的示例。

### 马上开始

如果你对 PHP 比较熟悉，那么你可能很习惯让你的邮件很神奇地运行在自己的主机平台上。而 Node 会有一些不同，它很新很吸引人，而且依然不是一个很成熟的平台。

不过不用怕，设置你的邮件是一次性的，我们来一起搞定它。

### 为什么需要设置邮件

目前，Ghost 使用邮件只是为了在你忘记密码的时候，发送一个新密码到你的邮箱。它的功能的确不多，但是不要低估它的重要性，我猜你曾经一定在某个时候特别需要它。

将来，Ghost 还将支持基于邮件系统的博客订阅。以及通过电子邮件发送新用户的详细信息和其它一些基于邮件系统的小功能。

## 如何设置？ <a id="how-to"></a>

首先，需要你有一个邮件发送服务器的帐号。我们强烈推荐 Mailgun。他们能提供很好的免费入门账户，允许你发送更多的邮件，并且能管理更多的基于邮件订阅的博客。当然你也可以用 Gmail 或者 Amazon SES。

一旦你选择了你想要电子邮件服务，你需要将你的设置添加到 Ghost 的配置文件当中。不管你的 Ghost 安装在哪个目录，你应该能在 <code class="path">index.js</code> 所在的目录中找到一个名叫 <code class="path">config.js</code> 的文件，如果没有，可以复制 <code class="path">config.example.js</code> 然后重命名。

### Mailgun <a id="mailgun"></a>

前往 [mailgun.com](http://www.mailgun.com/) 注册一个账户。你需要手头上有一个电子邮件地址，并会被要求提供一个域名或者想出一个子域名。这个选项以后可以修改，所以现在我们先注册一个与博客名称类似的字域名。

验证你的邮件地址，然后你将可以访问 Mailgun 可爱的控制面板。你需要通过在右边点击你的域名来找到 Mailgun 提供给你的信的邮件服务用户名和密码（而不是刚刚注册的那个）。下面的小视频可以帮你找到这些东西。

<img src="http://imgur.com/6uCVuZJ.gif" alt="Mailgun details" width="100%" />   

好了，万事俱备，只欠东风，是时候打开配置文件了。用你喜欢的文本编辑器打开 <code class="path">config.js</code>。找到你想设置邮件的地方，像下面这样修改邮件设置：

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

把你 Mailgun 的登录名填入  'user' 后面的引号里面，再把你的 Mailgun 密码填入 'pass' 后面的引号里。如果我用 'tryghosttest' 账户设置我的 Mailgun，它应该看起来像这样：

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

留意所有的冒号、引号和大括号。放错任意一个，等待你的都将是一个莫名其妙的错误结果。

如果有条件，你可以为你的开发和生产环境使用重复的设置。

### Amazon SES <a id="ses"></a>

你可以在 <http://aws.amazon.com/ses/> 注册一个 Amazon Simple Email Service 账户。一旦你完成注册，你将得到一个访问密钥和“秘密”（secret）。

使用你喜欢的编辑器打开 Ghost 的 <code class="path">config.js</code> 文件，找到你想设置邮件的地方，添加你的 Amazon 证书，如下所示：

```
mail: {
    transport: 'SES',
    options: {
        AWSAccessKeyID: "AWSACCESSKEY",
        AWSSecretKey: "/AWS/SECRET"
    }
}
```

### Gmail <a id="gmail"></a>

也可以使用 Gmail 从 Ghost 发送电子邮件。如果你算使用 Gmail，我们建议你 [创建一个新的账户](https://accounts.google.com/SignUp) ，而不是使用任何已有的个人账户。

当你的新账户创建完成，你可以在 Ghost 的 <code class="path">config.js</code> 文件中修改配置。用你喜欢的文本编辑器打开文件，找到你想设置邮件的地方，像下面这样更改你的邮件设置：

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

### 发件地址 <a id="from"></a>

默认情况下，从 Ghost 发出的邮件发间地址为你在通用设置（settings - general）页面所填写的地址。如果你想使用不同的地址，你也可以在 <code class="path">config.js</code> 文件中修改它。

```
mail: {
    fromaddress: 'myemail@address.com',
}
```
