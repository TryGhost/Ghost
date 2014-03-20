---
lang: zh
layout: themes
meta_title: 如何制作 Ghost 主题 - Ghost 文档
meta_description: 一份详细的指南，教你如何为 Ghost 博客平台制作主题。开发 Ghost 主题所需要知道的一切。
heading: Ghost 主题
subheading: 开始创建属于你的 Ghost 主题
chapter: themes
---

{% raw %}

## 变更主题 <a id="switching-theme"></a>

Ghost 的主题放在 <code class="path">content/themes/</code>

如果你想用其他主题替换缺省的 Casper 主题，可以看看我们的 [marketplace gallery](http://marketplace.ghost.org/) 上的这些自定义主题。下载你喜欢的主题，解压之后放进<code class="path">content/themes</code>里，和 Casper 放一起。

如果你想自己做个主题，我们建议你复制 casper 文件夹，然后在复制的文件夹里修改模版，按你喜欢来做。

要切换到你新添加的主题：

1.  重启 Ghost 。Ghost 不会立即发现你往<code class="path">content/themes</code>新添加了文件夹，所以你需要重启 Ghost。
2.  登录 Ghost 管理后台，进入<code class="path">/ghost/settings/general/</code>页面。
3.  在“Theme”下拉菜单里选择你的主题的名字。
4.  点“保存”。
5.  查看博客的前端，欣赏你的新主题吧！

## Handlebars 是什么？ <a id="what-is-handlebars"></a>

[Handlebars](http://handlebarsjs.com/) 是 Ghost 使用的模版语言。

Handlebars 提供了可以使你轻松高效地建立语义模版的功能。

如果你正打算开始自己写主题，也许先熟悉熟悉 handlebars 的语法是个不错的选择。看看 [handlebars 文档](http://handlebarsjs.com/expressions.html)，或者看看 [Treehouse 上的教程](http://blog.teamtreehouse.com/getting-started-with-handlebars-js) —— 这样你就可以跳过开始的安装和使用步骤（我们帮你做好了一部分），同时避免和“基本表达”纠缠。

## 关于 Ghost 主题 <a id="about"></a>

Ghost 的主题旨在做到易于编写和维护。Ghost 主题推崇模版（HTML）和业务逻辑（JavaScript）之间的分离。Handlebars （几乎）是没有逻辑，并且强化了这个分离，同时提供部件来帮助用来显示内容的业务逻辑保持独立。这种分离使在制作主题时，开发者和设计师之间的合作更加容易。

Handlebars 模版是分等级的（一个模版可以扩展另一个），也支持模块化的模版。Ghost 拥有这些特性，使得代码的重复得以减少，同时每一个模版可以保持专注于实现单一功能，并且做到好。拥有良好架构的主题将很容易维护，而各个组成部分之间的分离使得他们可以在不同主题之间重复利用。

希望你喜欢我们构造主题的方法。

## Ghost 主题的文件架构 <a id="file-structure"></a>

我们推荐如下架构：

```
.
├── /assets
|   └── /css
|       ├── screen.css
|   ├── /fonts
|   ├── /images
|   ├── /js
├── default.hbs
├── index.hbs [必需]
└── post.hbs [必需]
```

目前default.hbs和其他目录都不是必要的。 <code class="path">index.hbs</code> 和 <code class="path">post.hbs</code> 是必须的 – 如果这两个模板文件不存在的话，Ghost就无法正常运行。 <code class="path">partials</code> 是一个特殊的目录。 这个目录应该包含所有你想要在整个博客范围内使用的模板文件，比如 <code class="path">list-post.hbs</code> 可能是一个以列表形式展现一篇篇文章的模板文件，这个文件可能会被用于首页，之后可能被用于文章归档及标签页。 <code class="path">partials</code> 也应该存放那些你想要覆盖的有特定功能的缺省模板文件比如分页。 在<code class="path">partials</code>目录中添加<code class="path">pagination.hbs</code>文件可以让你自定义分页的HTML。

### default.hbs

这是一个基础模板，包含了所有需要出现在每个页面的HTML代码 – `<html>`， `<head>` 和 `<body>` 标签，伴随着 `{{ghost_head}}` 和 `{{ghost_foot}}`，同样还有组成了博客重复的头部和尾部的HTML。

默认模板包含了hanglebars表达式 `{{{body}}}` 来表示那些继承了默认模板的模板的内容。

页面模板使用 `{{!< default}}` 作为第一行来表明他们继承了默认的模板，这样一来他们的内容就被放置于默认模板中 `{{{body}}}` 定义的地方了。

### index.hbs

这是首页的模板文件，继承了 <code class="path">default.hbs</code>。 首页有一系列文章需要展示，<code class="path">index.hbs</code> 定义了每篇文章该如何展示。

在Casper（目前的默认主题）中，首页有一个很大的头部，使用了`@blog`全局设置来展现博客的logo，标题和描述。 接下去使用了 `{{#foreach}}` 来展现一系列最新的文章。

### post.hbs

这是单篇文章的模板文件，同样继承了 <code class="path">default.hbs</code>。

在Casper（目前的默认主题）中，单篇文章模板有属于自己的头部，同样使用了 `@blog` 的全局设置，然后使用了 `{{#post}}` 数据处理器展现整篇文章。

### 文章样式 & 预览

当你在为Ghost创建主题的时候，请注意classes特别是IDS的使用范围，尽可能避免在主样式和文章样式之间造成冲突。你不会想到一个类名或者是一个ID（由于标题的ID将自动生成）可能已经在一篇文章样式中被使用。因此，最好将使用范围限定在特定的页面。比如，#my-id可能会造成无法预料的冲突，但是#themename-my-id将会更安全一些。

Ghost计划在你写文章时提供实时预览功能，但是为了实现这个功能，我们必须在管理界面载入主题中定制的文章样式。这个特点还没有引入，但是我们强烈建议将你的文章样式从主题的其他样式(style.css)中独立出来形成一个单独的文件(post.css)，这样的话你就能在将来快速的利用这个特点了。

## 创建属于你自己的主题 <a id="create-your-own"></a>

你可以通过在<code class="path">content/themes</code>目录下拷贝Casper或者以你自己的名称新建一个目录，比如my-theme（名称应该小写并且只能包含字母，数字和连字符）来创建一个属于你自己的Ghost主题。然后在你新建的主题目录中新增两个空文件：index.hbs和post.hbs。 这个主题不会展示任何东西，但它实际上是一个有效的主题。

### 文章列表

<code class="path">index.hbs</code>有一个叫做`posts`的对象， 它可以被foreach helper用来输出每篇文章。比如：

```
{{#foreach posts}}
// 这里我们就在单篇文章的上下文环境下了
// 无论你在这里放什么，文章列表中的每篇文章都会运行一遍
{{/foreach}}
```

查看[`{{#foreach}}`](#foreach-helper) helper部分了解详情。

#### 分页

请查看关于[`{{pagination}}`](#pagination-helper) helper部分的内容。

### 输出单篇文章

无论是通过使用`foreach`遍历文章列表或者在 <code class="path">post.hbs</code> 内部，一旦你进入了单篇文章的上下文环境，你就可以使用文章的相关属性了。

目前为止，有以下相关属性：

*   id – *文章id*
*   title – *文章标题*
*   url – *文章的相对路径*
*   content – *文章的HTML*
*   published_at – *文章的发布日期*
*   author – *作者的详细信息* （将会在下文中详细说明）

每个属性都可以使用标准的handlebars表达式进行输出，比如`{{title}}`。

<div class="note">
  <p>
    <strong>注意：</strong> <ul>
      <li>
        content属性被<code>{{content}}</code>helper覆写了，这样可以保证HTML可以安全并正确地得到输出。查看关于<a href="#content-helper"><code>{{content}}</code> helper</a>的部分了解详情。
      </li>
      <li>
        url属性由<code>{{url}}</code>helper提供。查看关于<a href="#url-helper"><code>{{url}}</code> helper</a>的部分了解详情。
      </li>
    </ul>
  </p>
</div>

#### 文章作者

在单篇文章的情况下，可以使用以下这些与作者有关的信息：

*   `{{author.name}}` – 作者的姓名 
*   `{{author.email}}` – 作者的Email地址
*   `{{author.bio}}` – 作者的自我简介
*   `{{author.website}}` – 作者的网址
*   `{{author.image}}` – 作者的个人头像
*   `{{author.cover}}` – 作者的背景图像

你可以直接使用`{{author}}`来输出作者的姓名。

同样可以使用区块表达式：

```
{{#author}}
    <a href="mailto:{{email}}">Email {{name}}</a>
{{/author}}
```

#### 文章标签

在单篇文章的情况下，可以使用以下这些与标签有关的信息：

*   `{{tag.name}}` – 标签的名称 

你可以使用`{{tags}}`来输出一排以逗号分隔的标签，或者如果你喜欢，可以使用`{{tags separator=""}}`来指定分隔符

区块表达式同样可以使用：

```
<ul>
    {{#tags}}
        <li>{{name}}</li>
    {{/tags}}
</ul>
```

### 全局设置

通过`@blog`全局数据存取器，Ghost主题可以使用许多全局设置。

*   `{{@blog.url}}` – 在<code class="path">config.js</code>文件中当前环境（配置文件分开发环境和生产环境）下指定的网址 
*   `{{@blog.title}}` – 设置页面中的博客标题
*   `{{@blog.description}}` – 设置页面中的博客描述
*   `{{@blog.logo}}` – 设置页面中的博客logo

## Built-in Helpers <a id="helpers"></a>

Ghost has a number of built in helpers which give you the tools you need to build your theme. Helpers are classified into two types: block and output helpers.

**[Block Helpers](http://handlebarsjs.com/block_helpers.html)** have a start and end tag E.g. `{{#foreach}}{{/foreach}}`. The context between the tags changes and these helpers may also provide you with additional properties which you can access with the `@` symbol.

**Output Helpers** look much the same as the expressions used for outputting data e.g. `{{content}}`. They perform useful operations on the data before outputting it, and often provide you with options for how to format the data. Some output helpers use templates to format the data with HTML a bit like partials. Some output helpers are also block helpers, providing a variation of their functionality.

### <code>foreach</code> <a id="foreach-helper"></a>

*   Helper type: block
*   Options: `columns` (number)

`{{#foreach}}` is a special loop helper designed for working with lists of posts. By default the each helper in handlebars adds the private properties `@index` for arrays and `@key` for objects, which can be used inside the each loop.

`foreach` extends this and adds the additional private properties of `@first`, `@last`, `@even`, `@odd`, `@rowStart` and `@rowEnd` to both arrays and objects. This can be used to produce more complex layouts for post lists and other content. For examples see below:

#### `@first` & `@last`

The following example checks through an array or object e.g `posts` and tests for the first entry.

```
{{#foreach posts}}
    {{#if @first}}
        <div>First post</div>
    {{/if}}
{{/foreach}}
```

We can also nest `if` statements to check multiple properties. In this example we are able to output the first and last post separately to other posts.

```
{{#foreach posts}}
    {{#if @first}}
    <div>First post</div>
    {{else}}
        {{#if @last}}
            <div>Last post</div>
        {{else}}
            <div>All other posts</div>
        {{/if}}
    {{/if}}
{{/foreach}}
```

#### `@even` & `@odd`

The following example adds a class of even or odd, which could be used for zebra striping content:

```
{{#foreach posts}}
        <div class="{{#if @even}}even{{else}}odd{{/if}}">{{title}}</div>
{{/foreach}}
```

#### `@rowStart` & `@rowEnd`

The following example shows you how to pass in a column argument so that you can set properties for the first and last element in a row. This allows for outputting content in a grid layout.

```
{{#foreach posts columns=3}}
    <li class="{{#if @rowStart}}first{{/if}}{{#if @rowEnd}}last{{/if}}">{{title}}</li>
{{/foreach}}
```

### <code>content</code> <a id="content-helper"></a>

*   Helper type: output
*   Options: `words` (number), `characters` (number) [defaults to show all]

`{{content}}` is a very simple helper used for outputting post content. It makes sure that your HTML gets output correctly.

You can limit the amount of HTML content to output by passing one of the options:

`{{content words="100"}}` will output just 100 words of HTML with correctly matched tags.

### <code>excerpt</code> <a id="excerpt-helper"></a>

*   Helper type: output
*   Options: `words` (number), `characters` (number) [defaults to 50 words]

`{{excerpt}}` outputs content but strips all HTML. This is useful for creating excerpts of posts.

You can limit the amount of text to output by passing one of the options:

`{{excerpt characters="140"}}` will output 140 characters of text.

### <code>date</code> <a id="date-helper"></a>

*   Helper type: output
*   Options: `format` (date format, default “MMM Do, YYYY”), `timeago` (boolean)

`{{date}}` is a formatting helper for outputting dates in various format. You can either pass it a date and a format string to be used to output the date like so:

```
// outputs something like 'July 11, 2014'
{{date published_at format="MMMM DD, YYYY"}}
```

Or you can pass it a date and the timeago flag:

```
// outputs something like '5 mins ago'
{{date published_at timeago="true"}}
```

If you call `{{date}}` without a format, it will default to “MMM Do, YYYY”.

If you call `{{date}}` in the context of a post without telling it which date to display, it will default to `published_at`.

If you call `{{date}}` outside the context of a post without telling it which date to display, it will default to the current date.

`date` uses [moment.js](http://momentjs.com/) for formatting dates. See their [documentation](http://momentjs.com/docs/#/parsing/string-format/) for a full explanation of all the different format strings that can be used.

### <code>url</code> <a id="url-helper"></a>

*   Helper type: output
*   Options: `absolute`

`{{url}}` outputs the relative url for a post when inside the post context. Outside of the post context it will output nothing

You can force the url helper to output an absolute url by using the absolute option, E.g. `{{url absolute="true"}}`

###  <code>pagination</code> <a href="pagination-helper"></a>

*   Helper type: output, template-driven
*   Options: none (coming soon)

`{{pagination}}` is a template driven helper which outputs HTML for 'newer posts' and 'older posts' links if they are available and also says which page you are on.

You can override the HTML output by the pagination helper by placing a file called <code class="path">pagination.hbs</code> inside of <code class="path">content/themes/your-theme/partials</code>.

### <code>body_class</code> <a id="bodyclass-helper"></a>

*   Helper type: output
*   Options: none

`{{body_class}}` – outputs classes intended for the `<body>` tag in <code class="path">default.hbs</code>, useful for targeting specific pages with styles.

### <code>post_class</code> <a id="postclass-helper"></a>

*   Helper type: output
*   Options: none

`{{post_class}}` – outputs classes intended your post container, useful for targeting posts with styles.

### <code>ghost_head</code> <a id="ghosthead-helper"></a>

*   Helper type: output
*   Options: none

`{{ghost_head}}` – belongs just before the `</head>` tag in <code class="path">default.hbs</code>, used for outputting meta tags, scripts and styles. Will be hookable.

### <code>ghost_foot</code> <a id="ghostfoot-helper"></a>

*   Helper type: output
*   Options: none

`{{ghost_foot}}` – belongs just before the `</body>` tag in <code class="path">default.hbs</code>, used for outputting scripts. Outputs jquery by default. Will be hookable.

### <code>meta_title</code> <a id="metatitle-helper"></a>

*   Helper type: output
*   Options: none

`{{meta_title}}` – outputs the post title on posts, or otherwise the blog title. Used for outputting title tags in the `</head>` block. E.g. `<title>{{meta_title}}</title>`. Will be hookable.

### <code>meta_description</code> <a id="metatitledescription-helper"></a>

*   Helper type: output
*   Options: none

`{{meta_description}}` - outputs nothing (yet) on posts, outputs the blog description on all other pages. Used for outputing the description meta tag. E.g. `<meta name="description" content="{{meta_description}}" />`. Will be hookable.

## Troubleshooting Themes <a id="troubleshooting"></a>

#### 1. I see Error: Failed to lookup view "index" or "post"

Check that your theme folder contains a correctly named index.hbs and post.hbs as these are required

{% endraw %}
