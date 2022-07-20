const should = require('should');

// Stuff we are testing
const ampComponentsHelper = require('../../../../../core/frontend/apps/amp/lib/helpers/amp_components');

describe('{{amp_components}} helper', function () {
    it('adds script tag for a gif', function () {
        const post = {
            html: '<img src="https://media.giphy.com/media/UsmcxQeK7BRBK/giphy.gif" alt="yoda" />'
        };

        let rendered;

        rendered = ampComponentsHelper.call(
            {relativeUrl: '/post/amp/', safeVersion: '0.3', context: ['amp', 'post'], post: post},
            {data: {root: {context: ['amp', 'post']}}});

        should.exist(rendered);
        rendered.should.match(/<script async custom-element="amp-anim" src="https:\/\/cdn.ampproject.org\/v0\/amp-anim-0.1.js"><\/script>/);
    });

    it('adds script tag for an iframe tag', function () {
        const post = {
            html: '<iframe src="//giphy.com/embed/o0vwzuFwCGAFO" width="480" height="480" frameBorder="0" class="giphy-embed" allowFullScreen></iframe>'
        };

        let rendered;

        rendered = ampComponentsHelper.call(
            {relativeUrl: '/post/amp/', safeVersion: '0.3', context: ['amp', 'post'], post: post},
            {data: {root: {context: ['amp', 'post']}}});

        should.exist(rendered);
        rendered.should.match(/<script async custom-element="amp-iframe" src="https:\/\/cdn.ampproject.org\/v0\/amp-iframe-0.1.js"><\/script>/);
    });

    it('adds script tag for a youtube embed', function () {
        const post = {
            html: '<iframe src="https://www.youtube.com/embed/zqNTltOGh5c" frameborder="0"></iframe>'
        };

        let rendered;

        rendered = ampComponentsHelper.call(
            {relativeUrl: '/post/amp/', safeVersion: '0.3', context: ['amp', 'post'], post: post},
            {data: {root: {context: ['amp', 'post']}}});

        should.exist(rendered);
        rendered.should.match(/<script async custom-element="amp-youtube" src="https:\/\/cdn.ampproject.org\/v0\/amp-youtube-0.1.js"><\/script>/);
    });

    it('adds scripts for youtube embeds and iframes', function () {
        const post = {
            html: `
                    <iframe src="https://www.youtube.com/embed/zqNTltOGh5c" frameborder="0">
                    </iframe>
                    <iframe src="//giphy.com/embed/o0vwzuFwCGAFO" width="480" height="480" frameBorder="0" class="giphy-embed" allowFullScreen>
                    </iframe>
                `
        };

        let rendered;

        rendered = ampComponentsHelper.call(
            {relativeUrl: '/post/amp/', safeVersion: '0.3', context: ['amp', 'post'], post: post},
            {data: {root: {context: ['amp', 'post']}}});

        should.exist(rendered);
        rendered.should.match(/<script async custom-element="amp-youtube" src="https:\/\/cdn.ampproject.org\/v0\/amp-youtube-0.1.js"><\/script>/);
        rendered.should.match(/<script async custom-element="amp-iframe" src="https:\/\/cdn.ampproject.org\/v0\/amp-iframe-0.1.js"><\/script>/);
    });

    it('adds script tag for an audio tag', function () {
        const post = {
            html: '<audio src="myaudiofile.mp3"/>'
        };

        let rendered;

        rendered = ampComponentsHelper.call(
            {relativeUrl: '/post/amp/', safeVersion: '0.3', context: ['amp', 'post'], post: post},
            {data: {root: {context: ['amp', 'post']}}});

        should.exist(rendered);
        rendered.should.match(/<script async custom-element="amp-audio" src="https:\/\/cdn.ampproject.org\/v0\/amp-audio-0.1.js"><\/script>/);
    });

    it('returns if no html is provided', function () {
        const post = {};
        let rendered;

        rendered = ampComponentsHelper.call(
            {relativeUrl: '/post/amp/', safeVersion: '0.3', context: ['amp', 'post'], post: post},
            {data: {root: {context: ['amp', 'post']}}});

        should.not.exist(rendered);
    });
});
