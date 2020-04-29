const should = require('should');

// Stuff we are testing
const helpers = require('../../../core/frontend/helpers');

describe('{{content}} helper', function () {
    it('renders empty string when null', function () {
        const html = null;
        const rendered = helpers.content.call({html: html});

        should.exist(rendered);
        rendered.string.should.equal('');
    });

    it('can render content', function () {
        const html = 'Hello World';
        const rendered = helpers.content.call({html: html});

        should.exist(rendered);
        rendered.string.should.equal(html);
    });

    it('can truncate html by word', function () {
        const html = '<p>Hello <strong>World! It\'s me!</strong></p>';

        const rendered = (
            helpers.content
                .call(
                    {html: html},
                    {hash: {words: 2}}
                )
        );

        should.exist(rendered);
        rendered.string.should.equal('<p>Hello <strong>World!</strong></p>');
    });

    it('can truncate html to 0 words', function () {
        const html = '<p>Hello <strong>World! It\'s me!</strong></p>';

        const rendered = (
            helpers.content
                .call(
                    {html: html},
                    {hash: {words: '0'}}
                )
        );

        should.exist(rendered);
        rendered.string.should.equal('');
    });

    it('can truncate html by character', function () {
        const html = '<p>Hello <strong>World! It\'s me!</strong></p>';

        const rendered = (
            helpers.content
                .call(
                    {html: html},
                    {hash: {characters: 8}}
                )
        );

        should.exist(rendered);
        rendered.string.should.equal('<p>Hello <strong>Wo</strong></p>');
    });
});
