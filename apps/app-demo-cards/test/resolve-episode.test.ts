import {
  createPublicLookup,
  fetchArtwork,
  isPublicIpAddress,
  mp3AudioStart,
  mp3Duration,
  resolveEpisode,
  resolvePublicAddress,
} from '../src/podcast/resolve-episode.ts';
import { describe, expect, it, vi } from 'vitest';

describe('resolveEpisode', function () {
  it('normalizes a public episode page into durable card properties', async function () {
    const fetchPage = vi.fn().mockResolvedValue(
      new Response(
        `
            <html><head>
                <meta property="og:title" content="How independent publishing's future wins">
                <meta property="og:description" content="A practical conversation.">
                <meta property="og:image" content="https://cdn.transistor.fm/artwork.jpg">
                <meta property="og:audio" content="https://media.transistor.fm/episode.mp3">
                <meta property="og:site_name" content="The Publisher Podcast">
                <meta property="music:duration" content="2520">
                <link rel="canonical" href="https://example.com/episodes/publisher's-cut">
            </head></html>
        `,
        {
          headers: { 'content-type': 'text/html' },
          status: 200,
        },
      ),
    );

    await expect(
      resolveEpisode('https://example.com/episodes/publishing', fetchPage),
    ).resolves.toEqual({
      submittedUrl: 'https://example.com/episodes/publishing',
      canonicalUrl: "https://example.com/episodes/publisher's-cut",
      title: "How independent publishing's future wins",
      showName: 'The Publisher Podcast',
      description: 'A practical conversation.',
      artworkUrl: 'https://cdn.transistor.fm/artwork.jpg',
      audioUrl: 'https://media.transistor.fm/episode.mp3',
      duration: '42 min',
    });
    expect(fetchPage).toHaveBeenCalledWith(
      'https://example.com/episodes/publishing',
      expect.objectContaining({ redirect: 'manual' }),
    );
  });

  it('discovers an RSS feed from an episode page and matches the canonical episode URL', async function () {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          `
                <html><head>
                    <meta property="og:title" content="Episode page title">
                    <meta property="og:image" content="https://example.com/page-art.jpg">
                    <link rel="canonical" href="https://example.com/p/design">
                    <link rel="alternate" type="application/rss+xml" href="/feed">
                </head></html>
            `,
          {
            headers: { 'content-type': 'text/html' },
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          `
                <rss xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
                    <channel>
                        <title>The Design Podcast</title>
                        <image><url>https://example.com/show-art.jpg</url></image>
                        <item>
                            <title>Another episode</title>
                            <link>https://example.com/p/another</link>
                            <enclosure url="https://media.example.com/another.mp3" type="audio/mpeg" />
                        </item>
                        <item>
                            <title><![CDATA[Design &amp; AI]]></title>
                            <description><![CDATA[<p>A conversation about designing with AI.</p>]]></description>
                            <link>https://example.com/p/design</link>
                            <enclosure length="123" type="audio/mpeg" url="https://media.example.com/design.mp3" />
                            <itunes:duration>4324</itunes:duration>
                            <itunes:image href="https://example.com/episode-art.jpg" />
                        </item>
                    </channel>
                </rss>
            `,
          {
            headers: { 'content-type': 'application/rss+xml' },
            status: 200,
          },
        ),
      );

    await expect(resolveEpisode('https://example.com/p/design', fetchPage)).resolves.toEqual({
      submittedUrl: 'https://example.com/p/design',
      canonicalUrl: 'https://example.com/p/design',
      title: 'Design & AI',
      showName: 'The Design Podcast',
      description: 'A conversation about designing with AI.',
      artworkUrl: 'https://example.com/episode-art.jpg',
      audioUrl: 'https://media.example.com/design.mp3',
      duration: '72 min',
    });
    expect(fetchPage).toHaveBeenNthCalledWith(
      2,
      'https://example.com/feed',
      expect.objectContaining({ redirect: 'manual' }),
    );
  });

  it('accepts a bounded podcast feed larger than the HTML page limit and uses its newest audio item', async function () {
    const fetchPage = vi.fn().mockResolvedValue(
      new Response(
        `
            <rss xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
                <channel>
                    <title>Lenny's Podcast</title>
                    <item>
                        <title>OpenAI's Head of Design</title>
                        <description>The best time in history to be a designer.</description>
                        <link>https://www.lennysnewsletter.com/p/openais-head-of-design-this-is-the</link>
                        <enclosure url="https://api.substack.com/feed/podcast/209801560/episode.mp3" type="audio/mpeg" />
                        <itunes:duration>4324</itunes:duration>
                        <itunes:image href="https://substackcdn.com/feed/podcast/10845/episode.jpg" />
                    </item>
                </channel>
            </rss>
        `,
        {
          headers: {
            'content-length': String(3 * 1024 * 1024),
            'content-type': 'application/xml; charset=utf-8',
          },
          status: 200,
        },
      ),
    );

    await expect(
      resolveEpisode('https://api.substack.com/feed/podcast/10845.rss', fetchPage),
    ).resolves.toEqual({
      submittedUrl: 'https://api.substack.com/feed/podcast/10845.rss',
      canonicalUrl: 'https://www.lennysnewsletter.com/p/openais-head-of-design-this-is-the',
      title: "OpenAI's Head of Design",
      showName: "Lenny's Podcast",
      description: 'The best time in history to be a designer.',
      artworkUrl: 'https://substackcdn.com/feed/podcast/10845/episode.jpg',
      audioUrl: 'https://api.substack.com/feed/podcast/209801560/episode.mp3',
      duration: '72 min',
    });
  });

  it('rejects private literal and DNS-resolved addresses', async function () {
    const fetchPage = vi.fn();

    await expect(resolveEpisode('https://[fd00::1]/episode', fetchPage)).rejects.toThrow(
      'public HTTPS',
    );
    expect(fetchPage).not.toHaveBeenCalled();
    await expect(
      resolvePublicAddress('podcasts.example', async () => [{ address: '127.0.0.1', family: 4 }]),
    ).rejects.toThrow('public network');
    expect(isPublicIpAddress('104.20.42.7')).toBe(true);
    expect(isPublicIpAddress('::ffff:127.0.0.1')).toBe(false);
  });

  it('stops reading episode pages once the response-size bound is crossed', async function () {
    const oversizedBody = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(700_000));
        controller.enqueue(new Uint8Array(700_000));
        controller.close();
      },
    });
    const fetchPage = vi.fn().mockResolvedValue(new Response(oversizedBody, { status: 200 }));

    await expect(resolveEpisode('https://example.com/large', fetchPage)).rejects.toThrow(
      'too large',
    );
  });

  it.each([
    { status: 500, headers: new Headers() },
    { status: 200, headers: new Headers({ 'content-length': String(2 * 1024 * 1024) }) },
  ])('cancels unread response bodies on an early rejection', async function ({ status, headers }) {
    const cancel = vi.fn();
    const body = new ReadableStream({ cancel });
    const fetchPage = vi.fn().mockResolvedValue(new Response(body, { status, headers }));

    await expect(resolveEpisode('https://example.com/rejected', fetchPage)).rejects.toThrow();
    expect(cancel).toHaveBeenCalledOnce();
  });

  it('supports Node automatic family selection without a second DNS lookup', async function () {
    const lookup = createPublicLookup(async () => [
      { address: '104.20.42.7', family: 4 },
      { address: '2606:4700:10::6814:2a07', family: 6 },
    ]) as unknown as (
      hostname: string,
      options: { all: true },
      callback: (
        error: Error | null,
        addresses?: Array<{ address: string; family: number }>,
      ) => void,
    ) => void;

    await expect(
      new Promise((resolve, reject) => {
        lookup('podcasts.example', { all: true }, (error, addresses) =>
          error ? reject(error) : resolve(addresses),
        );
      }),
    ).resolves.toEqual([
      { address: '104.20.42.7', family: 4 },
      { address: '2606:4700:10::6814:2a07', family: 6 },
    ]);
  });
});

