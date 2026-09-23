import type { GhostClient, MemberCredential } from './ghost-client.ts';
import { episodeAccess, extractEpisodes, selectMedia, type MediaFormat } from './selection.ts';

function escapeXml(value: unknown): string {
  // XML 1.0 permits only these whitespace controls.
  return String(value ?? '')
    .replace(/[^\t\n\r\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/gu, '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export function feedLinks(providerUrl: string, showId: string, member?: MemberCredential | null) {
  const link = (format: MediaFormat) => {
    const url = new URL(
      `feeds/${encodeURIComponent(showId)}/${format}.xml`,
      `${providerUrl.replace(/\/$/, '')}/`,
    );
    if (member) {
      url.searchParams.set('uuid', member.uuid);
      url.searchParams.set('key', member.key);
    }
    return url.href;
  };
  return { audio: link('audio'), video: link('video') };
}

export async function renderFeed(
  ghost: Pick<GhostClient, 'configuration' | 'access' | 'postPages'>,
  showId: string,
  format: MediaFormat,
  member: MemberCredential | null,
  siteUrl: string,
  providerUrl: string,
): Promise<string | null> {
  // Validate even an empty private feed. Every later batch resolves current access anew.
  const [configuration] = await Promise.all([ghost.configuration(), ghost.access([], member)]);
  const show = configuration.shows.find((item) => item.id === showId);
  if (!show) {
    return null;
  }
  const items: string[] = [];
  const seen = new Set<string>();
  for await (const page of ghost.postPages()) {
    const posts = page.filter((post) => {
      if (seen.has(post.id)) {
        return false;
      }
      seen.add(post.id);
      return true;
    });
    const episodes = posts.flatMap(extractEpisodes).filter((episode) => episode.showId === show.id);
    const ids = [...new Set(episodes.map((episode) => episode.post.id))];
    const decisions = new Map();
    for (let offset = 0; offset < ids.length; offset += 100) {
      const batch = await ghost.access(ids.slice(offset, offset + 100), member);
      for (const [id, decision] of batch) {
        decisions.set(id, decision);
      }
    }
    for (const episode of episodes) {
      const { post, cardId, title, props } = episode;
      const media = selectMedia(props, format, episodeAccess(episode, decisions.get(post.id)));
      if (!media) {
        continue;
      }
      const description = `<p>${escapeXml(post.custom_excerpt || title)}</p><p><a href="${escapeXml(post.url)}">Episode page</a></p>`;
      const date = new Date(post.published_at);
      const numberTag = (name: 'episode' | 'season', value: unknown) =>
        typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
          ? `<itunes:${name}>${value}</itunes:${name}>`
          : '';
      items.push(
        `<item><title>${escapeXml(title)}</title><link>${escapeXml(post.url)}</link><guid isPermaLink="false">${escapeXml(`urn:ghost:podcast:${post.uuid}:${encodeURIComponent(cardId)}`)}</guid>${Number.isFinite(date.valueOf()) ? `<pubDate>${date.toUTCString()}</pubDate>` : ''}<description>${escapeXml(description)}</description><enclosure url="${escapeXml(media.url)}" type="${escapeXml(media.mime_type)}" length="${media.byte_length}"/>${numberTag('episode', props.episode_number)}${numberTag('season', props.season_number)}</item>`,
      );
    }
  }
  const self = feedLinks(providerUrl, show.id, member)[format];
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${escapeXml(show.title)}</title><link>${escapeXml(siteUrl)}</link><description>${escapeXml(show.description)}</description><language>${escapeXml(show.language)}</language><itunes:author>${escapeXml(show.author)}</itunes:author><itunes:explicit>${show.explicit ? 'true' : 'false'}</itunes:explicit>${show.artwork ? `<itunes:image href="${escapeXml(show.artwork)}"/>` : ''}<atom:link href="${escapeXml(self)}" rel="self" type="application/rss+xml"/>${items.join('')}</channel></rss>`;
}
