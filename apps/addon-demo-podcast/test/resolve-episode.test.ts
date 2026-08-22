import {createPublicLookup, isPublicIpAddress, resolveEpisode, resolvePublicAddress} from '../src/resolve-episode.ts';
import {describe, expect, it, vi} from 'vitest';

describe('resolveEpisode', function () {
    it('normalizes a public episode page into durable card properties', async function () {
        const fetchPage = vi.fn().mockResolvedValue(new Response(`
            <html><head>
                <meta property="og:title" content="How independent publishing's future wins">
                <meta property="og:description" content="A practical conversation.">
                <meta property="og:image" content="https://cdn.transistor.fm/artwork.jpg">
                <meta property="og:audio" content="https://media.transistor.fm/episode.mp3">
                <meta property="og:site_name" content="The Publisher Podcast">
                <meta property="music:duration" content="2520">
                <link rel="canonical" href="https://example.com/episodes/publisher's-cut">
            </head></html>
        `, {
            headers: {'content-type': 'text/html'},
            status: 200
        }));

        await expect(resolveEpisode('https://example.com/episodes/publishing', fetchPage)).resolves.toEqual({
            submittedUrl: 'https://example.com/episodes/publishing',
            canonicalUrl: 'https://example.com/episodes/publisher\'s-cut',
            title: 'How independent publishing\'s future wins',
            showName: 'The Publisher Podcast',
            description: 'A practical conversation.',
            artworkUrl: 'https://cdn.transistor.fm/artwork.jpg',
            audioUrl: 'https://media.transistor.fm/episode.mp3',
            duration: '42 min'
        });
        expect(fetchPage).toHaveBeenCalledWith('https://example.com/episodes/publishing', expect.objectContaining({redirect: 'manual'}));
    });

    it('rejects private literal and DNS-resolved addresses', async function () {
        const fetchPage = vi.fn();

        await expect(resolveEpisode('https://[fd00::1]/episode', fetchPage)).rejects.toThrow('public HTTPS');
        expect(fetchPage).not.toHaveBeenCalled();
        await expect(resolvePublicAddress('podcasts.example', async () => [{address: '127.0.0.1', family: 4}])).rejects.toThrow('public network');
        expect(isPublicIpAddress('104.20.42.7')).toBe(true);
        expect(isPublicIpAddress('::ffff:127.0.0.1')).toBe(false);
    });

    it('stops reading episode pages once the response-size bound is crossed', async function () {
        const oversizedBody = new ReadableStream({
            start(controller) {
                controller.enqueue(new Uint8Array(700_000));
                controller.enqueue(new Uint8Array(700_000));
                controller.close();
            }
        });
        const fetchPage = vi.fn().mockResolvedValue(new Response(oversizedBody, {status: 200}));

        await expect(resolveEpisode('https://example.com/large', fetchPage)).rejects.toThrow('too large');
    });

    it.each([
        {status: 500, headers: new Headers()},
        {status: 200, headers: new Headers({'content-length': String(2 * 1024 * 1024)})}
    ])('cancels unread response bodies on an early rejection', async function ({status, headers}) {
        const cancel = vi.fn();
        const body = new ReadableStream({cancel});
        const fetchPage = vi.fn().mockResolvedValue(new Response(body, {status, headers}));

        await expect(resolveEpisode('https://example.com/rejected', fetchPage)).rejects.toThrow();
        expect(cancel).toHaveBeenCalledOnce();
    });

    it('supports Node automatic family selection without a second DNS lookup', async function () {
        const lookup = createPublicLookup(async () => [
            {address: '104.20.42.7', family: 4},
            {address: '2606:4700:10::6814:2a07', family: 6}
        ]) as unknown as (
            hostname: string,
            options: {all: true},
            callback: (error: Error | null, addresses?: Array<{address: string; family: number}>) => void
        ) => void;

        await expect(new Promise((resolve, reject) => {
            lookup('podcasts.example', {all: true}, (error, addresses) => error ? reject(error) : resolve(addresses));
        })).resolves.toEqual([
            {address: '104.20.42.7', family: 4},
            {address: '2606:4700:10::6814:2a07', family: 6}
        ]);
    });
});
