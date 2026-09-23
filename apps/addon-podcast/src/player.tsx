import { useEffect, useState } from 'preact/hooks';
import type { AddonEditorBlockRequest } from '@tryghost/addon-kit/editor';
import type { player } from './provider/player.ts';

type PlayerData = Awaited<ReturnType<typeof player>>;

export function Player({ request }: { request: AddonEditorBlockRequest }) {
  const [data, setData] = useState<PlayerData | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    const { bridge, envelope } = request;
    if (!bridge || !envelope) {
      return;
    }
    void bridge
      .fetch('/api/player', {
        method: 'POST',
        body: {
          post_id: envelope.context.postId,
          card_id: envelope.context.cardId,
          member: envelope.context.member,
        },
      })
      .then((response) => {
        if (response.status !== 200) {
          throw new Error('Unavailable');
        }
        if (active) {
          setData(response.body as PlayerData);
        }
      })
      .catch(() => {
        if (active) {
          setFailed(true);
        }
      });
    return () => {
      active = false;
    };
  }, [request]);
  if (data?.state === 'hidden') {
    return null;
  }
  if (failed || data?.state === 'missing') {
    return (
      <article className="podcast-player">
        <p>This episode is currently unavailable.</p>
      </article>
    );
  }
  if (!data) {
    return (
      <article aria-busy="true" className="podcast-player">
        <p>Loading episode…</p>
      </article>
    );
  }
  const hasFull = data.media.audio?.variant === 'full' || data.media.video?.variant === 'full';
  return (
    <article className="podcast-player">
      <p className="podcast-show">{data.show.title}</p>
      <h2>{data.episode.title}</h2>
      {data.media.audio && (
        <section aria-label="Audio episode">
          <audio
            aria-label={data.episode.title}
            preload="none"
            src={data.media.audio.url}
            controls
          />
        </section>
      )}
      {data.media.video && (
        <section aria-label="Video episode">
          <video
            aria-label={data.episode.title}
            preload="none"
            src={data.media.video.url}
            controls
            playsInline
          />
        </section>
      )}
      {data.state === 'shell' && <p>Sign in or subscribe to listen to this episode.</p>}
      {data.state === 'ready' && !hasFull && <p>You are listening to the free version.</p>}
      {!hasFull && (
        <button type="button" onClick={() => request.bridge?.requestSignin()}>
          {request.envelope?.context.member ? 'View membership options' : 'Sign in or subscribe'}
        </button>
      )}
    </article>
  );
}

export const playerCss =
  '.podcast-player{box-sizing:border-box;padding:28px;border:1px solid #e5e7eb;border-radius:16px;font-family:inherit;background:#fafafa;color:#171717;overflow-wrap:anywhere}.podcast-player h2{font-size:24px;line-height:1.25;letter-spacing:-.03em;margin:8px 0 24px}.podcast-player p{font-size:14px;line-height:1.5}.podcast-player .podcast-show{color:#62676e;margin:0}.podcast-player audio,.podcast-player video{display:block;width:100%;max-width:100%;margin:16px 0}.podcast-player video{max-height:60vh;background:#171717;border-radius:8px}.podcast-player button{font:inherit;font-size:14px;font-weight:600;color:white;background:#171717;border:0;border-radius:999px;padding:12px 20px;cursor:pointer}.podcast-player button:focus-visible{outline:2px solid #4169e1;outline-offset:3px}@media(max-width:400px){.podcast-player{padding:20px}}';
