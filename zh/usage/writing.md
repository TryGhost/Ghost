---
lang: zh
layout: usage
meta_title: 如何使用Ghost - Ghost 文档
meta_description: 一个深入使用Ghost的向导。获得Ghost但不知道如何使用？从这里开始!
heading: 使用 Ghost
subheading: 寻找您的周围，设置您想要的方式
chapter: usage
section: writing
permalink: /zh/usage/writing/
prev_section: managing
next_section: faq
---

##  写文章<a id="writing"></a>

在Ghost中的写博客文章都用Markdown。Markdown使用标点符号和特殊字符格式标记文档的轻量级语言。它的语法是为了防止中断写作的流动，让您专注于内容，而不是它看起来如何。


###  Markdown指南<a id="markdown"></a>

[Markdown](http://daringfireball.net/projects/markdown/)是一种标记语言，旨在提高写作效率，并保证写作尽可能易读。

Ghost使用了Markdown默认的所有快捷方式加上我们自己的添置。下面列出了完整的快捷键列表。

####  标题

可以在标题内容前输入#设定标题。标题内容前#的数字决定标题的深度。标题深度从1至6。

*   H1 : `# 标题 1`
*   H2 : `## 标题 2`
*   H3 : `### 标题 3`
*   H4 : `#### 标题 4`
*   H5 : `##### 标题 5`
*   H6 : `###### 标题 6`

####  文本样式

*   链接 : `[标题](URL)`
*   粗体 : `**粗体**`
*   斜体 : `*斜体*`
*   段落 : 段落间行空间
*   列表 : `* 每个列表项前的星号`
*   引用 : `> 引用`
*   代码 : `` `代码` ``
*   HR : `==========`

####  图片

要在您的文章插入一个图像，你要先在Markdown编辑器面板中输入`![]()`。
这会在预览面板中创建一个图像上传框。

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/Screen%20Shot%202013-10-14%20at%2012.45.08.png)

现在，您可以从桌面拖动和删除任何图像(.png, .gif, .jpg) 到图像上传框，把它列入您的文章中，或者点击图片上传框使用标准图像上传弹出窗口。 
如果你想输入图片url，点击图像上传框左下方的'link'图标，这会为您提供插入图像的URL的功能。

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/Screen%20Shot%202013-10-14%20at%2012.34.21.png)

给你的图片加上标题，你需要在方括号中填写你的标题文字，例如；`![This is a title]()`. 

##### 删除图片

![](https://s3-eu-west-1.amazonaws.com/ghost-website-cdn/Screen%20Shot%202013-10-14%20at%2012.56.44.png)

要删除图像，请在当前插入图像的右上角单击“remove”图标。这会给你提供空白的图片上传框让你重新插入一个新的图片。