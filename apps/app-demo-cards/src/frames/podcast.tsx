// The podcast card's live frame: the same card as the snapshot, with a working player.
import { render } from 'preact';
import { connectLiveFrame } from '@tryghost/app-sdk/live-frame';

import { EpisodeDetails, PODCAST_CSS, readEpisode } from '../podcast/player.tsx';

connectLiveFrame({
  start(context) {
    const style = document.createElement('style');
    style.textContent = `body{font-family:${context.theme.font_family || 'system-ui, sans-serif'}}${PODCAST_CSS}`;
    document.head.append(style);
    render(
      <EpisodeDetails episode={readEpisode(context.properties)} interactive={true} />,
      document.getElementById('card')!,
    );
  },
});
