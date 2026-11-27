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

  it('replaces the video element when the attachment changes, as browsers ignore source changes on a mounted video', function () {
    const otherCid = 'bafkreiothervideo';
    const otherBlobUrl = `https://inkcap.us-east.host.bsky.network/xrpc/com.atproto.sync.getBlob?did=${DID}&cid=${otherCid}`;
    const plainUrl = 'https://example.com/video.mp4';
    const attachmentFor = (url: string) => ({ type: 'Video', mediaType: '', name: '', url });

    const { container, rerender } = renderAttachment(attachmentFor(BLOB_URL));
    const firstVideo = container.querySelector('video');

    rerender(
      <>{renderFeedAttachment({ type: 'Note', attachment: [attachmentFor(otherBlobUrl)] })}</>,
    );
    const secondVideo = container.querySelector('video');

    expect(secondVideo).not.toBe(firstVideo);
    expect(secondVideo?.querySelector('source')?.getAttribute('src')).toBe(
      `https://video.bsky.app/watch/did%3Aplc%3Aagxhun7wf2fm3fdfj6zrm33y/${otherCid}/playlist.m3u8`,
    );

    rerender(<>{renderFeedAttachment({ type: 'Note', attachment: [attachmentFor(plainUrl)] })}</>);
    const thirdVideo = container.querySelector('video');

    expect(thirdVideo).not.toBe(secondVideo);
    expect(thirdVideo?.getAttribute('src')).toBe(plainUrl);

    rerender(<>{renderFeedAttachment({ type: 'Note', attachment: [attachmentFor(BLOB_URL)] })}</>);

    expect(container.querySelector('video')).not.toBe(thirdVideo);
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
