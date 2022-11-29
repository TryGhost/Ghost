const EmailRenderer = require('../lib/email-renderer');
const assert = require('assert');

describe('Email renderer', function () {
    describe('buildReplacementDefinitions', function () {
        const emailRenderer = new EmailRenderer({
            urlUtils: {
                urlFor: () => 'http://example.com'
            }
        });
        const newsletter = {
            get: () => '123'
        };
        const member = {
            id: '456',
            uuid: 'myuuid',
            name: 'Test User',
            email: 'test@example.com'
        };

        it('returns an empty list of replacemetns if none used', function () {
            const html = 'Hello world';
            const replacements = emailRenderer.buildReplacementDefinitions({html, newsletter});
            assert.equal(replacements.length, 0);
        });

        it('returns a replacement if it is used', function () {
            const html = 'Hello world %%{uuid}%%';
            const replacements = emailRenderer.buildReplacementDefinitions({html, newsletter});
            assert.equal(replacements.length, 1);
            assert.equal(replacements[0].token.toString(), '/%%\\{uuid\\}%%/g');
            assert.equal(replacements[0].id, 'uuid');
            assert.equal(replacements[0].getValue(member), 'myuuid');
        });

        it('returns a replacement only once if used multiple times', function () {
            const html = 'Hello world %%{uuid}%% And %%{uuid}%%';
            const replacements = emailRenderer.buildReplacementDefinitions({html, newsletter});
            assert.equal(replacements.length, 1);
            assert.equal(replacements[0].token.toString(), '/%%\\{uuid\\}%%/g');
            assert.equal(replacements[0].id, 'uuid');
            assert.equal(replacements[0].getValue(member), 'myuuid');
        });

        it('returns correct first name', function () {
            const html = 'Hello %%{first_name}%%,';
            const replacements = emailRenderer.buildReplacementDefinitions({html, newsletter});
            assert.equal(replacements.length, 1);
            assert.equal(replacements[0].token.toString(), '/%%\\{first_name\\}%%/g');
            assert.equal(replacements[0].id, 'first_name');
            assert.equal(replacements[0].getValue(member), 'Test');
        });

        it('supports fallback values', function () {
            const html = 'Hey %%{first_name, "there"}%%,';
            const replacements = emailRenderer.buildReplacementDefinitions({html, newsletter});
            assert.equal(replacements.length, 1);
            assert.equal(replacements[0].token.toString(), '/%%\\{first_name, "there"\\}%%/g');
            assert.equal(replacements[0].id, 'first_name, "there"');
            assert.equal(replacements[0].getValue(member), 'Test');

            // In case of empty name
            assert.equal(replacements[0].getValue({name: ''}), 'there');
        });

        it('supports combination of multiple fallback values', function () {
            const html = 'Hey %%{first_name, "there"}%%, %%{first_name, "member"}%% %%{first_name}%% %%{first_name, "there"}%%';
            const replacements = emailRenderer.buildReplacementDefinitions({html, newsletter});
            assert.equal(replacements.length, 3);
            assert.equal(replacements[0].token.toString(), '/%%\\{first_name, "there"\\}%%/g');
            assert.equal(replacements[0].id, 'first_name, "there"');
            assert.equal(replacements[0].getValue(member), 'Test');

            // In case of empty name
            assert.equal(replacements[0].getValue({name: ''}), 'there');

            assert.equal(replacements[1].token.toString(), '/%%\\{first_name, "member"\\}%%/g');
            assert.equal(replacements[1].id, 'first_name, "member"');
            assert.equal(replacements[1].getValue(member), 'Test');

            // In case of empty name
            assert.equal(replacements[1].getValue({name: ''}), 'member');

            assert.equal(replacements[2].token.toString(), '/%%\\{first_name\\}%%/g');
            assert.equal(replacements[2].id, 'first_name');
            assert.equal(replacements[2].getValue(member), 'Test');

            // In case of empty name
            assert.equal(replacements[2].getValue({name: ''}), '');
        });
    });
});
