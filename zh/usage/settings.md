---
lang: zh
layout: usage
meta_title: 如何使用Ghost - Ghost 文档
meta_description: 一个深入使用Ghost的向导。获得Ghost但不知道如何使用？从这里开始!
heading: 使用 Ghost
subheading: 寻找您的周围，设置您想要的方式
chapter: usage
section: settings
permalink: /zh/usage/settings/
prev_section: configuration
next_section: managing
---

##  Ghost设置<a id="settings"></a>

转到<code class="path">&lt;your URL&gt;/ghost/settings/</code>.

您设置调整完成，必须按“保存”按钮，保存更改。

您可以通过浏览博客URL，检查您的更改。

### 博客 (<code class="path">/general/</code>)

这些事博客的具体设置。

*   **Blog Title**: 更改您的博客标题。主题引用`@blog.title`。
*   **Blog Description**: 更改您的博客描述。主题引用 `@blog.description`。
*   **Blog Logo**: 为您的博客上传一个'.png'， '.jpg'或者'.gif'格式的Logo。主题引用 `@blog.logo`。
*   **Blog Cover**: 为您的博客上传'.png'，'.jpg'或者'.gif'格式的封面图片。主题引用`@blog.cover`。
*   **Email Address**: 通过电子邮件向管理员发送通知的电子邮件地址。它必须是一个有效的电子邮件地址。
*   **Posts per page**: 设置每页显示多少篇文章。这应该是一个数值。
*   **Theme**: 在您的<code class="path">content/themes</code>目录中列出所有的主题。从下拉列表中选择一个会改变您的博客样式。

### 用户设置 (<code class="path">/user/</code>)

这些设置控制您的用户名/作者简介。

*   **Your Name**: 这是您的名字，当您发布一篇文章时记录您。主题引用（post） `author.name`。
*   **Cover Image**: 这里上传您的个人资料封面图片，用'.png'，'.jpg'或'.gif'格式。 主题引用（post） `author.cover`。
*   **Display Picture**: 这里上传您的个人展示图片，用'.png'，'.jpg'或'.gif'格式。 主题引用（post） `author.image`。
*   **Email Address**: 此电子邮件将作为您的公共电子邮件也是您希望收到通知的地址。主题引用（post） `author.email`。
*   **Location**: 这是您目前的位置。主题引用（post） `author.location`。
*   **Website**: 这是您个人网站的网址，或是是您的社交网络网址之一。主题引用（post） `author.website`。
*   **Bio**: 这里您可以输入不超过200字符的自我描述。主题引用（post） `author.bio`。

#### 更改您的密码

1.  输入框中填写相应的密码（当前/新的密码）。
2.  现在点击 **Change Password**.
<p class="note">
    <strong>Note:</strong>对于您的密码改变，您必须点击“Change Password”按钮，“Save”按钮不更改密码。
</p>
