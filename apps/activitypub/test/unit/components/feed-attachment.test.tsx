import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { renderFeedAttachment } from '../../../src/components/feed/feed-item';

const DID = 'did:plc:agxhun7wf2fm3fdfj6zrm33y';
const CID = 'bafkreid53enet72fnlvsf2ubg3reju7ngymtnfojh4y3flof3ktq7dhumu';
const BLOB_URL = `https://inkcap.us-east.host.bsky.network/xrpc/com.atproto.sync.getBlob?did=${DID}&cid=${CID}`;
const WATCH_URL = `https://video.bsky.app/watch/did%3Aplc%3Aagxhun7wf2fm3fdfj6zrm33y/${CID}`;

function renderAttachment(attachment: {
  type: string;
  mediaType: string;
  name: string;
  url: string;
}) {
  return render(<>{renderFeedAttachment({ type: 'Note', attachment: [attachment] })}</>);
}

describe('renderFeedAttachment', function () {
  afterEach(function () {
    cleanup();
  });

  it('renders a Bluesky video bridged by Bridgy Fed with the HLS stream first', function () {
    const { container } = renderAttachment({
      type: 'Video',
      mediaType: '',
      name: '',
      url: BLOB_URL,
    });

    const video = container.querySelector('video');
    expect(video).not.toBeNull();
    expect(video?.getAttribute('src')).toBeNull();
    expect(video?.getAttribute('poster')).toBe(`${WATCH_URL}/thumbnail.jpg`);
    expect(video?.getAttribute('preload')).toBe('none');
    expect(video?.hasAttribute('controls')).toBe(true);

    const sources = Array.from(container.querySelectorAll('video > source')).map((source) => ({
      src: source.getAttribute('src'),
      type: source.getAttribute('type'),
    }));
    expect(sources).toEqual([
      { src: `${WATCH_URL}/playlist.m3u8`, type: 'application/vnd.apple.mpegurl' },
      { src: BLOB_URL, type: 'video/mp4' },
    ]);
  });

  it('renders a Video attachment without a media type', function () {
    const { container } = renderAttachment({
      type: 'Video',
      mediaType: '',
      name: '',
      url: 'https://example.com/video',
    });

    const video = container.querySelector('video');
    expect(video?.getAttribute('src')).toBe('https://example.com/video');
    expect(container.querySelectorAll('video > source')).toHaveLength(0);
  });

  it('renders attachments with a video media type', function () {
    const { container } = renderAttachment({
      type: 'Document',
      mediaType: 'video/mp4',
      name: '',
      url: 'https://example.com/video.mp4',
    });

    expect(container.querySelector('video')?.getAttribute('src')).toBe(
      'https://example.com/video.mp4',
    );
  });

  it('does not render images as videos', function () {
    const { container } = renderAttachment({
      type: 'Image',
      mediaType: 'image/jpeg',
      name: 'Photo',
      url: 'https://example.com/photo.jpg',
    });

    expect(container.querySelector('video')).toBeNull();
    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      'https://example.com/photo.jpg',
    );
  });
});
