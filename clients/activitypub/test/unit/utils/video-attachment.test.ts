import { describe, expect, it } from 'vitest';
import { getBlueskyVideoSources, isVideoAttachment } from '../../../src/utils/video-attachment';

const DID = 'did:plc:agxhun7wf2fm3fdfj6zrm33y';
const CID = 'bafkreid53enet72fnlvsf2ubg3reju7ngymtnfojh4y3flof3ktq7dhumu';
const BLOB_URL = `https://inkcap.us-east.host.bsky.network/xrpc/com.atproto.sync.getBlob?did=${DID}&cid=${CID}`;

describe('isVideoAttachment', function () {
  it('returns true for video media types', function () {
    expect(isVideoAttachment({ type: 'Document', mediaType: 'video/mp4' })).toBe(true);
    expect(isVideoAttachment({ type: 'Document', mediaType: 'video/webm' })).toBe(true);
    expect(isVideoAttachment({ type: 'Video', mediaType: 'video/quicktime' })).toBe(true);
  });

  it('returns true for Video attachments without a media type', function () {
    expect(isVideoAttachment({ type: 'Video' })).toBe(true);
    expect(isVideoAttachment({ type: 'Video', mediaType: '' })).toBe(true);
  });

  it('returns false for other attachments', function () {
    expect(isVideoAttachment({ type: 'Image', mediaType: 'image/jpeg' })).toBe(false);
    expect(isVideoAttachment({ type: 'Image' })).toBe(false);
    expect(isVideoAttachment({ type: 'Document', mediaType: 'audio/mpeg' })).toBe(false);
    expect(isVideoAttachment({ type: 'Video', mediaType: 'image/jpeg' })).toBe(false);
  });
});

describe('getBlueskyVideoSources', function () {
  it('maps a getBlob URL to the Bluesky HLS stream and thumbnail', function () {
    expect(getBlueskyVideoSources(BLOB_URL)).toEqual({
      playlistUrl: `https://video.bsky.app/watch/did%3Aplc%3Aagxhun7wf2fm3fdfj6zrm33y/${CID}/playlist.m3u8`,
      thumbnailUrl: `https://video.bsky.app/watch/did%3Aplc%3Aagxhun7wf2fm3fdfj6zrm33y/${CID}/thumbnail.jpg`,
    });
  });

  it('accepts the query parameters in any order', function () {
    const url = `https://pds.example/xrpc/com.atproto.sync.getBlob?cid=${CID}&did=${DID}`;

    expect(getBlueskyVideoSources(url)?.playlistUrl).toBe(
      `https://video.bsky.app/watch/did%3Aplc%3Aagxhun7wf2fm3fdfj6zrm33y/${CID}/playlist.m3u8`,
    );
  });

  it('supports did:web identifiers', function () {
    const url = `https://pds.example/xrpc/com.atproto.sync.getBlob?did=did:web:example.com&cid=${CID}`;

    expect(getBlueskyVideoSources(url)?.thumbnailUrl).toBe(
      `https://video.bsky.app/watch/did%3Aweb%3Aexample.com/${CID}/thumbnail.jpg`,
    );
  });

  it('returns null for URLs that are not getBlob URLs', function () {
    expect(getBlueskyVideoSources('https://example.com/video.mp4')).toBeNull();
    expect(
      getBlueskyVideoSources(
        `https://pds.example/xrpc/com.atproto.sync.getRecord?did=${DID}&cid=${CID}`,
      ),
    ).toBeNull();
    expect(getBlueskyVideoSources('not a url')).toBeNull();
    expect(getBlueskyVideoSources('')).toBeNull();
  });

  it('returns null for non-https URLs', function () {
    expect(getBlueskyVideoSources(BLOB_URL.replace('https:', 'http:'))).toBeNull();
  });

  it('returns null when did or cid is missing', function () {
    expect(
      getBlueskyVideoSources(`https://pds.example/xrpc/com.atproto.sync.getBlob?did=${DID}`),
    ).toBeNull();
    expect(
      getBlueskyVideoSources(`https://pds.example/xrpc/com.atproto.sync.getBlob?cid=${CID}`),
    ).toBeNull();
  });

  it('returns null when did or cid contain unexpected characters', function () {
    const base = 'https://pds.example/xrpc/com.atproto.sync.getBlob';

    expect(getBlueskyVideoSources(`${base}?did=plc:abc&cid=${CID}`)).toBeNull();
    expect(getBlueskyVideoSources(`${base}?did=did:plc:abc%2F..%2F..&cid=${CID}`)).toBeNull();
    expect(getBlueskyVideoSources(`${base}?did=did:plc:abc%3Fx%3D1&cid=${CID}`)).toBeNull();
    expect(getBlueskyVideoSources(`${base}?did=${DID}&cid=bafk%2F..%2Fx`)).toBeNull();
    expect(getBlueskyVideoSources(`${base}?did=${DID}&cid=bafk%20x`)).toBeNull();
  });
});
