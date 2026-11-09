import { createRoot } from 'react-dom/client';
import { defaultUnsplashConfig } from '@tryghost/admin-x-framework';
import './index.css';
import { AdminAppRoot } from './app-root.tsx';
import { lazyPrototypeMenu } from './automations/api';

const framework = {
  ghostVersion: '',
  unsplashConfig: defaultUnsplashConfig,
};

createRoot(document.getElementById('root')!).render(<AdminAppRoot framework={framework} />);

// PROTOTYPE ONLY (NY-1750): the bottom-right beaker menu. Don't merge.
void lazyPrototypeMenu().then(({ mountPrototypeMenu }) => mountPrototypeMenu());
