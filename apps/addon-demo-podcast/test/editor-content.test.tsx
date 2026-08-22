import renderer from '../src/editor-content.tsx';
import {describe, expect, it} from 'vitest';

describe('podcast editor block', function () {
    it('keeps a durable episode presentation while opting into player hydration', async function () {
        const output = await renderer({
            blockName: 'podcast-player',
            props: {
                title: 'How independent publishing wins',
                showName: 'The Publisher Podcast',
                description: 'A practical conversation about sustainable publishing.',
                artworkUrl: 'https://images.example/show.jpg',
                audioUrl: 'https://media.example/episode.mp3',
                canonicalUrl: 'https://podcasts.example/episodes/independent-publishing',
                duration: '42 min'
            }
        });

        expect(output.html).toContain('How independent publishing wins');
        expect(output.html).toContain('The Publisher Podcast');
        expect(output.html).toContain('https://images.example/show.jpg');
        expect(output.html).toContain('https://media.example/episode.mp3');
        expect(output.html).toContain('podcast-card__progress');
        expect(output.html).toContain('type="range"');
        expect(output.html).toContain('Go back 10 seconds');
        expect(output.html).toContain('Playback speed 1 times');
        expect(output.html).toContain('Skip forward 30 seconds');
        expect(output.html).toContain('0:00');
        expect(output.html).not.toContain('podcast-card__open');
        expect(output.html).not.toContain('Listen to episode');
        expect(output.html).not.toContain('Listen on the source site');
        expect(output.portableHtml).toContain('How independent publishing wins');
        expect(output.portableHtml).toContain('https://podcasts.example/episodes/independent-publishing');
        expect(output.portableHtml).toContain('0:00 / 42 min');
        expect(output.portableHtml).not.toContain('Open ↗');
        expect(output.portableHtml).toContain('border:1px solid');
        expect(output.portableHtml).toContain('role="presentation"');
        expect(output.portableHtml).not.toContain('border-radius:18px');
        expect(output.css).not.toContain('linear-gradient(145deg');
        expect(output.css).not.toMatch(/font-family:(?!inherit)/);
        expect(output.portableHtml).not.toContain('font-family');
        expect(output.portableHtml).not.toContain('Listen on the source site');
        expect(output.portableHtml).not.toContain('<audio');
        expect(renderer.hydrate).toBeTypeOf('function');
    });
});
