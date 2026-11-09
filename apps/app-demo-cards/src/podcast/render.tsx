import renderToString from 'preact-render-to-string';
import type { CardRenderer } from '@tryghost/app-sdk/cards';

import { EpisodeDetails, PODCAST_CSS, readEpisode, type Episode } from './player.tsx';

/** The episode's fields a live frame needs to play it. The pasted URL stays private. */
export const PODCAST_PUBLIC_PROPERTIES = [
  'title',
  'showName',
  'description',
  'artworkUrl',
  'audioUrl',
  'canonicalUrl',
  'duration',
];

/** Email: artwork, title and a link to the post, where the episode plays. */
function EmailEpisode({ episode }: { episode: Episode }) {
  if (!episode.title) {
    return null;
  }
  return (
    <table
      role="presentation"
      width="100%"
      style={{ borderCollapse: 'collapse', border: '1px solid #d6d6d1' }}
    >
      <tbody>
        <tr>
          {episode.artworkUrl && (
            <td width="96" style={{ padding: '18px 0 18px 18px', verticalAlign: 'top' }}>
              <img
                alt={`Cover: ${episode.showName || episode.title}`}
                src={episode.artworkUrl}
                width="96"
                height="96"
                style={{ display: 'block', width: '96px', height: '96px', objectFit: 'cover' }}
              />
            </td>
          )}
          <td style={{ padding: '18px', verticalAlign: 'top', color: '#1d1d1b' }}>
            {episode.showName && (
              <p
                style={{
                  margin: '0 0 6px',
                  color: '#5b5b56',
                  fontSize: '11px',
                  fontWeight: '700',
                  letterSpacing: '.1em',
                  textTransform: 'uppercase',
                }}
              >
                {episode.showName}
              </p>
            )}
            <h2
              style={{ margin: '0 0 12px', fontSize: '21px', fontWeight: '700', lineHeight: '1.2' }}
            >
              {episode.title}
            </h2>
            <a
              data-ghost-post-link=""
              href="#"
              style={{
                display: 'inline-block',
                padding: '8px 14px',
                background: '#1d1d1b',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: '700',
                textDecoration: 'none',
              }}
            >
              ▶ Listen now{episode.duration ? ` · ${episode.duration}` : ''}
            </a>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export const renderPodcast: CardRenderer = ({ properties }) => {
  const episode = readEpisode(properties);
  return {
    html: renderToString(<EpisodeDetails episode={episode} interactive={false} />),
    css: PODCAST_CSS,
    height: episode.title ? 200 : 150,
    email_html: renderToString(<EmailEpisode episode={episode} />),
    public_properties: episode.title ? PODCAST_PUBLIC_PROPERTIES : [],
  };
};
