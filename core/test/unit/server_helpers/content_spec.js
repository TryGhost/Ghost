/*globals describe, before, it*/
/*jshint expr:true*/
var should         = require('should'),
    hbs            = require('express-hbs'),
    utils          = require('./utils'),

// Stuff we are testing
    handlebars     = hbs.handlebars,
    helpers        = require('../../../server/helpers');

describe('{{content}} helper', function () {
    before(function () {
        utils.loadHelpers();
    });

    it('has loaded content helper', function () {
        should.exist(handlebars.helpers.content);
    });

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
        rendered.string.should.equal('<p></p>');
    });

    it('can truncate html to 0 words, leaving image tag if it is first', function () {
        var html = '<p><img src="example.jpg" />Hello <strong>World! It\'s me!</strong></p>',
            rendered = (
                helpers.content
                    .call(
                    {html: html},
                    {hash: {words: '0'}}
                )
                );

        should.exist(rendered);
        rendered.string.should.equal('<p><img src="example.jpg" /></p>');
    });

    it('can truncate html to 0 words, leaving image tag with attributes', function () {
        var html = '<p><img src="example.png" alt="Alternative" title="Title"></p>',
            rendered = (
                helpers.content
                    .call(
                    {html: html},
                    {hash: {words: '0'}}
                )
                );

        should.exist(rendered);
        rendered.string.should.equal('<p><img src="example.png" alt="Alternative" title="Title"></p>');
    });

    it('can truncate html to 0 words, leaving first image tag & if alt text has a single quote', function () {
        var html = '<p><img src="example.jpg" alt="It\'s me!" />Hello <strong>World! It\'s me!</strong></p>',
            rendered = (
                helpers.content
                    .call(
                    {html: html},
                    {hash: {words: '0'}}
                )
                );

        should.exist(rendered);
        rendered.string.should.equal('<p><img src="example.jpg" alt="It\'s me!" /></p>');
    });

    it('can truncate html to 0 words, leaving first image tag & if alt text has a double quote', function () {
        var html = '<p><img src="example.jpg" alt="A double quote is \'" />' +
                'Hello <strong>World! It\'s me!</strong></p>',
            rendered = (
                helpers.content
                    .call(
                    {html: html},
                    {hash: {words: '0'}}
                )
                );

        should.exist(rendered);
        rendered.string.should.equal('<p><img src="example.jpg" alt="A double quote is \'" /></p>');
    });

    it('can truncate html to 0 words, leaving first image tag if it contains > & <', function () {
        var html = '<p><img src="examp>><><>le.png"></p>',
            rendered = (
                helpers.content
                    .call(
                    {html: html},
                    {hash: {words: '0'}}
                )
                );

        should.exist(rendered);
        rendered.string.should.equal('<p><img src="examp>><><>le.png"></p>');
    });

    it('can truncate html to 0 words, leaving first two image tags', function () {
        var html = '<p><img src="example.png"><img src="example.png">Hi<img src="example.png"></p>',
            rendered = (
                helpers.content
                    .call(
                    {html: html},
                    {hash: {words: '0'}}
                )
                );

        should.exist(rendered);
        rendered.string.should.equal('<p><img src="example.png"><img src="example.png"></p>');
    });

    it('can truncate html to 0 words, removing image if text comes first', function () {
        var html = '<p><a>Bli<a><a><img src="example.png"></a></a>Blob</a></p>',
            rendered = (
                helpers.content
                    .call(
                    {html: html},
                    {hash: {words: '0'}}
                )
                );

        should.exist(rendered);
        rendered.string.should.equal('<p><a></a></p>');
    });

    it('can truncate html to 0 words, leaving video tag', function () {
        var html = '<p><video><source src="movie.mp4"><source src="movie.ogg"></video></p>',
            rendered = (
                helpers.content
                    .call(
                    {html: html},
                    {hash: {words: '0'}}
                )
                );

        should.exist(rendered);
        rendered.string.should.equal('<p><video><source src="movie.mp4"><source src="movie.ogg"></video></p>');
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
