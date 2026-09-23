import { defineEditorBlockRenderer } from '@tryghost/addon-kit/editor';
import { parseConfiguration } from './model.ts';
import { Player, playerCss } from './player.tsx';

export default defineEditorBlockRenderer(
  (request) => {
    const { blockName, props, context } = request;
    if (blockName !== 'episode') {
      throw new Error('Unknown podcast block');
    }
    if (request.envelope && request.bridge) {
      return { publicProps: {}, content: <Player request={request} />, css: playerCss };
    }
    let show;
    try {
      show = parseConfiguration(context?.configuration).shows.find(
        (item) => item.id === props.show_id,
      );
    } catch {
      /* Keep incomplete cards editable. */
    }
    const title = typeof props.title === 'string' && props.title.trim() ? props.title : null;
    return {
      publicProps: {},
      content: (
        <article className="podcast-episode">
          <span aria-hidden="true" className="podcast-mark">
            ♪
          </span>
          <section>
            <p>{show?.title || 'Podcast episode'}</p>
            <h2 data-ghost-post-title={title ? undefined : ''}>{title || 'Untitled post'}</h2>
            <p className="podcast-hint">
              {show
                ? 'Episode details are saved with this post.'
                : 'Choose a show in card settings.'}
            </p>
          </section>
        </article>
      ),
      portableContent: (
        <p>
          <a data-ghost-post-link="">Listen to this episode on the website</a>
        </p>
      ),
      css: '.podcast-episode{box-sizing:border-box;display:flex;align-items:center;gap:24px;padding:28px;border:1px solid #e5e7eb;border-radius:16px;font-family:system-ui,sans-serif;background:#fafafa;color:#171717}.podcast-mark{display:grid;place-items:center;flex:0 0 64px;height:64px;border-radius:16px;background:#15171a;color:white;font-size:32px}.podcast-episode section{min-width:0}.podcast-episode h2{font-size:23px;line-height:1.25;letter-spacing:-.03em;margin:8px 0;overflow-wrap:anywhere}.podcast-episode p{font-size:13px;line-height:1.5;margin:0;color:#62676e}.podcast-hint{margin-top:12px!important}@media(max-width:400px){.podcast-episode{gap:16px;padding:20px}.podcast-mark{flex-basis:48px;height:48px}}',
      initialHeight: 160,
    };
  },
  { hydrate: true },
);
