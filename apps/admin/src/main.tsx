import { createRoot } from 'react-dom/client';
import { defaultUnsplashConfig } from '@tryghost/admin-x-framework';
import './index.css';
import { AdminAppRoot } from './app-root.tsx';

const framework = {
  ghostVersion: '',
  unsplashConfig: defaultUnsplashConfig,
};

createRoot(document.getElementById('root')!).render(<AdminAppRoot framework={framework} />);
