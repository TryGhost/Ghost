// The render bundle: Ghost runs it in a Worker with no network and no DOM.
import { defineCardRenderers } from '@tryghost/app-sdk/cards';

import { renderBigNumber } from './big-number/render.tsx';
import { renderChart } from './chart/render.tsx';
import { renderEvent } from './event/render.tsx';
import { renderPodcast } from './podcast/render.tsx';

defineCardRenderers({
  'big-number': renderBigNumber,
  chart: renderChart,
  event: renderEvent,
  podcast: renderPodcast,
});
