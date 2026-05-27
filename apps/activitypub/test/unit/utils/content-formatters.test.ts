/**
 * @vitest-environment jsdom
 */

import {enforceVideoCardInlinePlayback} from '../../../src/utils/content-formatters';

describe('enforceVideoCardInlinePlayback', function () {
    it('keeps autoplay video cards autoplaying and inline-playable', function () {
        const result = enforceVideoCardInlinePlayback(`
            <figure class="kg-card kg-video-card">
                <div class="kg-video-container">
                    <video src="/video.mp4" autoplay loop playsinline></video>
                    <div class="kg-video-player-container kg-video-hide"></div>
                </div>
            </figure>
        `);

        const div = document.createElement('div');
        div.innerHTML = result;

        const video = div.querySelector('video') as HTMLVideoElement;
        const playerContainer = div.querySelector('.kg-video-player-container');

        expect(video.hasAttribute('autoplay')).toBe(true);
        expect(video.hasAttribute('loop')).toBe(true);
        expect(video.autoplay).toBe(true);
        expect(video.loop).toBe(true);
        expect(video.hasAttribute('muted')).toBe(true);
        expect(video.hasAttribute('playsinline')).toBe(true);
        expect(video.hasAttribute('webkit-playsinline')).toBe(true);
        expect(video.hasAttribute('x5-playsinline')).toBe(true);
        expect(playerContainer?.classList.contains('kg-video-hide')).toBe(true);
    });

    it('adds inline playback attributes to non-autoplay video cards', function () {
        const result = enforceVideoCardInlinePlayback(`
            <figure class="kg-card kg-video-card">
                <div class="kg-video-container">
                    <video src="/video.mp4" loop muted></video>
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
        expect(video.hasAttribute('playsinline')).toBe(true);
        expect(video.hasAttribute('webkit-playsinline')).toBe(true);
        expect(video.hasAttribute('x5-playsinline')).toBe(true);
        expect(playerContainer?.classList.contains('kg-video-hide')).toBe(true);
    });
});
