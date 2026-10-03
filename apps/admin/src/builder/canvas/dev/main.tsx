import { createRoot } from 'react-dom/client';
import { ShadeApp } from '@tryghost/shade/app';

import '@/index.css';
import { CanvasHarness } from './canvas-harness';

const fixtureId =
  new URLSearchParams(window.location.search).get('theme') === 'source' ? 'source' : 'casper';

createRoot(document.getElementById('root')!).render(
  <ShadeApp className="h-full" darkMode={false}>
    <CanvasHarness fixtureId={fixtureId} />
  </ShadeApp>,
);
