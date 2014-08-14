# [Ghost](https://github.com/TryGhost/Ghost) [![Build Status](https://travis-ci.org/TryGhost/Ghost.svg?branch=master)](https://travis-ci.org/TryGhost/Ghost)

#### Quickstart:
1. 请先切换到 stable 分支，再clone 代码
2. 数据库脚本 见 /360云盘/项目/笔戈博客/数据库/bigertech_blog2.0.sql
3. 复制 config.example.js ，命名为 config.js 。
修改文件config.js  中的development 下的数据库配置信息 ，

```
database: {
            client: 'mysql',
            connection: {
                host     : '127.0.0.1',
                user     : 'root',
                password : 'root',
                database : 'bigertech_blog',
                charset  : 'UTF8_GENERAL_CI'
            }
        },

```

在控制台，切换到工作目录，执行以下命令

1. `npm install -g grunt-cli`
1. `npm install`
1. `grunt init` (and `grunt prod` if you want to run Ghost in production mode)
1. `npm start`

## 后台插入文章类别和模板对应关系
编辑文章界面可以选择文章的类型，如果是视频 则需要在 tag 中的第一个位置插入，优酷的视频ID

文章类型	| 前端模板
----|-------
文字博客  | post-article.hbs
评测视频  | post-video.hbs
活动宣传  | post-active.hbs
专题      | post-topic.hbs

## 新增改动
*  文章类别选择
*  每篇文章加入 文章图片
*  默认文章url为标题的拼音链接， 修改为数字
*  文章在界面中的位置指定
*  点赞功能
*  多说评论
*  百度统计




## Copyright & License
笔戈科技出品

Copyright (c) 2013-2014 Ghost Foundation - Released under the [MIT license](LICENSE).
