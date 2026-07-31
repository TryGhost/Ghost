const assert = require('node:assert/strict');
const path = require('path');

const EmailContentGenerator = require('../../../../../core/server/services/lib/email-content-generator');

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
});
