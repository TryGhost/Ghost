import { createRoot } from 'react-dom/client';
import { ShadeApp } from '@tryghost/shade/app';

import '@/index.css';
import { CanvasHarness } from './canvas-harness';
import { DEFAULT_CANVAS_ROUTING_SOURCE } from '@/builder/canvas/route-compatibility';

const fixtureId =
  new URLSearchParams(window.location.search).get('theme') === 'source' ? 'source' : 'casper';
const routingYaml =
  new URLSearchParams(window.location.search).get('routing') === 'custom'
    ? DEFAULT_CANVAS_ROUTING_SOURCE.replace('/{slug}/', '/news/{slug}/')
    : DEFAULT_CANVAS_ROUTING_SOURCE;

createRoot(document.getElementById('root')!).render(
  <ShadeApp className="h-full" darkMode={false}>
    <CanvasHarness fixtureId={fixtureId} routingYaml={routingYaml} />
  </ShadeApp>,
);
