// The settings bundle: Ghost runs it in a hidden sandbox and draws its elements in the editor.
import { defineCardSettings } from '@tryghost/app-sdk/cards/settings';

import { bigNumberSettings } from './big-number/settings.tsx';
import { chartSettings } from './chart/settings.tsx';
import { eventSettings } from './event/settings.tsx';
import { podcastSettings } from './podcast/settings.tsx';

defineCardSettings({
  'big-number': bigNumberSettings,
  chart: chartSettings,
  event: eventSettings,
  podcast: podcastSettings,
});
