import { createRoot } from 'react-dom/client';
import { defaultUnsplashConfig } from '@tryghost/admin-x-framework';
import './index.css';
import { AdminAppRoot } from './app-root.tsx';
// SHAPING PROTOTYPE ONLY — never merge (see src/shaping/README.md).
import { installShapingMocks } from './shaping/install';

const framework = {
  ghostVersion: '',
  unsplashConfig: defaultUnsplashConfig,
};

const render = () =>
  createRoot(document.getElementById('root')!).render(<AdminAppRoot framework={framework} />);

// The mocks go in before the first request; a failure to set them up still
// renders Admin, against the real backend.
installShapingMocks().then(render, (error: unknown) => {
  // eslint-disable-next-line no-console -- prototype-only: say why the mocks are off
  console.error('Shaping mocks failed to start', error);
  render();
});
