import { createRoot } from 'react-dom/client';
import { ShadeApp } from '@tryghost/shade/app';

import '@/index.css';
import { CanvasHarness } from './canvas-harness';

createRoot(document.getElementById('root')!).render(
  <ShadeApp className="h-full" darkMode={false}>
    <CanvasHarness />
  </ShadeApp>,
);
