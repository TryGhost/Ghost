const assert = require('node:assert/strict');
const NewslettersImporter = require('../../../../../../../core/server/data/importer/importers/data/newsletters-importer');

const fakeNewsletters = [{
    id: '1',
    name: 'Daily newsletter',
    slug: 'daily-newsletter',
    description: '',
    sender_name: 'Jamie',
    sender_email: 'jamie@example.com',
    sender_reply_to: 'newsletter',
    status: 'active',
    subscribe_on_signup: true,
    title_font_category: 'serif',
    body_font_category: 'serif',
    show_header_icon: true,
    show_header_title: true,
    show_badge: true,
    sort_order: 1
}, {
    id: '2',
    name: 'Weekly roundup',
    slug: 'weekly-roundup',
    description: '',
    sender_name: 'Jamie',
    sender_email: 'jamie@example.com',
    sender_reply_to: 'newsletter',
    status: 'active',
    subscribe_on_signup: false,
    title_font_category: 'serif',
    body_font_category: 'serif',
    show_header_icon: true,
    show_header_title: true,
    show_badge: true,
    sort_order: 2
}];

describe('NewslettersImporter', function () {
    describe('#beforeImport', function () {
        it('Removes the sender_email column', function () {
            const importer = new NewslettersImporter({newsletters: fakeNewsletters});

            importer.beforeImport();
            assert.equal(importer.dataToImport.length, 2);

            const newsletter1 = importer.dataToImport[0];
            const newsletter2 = importer.dataToImport[1];

            assert.equal(newsletter1.name, 'Daily newsletter');
            assert.equal(newsletter1.sender_email, undefined);

            assert.equal(newsletter2.name, 'Weekly roundup');
            assert.equal(newsletter2.sender_email, undefined);
        });
    });
});
