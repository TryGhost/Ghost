import assert from 'node:assert/strict';
import {callRenderer} from '../test-utils/index.js';
import {renderPodcastNode} from '../../src/nodes/podcast/podcast-renderer.js';

describe('renderers/podcast-renderer', function () {
    function getTestData(overrides = {}) {
        return {
            podcastTitle: 'The Daily Awesome',
            title: 'Episode 1',
            description: 'The first <episode>',
            episodeUrl: 'https://example.com/episode-1.mp3',
            duration: '42:10',
            artworkUrl: 'https://example.com/artwork.jpg',
            ...overrides
        };
    }

    it('defaults options before validating document creation', function () {
        assert.throws(
            () => renderPodcastNode(getTestData()),
            /Must be passed a `createDocument` function as an option when used in a non-browser environment/
        );
    });

    describe('web', function () {
        it('renders the show, title, escaped description, artwork and audio player', function () {
            const result = callRenderer('podcast', getTestData());

            assert.ok(result.html.includes('kg-podcast-card'));
            assert.ok(result.html.includes('The Daily Awesome'));
            assert.ok(result.html.includes('Episode 1'));
            assert.ok(result.html.includes('42:10'));
            assert.ok(result.html.includes('src="https://example.com/artwork.jpg"'));
            assert.ok(result.html.includes('The first &lt;episode&gt;'));
            assert.ok(result.html.includes('<audio'));
            assert.ok(result.html.includes('src="https://example.com/episode-1.mp3"'));
        });

        it('omits the player and artwork when they are not set', function () {
            const result = callRenderer('podcast', getTestData({episodeUrl: '', artworkUrl: ''}));

            assert.ok(!result.html.includes('<audio'));
            assert.ok(!result.html.includes('<img'));
        });
    });

    describe('email', function () {
        it('renders a table with a listen link', function () {
            const result = callRenderer('podcast', getTestData(), {target: 'email'});

            assert.ok(result.html.includes('<table'));
            assert.ok(result.html.includes('The Daily Awesome'));
            assert.ok(result.html.includes('Listen to the episode'));
            assert.ok(result.html.includes('href="https://example.com/episode-1.mp3"'));
        });
    });
});