describe('mp3Duration', function () {
  // An MPEG-1 Layer III frame header: 128 kbps, 44.1 kHz, stereo.
  const frame = [0xff, 0xfb, 0x90, 0x00];

  it('reads the frame count from an Info header', function () {
    const bytes = new Uint8Array(200);
    bytes.set(frame, 0);
    bytes.set(
      [...'Info'].map((c) => c.charCodeAt(0)),
      36,
    );
    bytes.set([0, 0, 0, 1], 40);
    bytes.set([0, 0, 0x8c, 0xa0], 44); // 36000 frames
    expect(mp3Duration(bytes, 0, 0)).toBeCloseTo((36000 * 1152) / 44100);
  });

  it('works out a constant bitrate file from its size, after the ID3 tag', function () {
    const bytes = new Uint8Array(300);
    bytes.set(
      [...'ID3'].map((c) => c.charCodeAt(0)),
      0,
    );
    bytes.set([0, 0, 0, 0x64], 6); // a 100 byte tag
    const start = mp3AudioStart(bytes);
    expect(start).toBe(110);
    bytes.set(frame, start);
    expect(mp3Duration(bytes, start, 16_000_000)).toBe(1000);
  });

  it('gives up without a Layer III frame', function () {
    expect(mp3Duration(new Uint8Array(64), 0, 1000)).toBeNull();
  });
});

describe('fetchArtwork', function () {
  it('follows redirects and hands back the picture as base64', async function () {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, { status: 302, headers: { location: 'https://cdn.example/cover.png' } }),
      )
      .mockResolvedValueOnce(
        new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'image/png' } }),
      );
    await expect(fetchArtwork('https://example.com/cover', fetchPage)).resolves.toEqual({
      type: 'image/png',
      data: 'AQID',
    });
  });

  it('refuses what is not a picture', async function () {
    const fetchPage = vi
      .fn()
      .mockResolvedValue(new Response('<svg/>', { headers: { 'content-type': 'image/svg+xml' } }));
    await expect(fetchArtwork('https://example.com/cover', fetchPage)).rejects.toThrow(
      'not a picture',
    );
  });
});
