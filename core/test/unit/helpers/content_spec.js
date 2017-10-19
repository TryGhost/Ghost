var should = require('should'), // jshint ignore:line

// Stuff we are testing
    helpers = require('../../../server/helpers');

describe('{{content}} helper', function () {
    it('can render content', function () {
        var html = 'Hello World',
            rendered = helpers.content.call({html: html});

        should.exist(rendered);
        rendered.string.should.equal(html);
    });

    it('can truncate html by word', function () {
        var html = '<p>Hello <strong>World! It\'s me!</strong></p>',
            rendered = (
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
        var html = '<p>Hello <strong>World! It\'s me!</strong></p>',
            rendered = (
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
        var html = '<p>Hello <strong>World! It\'s me!</strong></p>',
            rendered = (
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
