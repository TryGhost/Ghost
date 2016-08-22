var should         = require('should'),

// Stuff we are testing
    ampComponentsHelper    = require('../lib/helpers/amp_components');

describe('{{amp_components}} helper', function () {
    it('adds script tag for a gif', function () {
        var post = {
                html: '<img src="https://media.giphy.com/media/UsmcxQeK7BRBK/giphy.gif" alt="yoda" />'
            },
            rendered;

        rendered = ampComponentsHelper.call(
            {relativeUrl: '/post/amp/', safeVersion: '0.3', context: ['amp', 'post'], post: post},
            {data: {root: {context: ['amp', 'post']}}});

        should.exist(rendered);
        rendered.should.match(/<script async custom-element="amp-anim" src="https:\/\/cdn.ampproject.org\/v0\/amp-anim-0.1.js"><\/script>/);
    });

    it('adds script tag for an iframe tag', function () {
        var post = {
                html: '<iframe src="//giphy.com/embed/o0vwzuFwCGAFO" width="480" height="480" frameBorder="0" class="giphy-embed" allowFullScreen></iframe>'
            },
            rendered;

        rendered = ampComponentsHelper.call(
            {relativeUrl: '/post/amp/', safeVersion: '0.3', context: ['amp', 'post'], post: post},
            {data: {root: {context: ['amp', 'post']}}});

        should.exist(rendered);
        rendered.should.match(/<script async custom-element="amp-iframe" src="https:\/\/cdn.ampproject.org\/v0\/amp-iframe-0.1.js"><\/script>/);
    });

    it('adds script tag for an audio tag', function () {
        var post = {
                html: '<audio src="myaudiofile.mp3"/>'
            },
            rendered;

        rendered = ampComponentsHelper.call(
            {relativeUrl: '/post/amp/', safeVersion: '0.3', context: ['amp', 'post'], post: post},
            {data: {root: {context: ['amp', 'post']}}});

        should.exist(rendered);
        rendered.should.match(/<script async custom-element="amp-audio" src="https:\/\/cdn.ampproject.org\/v0\/amp-audio-0.1.js"><\/script>/);
    });

    it('returns if no html is provided', function () {
        var post = {},
            rendered;

        rendered = ampComponentsHelper.call(
            {relativeUrl: '/post/amp/', safeVersion: '0.3', context: ['amp', 'post'], post: post},
            {data: {root: {context: ['amp', 'post']}}});

        should.not.exist(rendered);
    });
});
