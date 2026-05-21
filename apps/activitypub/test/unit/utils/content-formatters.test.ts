/**
 * @vitest-environment jsdom
 */

import {disableVideoCardAutoplay} from '../../../src/utils/content-formatters';

describe('disableVideoCardAutoplay', function () {
    it('makes autoplay video cards manual and inline-playable', function () {
        const result = disableVideoCardAutoplay(`
            <figure class="kg-card kg-video-card">
                <div class="kg-video-container">
                    <video src="/video.mp4" autoplay loop muted playsinline></video>
                    <div class="kg-video-player-container kg-video-hide"></div>
                </div>
            </figure>
        `);

        const div = document.createElement('div');
        div.innerHTML = result;

        const video = div.querySelector('video') as HTMLVideoElement;
        const playerContainer = div.querySelector('.kg-video-player-container');

        expect(video.hasAttribute('autoplay')).toBe(false);
        expect(video.hasAttribute('loop')).toBe(false);
        expect(video.autoplay).toBe(false);
        expect(video.loop).toBe(false);
        expect(video.hasAttribute('muted')).toBe(true);
        expect(video.hasAttribute('playsinline')).toBe(true);
        expect(video.hasAttribute('webkit-playsinline')).toBe(true);
        expect(video.hasAttribute('x5-playsinline')).toBe(true);
        expect(playerContainer?.classList.contains('kg-video-hide')).toBe(false);
    });

    it('leaves non-autoplay video cards unchanged', function () {
        const result = disableVideoCardAutoplay(`
            <figure class="kg-card kg-video-card">
                <div class="kg-video-container">
                    <video src="/video.mp4" loop muted playsinline></video>
                    <div class="kg-video-player-container kg-video-hide"></div>
                </div>
            </figure>
        `);

        const div = document.createElement('div');
        div.innerHTML = result;

        const video = div.querySelector('video') as HTMLVideoElement;
        const playerContainer = div.querySelector('.kg-video-player-container');

        expect(video.hasAttribute('autoplay')).toBe(false);
        expect(video.hasAttribute('loop')).toBe(true);
        expect(video.hasAttribute('webkit-playsinline')).toBe(false);
        expect(playerContainer?.classList.contains('kg-video-hide')).toBe(true);
    });
});
