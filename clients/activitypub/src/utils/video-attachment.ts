/**
 * Whether an attachment should be rendered as a video.
 *
 * Most servers send a `video/*` mediaType. Some, such as Bridgy Fed for posts
 * bridged from Bluesky, only send `type: 'Video'` and no mediaType.
 */
export function isVideoAttachment(attachment: { type: string; mediaType?: string }) {
  if (attachment.mediaType) {
    return attachment.mediaType.startsWith('video/');
  }

  return attachment.type === 'Video';
}

export type BlueskyVideoSources = {
  /** HLS playlist served by Bluesky's video service */
  playlistUrl: string;
  /** Poster image for the video */
  thumbnailUrl: string;
};

const GET_BLOB_PATH = '/xrpc/com.atproto.sync.getBlob';
const DID_PATTERN = /^did:[a-z]+:[a-zA-Z0-9._:-]+$/;
const CID_PATTERN = /^[a-zA-Z0-9]+$/;

/**
 * Maps a Bluesky video blob URL (as sent by Bridgy Fed) to the HLS stream and
 * thumbnail that Bluesky's video service serves for the same video.
 *
 * The blob URL points at the author's PDS, which doesn't support Range
 * requests, so Safari can't play it and other browsers can't seek in it. The
 * HLS stream doesn't have that problem.
 *
 * Returns `null` if the URL isn't a getBlob URL with a valid `did` and `cid`.
 */
export function getBlueskyVideoSources(url: string): BlueskyVideoSources | null {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'https:' || !parsed.pathname.endsWith(GET_BLOB_PATH)) {
    return null;
  }

  const did = parsed.searchParams.get('did');
  const cid = parsed.searchParams.get('cid');

  if (!did || !cid || !DID_PATTERN.test(did) || !CID_PATTERN.test(cid)) {
    return null;
  }

  const base = `https://video.bsky.app/watch/${encodeURIComponent(did)}/${cid}`;

  return {
    playlistUrl: `${base}/playlist.m3u8`,
    thumbnailUrl: `${base}/thumbnail.jpg`,
  };
}
