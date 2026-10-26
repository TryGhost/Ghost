import { createRoot } from 'react-dom/client';
import { defaultUnsplashConfig } from '@tryghost/admin-x-framework';
import './index.css';
import { AdminAppRoot } from './app-root.tsx';
// SHAPING PROTOTYPE ONLY — never merge (see src/shaping/README.md).
import { mountShapingMenu } from './shaping/mount-menu';

const framework = {
  ghostVersion: '',
  unsplashConfig: defaultUnsplashConfig,
};

createRoot(document.getElementById('root')!).render(<AdminAppRoot framework={framework} />);
mountShapingMenu();
