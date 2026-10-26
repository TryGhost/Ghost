import { createRoot } from 'react-dom/client';
import { defaultUnsplashConfig } from '@tryghost/admin-x-framework';
import './index.css';
import { AdminAppRoot } from './app-root.tsx';
// SHAPING PROTOTYPE ONLY — never merge (see src/shaping/README.md).
import { applyView } from './shaping/view';
import { installAnalyticsFakes } from './shaping/data/install';
import { mountShapingMenu } from './shaping/mount-menu';

const framework = {
  ghostVersion: '',
  unsplashConfig: defaultUnsplashConfig,
};

// SHAPING PROTOTYPE ONLY: fake analytics data goes in before the first request
installAnalyticsFakes();
// SHAPING PROTOTYPE ONLY: the menu's View (stands in for the Admin 7 Analytics flag)
applyView();
createRoot(document.getElementById('root')!).render(<AdminAppRoot framework={framework} />);
mountShapingMenu();
