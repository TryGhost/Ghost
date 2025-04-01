const assert = require('assert/strict');
const path = require('path');

const EmailContentGenerator = require('../../../../../core/server/services/lib/EmailContentGenerator');

describe('Mail: EmailContentGenerator', function () {
    it('generate welcome', async function () {
        const emailContentGenerator = new EmailContentGenerator({
            getSiteTitle: () => 'The Ghost Blog',
            getSiteUrl: () => 'http://myblog.com',
            templatesDir: path.resolve(__dirname, './fixtures/templates/')
        });

        const content = await emailContentGenerator.getContent({
            template: 'welcome',
            data: {
                ownerEmail: 'test@example.com'
            }
        });

        assert.match(content.html, /<title>Welcome to Ghost<\/title>/);
        assert.match(content.html, /This email was sent from <a href="http:\/\/myblog.com" style="color: #738A94;">http:\/\/myblog.com<\/a> to <a href="mailto:test@example.com" style="color: #738A94;">test@example.com<\/a><\/p>/);

        assert.match(content.text, /Email Address: test@example.com \[test@example.com\]/);
        assert.match(content.text, /This email was sent from http:\/\/myblog.com/);
    });

    it('generates newsletter template', async function () {
        const emailContentGenerator = new EmailContentGenerator({
            getSiteTitle: () => 'The Ghost Blog',
            getSiteUrl: () => 'http://myblog.com',
            templatesDir: path.resolve(__dirname, './fixtures/templates/')
        });

        const content = await emailContentGenerator.getContent({
            template: 'newsletter',
            data: {
                blog: {
                    logo: 'http://myblog.com/content/images/blog-logo.jpg',
                    title: 'The Ghost Blog',
                    url: 'http://myblog.com',
                    twitter: 'http://twitter.com/ghost',
                    facebook: 'https://www.facebook.com/ghost',
                    unsubscribe: 'http://myblog.com/unsubscribe',
                    post: [
                        {
                            picture: 'http://myblog.com/content/images/post-1-image.jpg',
                            title: 'Featured blog post',
                            text: 'This is a featured blog post. It&#x2019;s awesome&#x2026;',
                            url: 'http://myblog.com/featured-blog-post',
                            tag: 'featured',
                            author: 'harry potter'
                        },
                        {
                            picture: 'http://myblog.com/content/images/post-2-image.jpg',
                            title: 'Second blog post',
                            text: 'This is the second blog post. It&#x2019;s also awesome&#x2026;',
                            url: 'http://myblog.com/second-blog-post',
                            tag: 'second',
                            author: 'lord voldemord'
                        },
                        {
                            picture: 'http://myblog.com/content/images/post-3-image.jpg',
                            title: 'Third blog post',
                            text: 'This is the third blog post. It&#x2019;s also awesome&#x2026;',
                            url: 'http://myblog.com/third-blog-post',
                            tag: 'third',
                            author: 'marry poppins'
                        },
                        {
                            picture: 'http://myblog.com/content/images/post-4-image.jpg',
                            title: 'Fourth blog post',
                            text: 'This is the fourth blog post. It&#x2019;s also awesome&#x2026;',
                            url: 'http://myblog.com/fourth-blog-post',
                            tag: 'fourth',
                            author: 'donald duck'
                        },
                        {
                            picture: 'http://myblog.com/content/images/post-5-image.jpg',
                            title: 'Fifth blog post',
                            text: 'This is the fifth blog post. It&#x2019;s also awesome&#x2026;',
                            url: 'http://myblog.com/fifth-blog-post',
                            tag: 'fifth',
                            author: 'casper the ghost'
                        }
                    ]
                },
                newsletter: {
                    interval: 'monthly',
                    date: 'june, 9th 2016'
                }
            }
        });

        assert.match(content.html, /<title>The Ghost Blog<\/title>/);
        assert.match(content.html, /<span style="text-transform:capitalize">monthly<\/span> digest/);
        assert.match(content.html, /<span style="text-transform:capitalize">june, 9th 2016<\/span><\/h3>/);

        assert.match(content.text, /MONTHLY DIGEST — JUNE, 9TH 2016/);
        assert.match(content.text, /SECOND BLOG POST \[HTTP:\/\/MYBLOG.COM\/SECOND-BLOG-POST\]/);
    });
});
