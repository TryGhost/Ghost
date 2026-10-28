import { createRoot } from 'react-dom/client';
import { defaultUnsplashConfig } from '@tryghost/admin-x-framework';
import './index.css';
import { AdminAppRoot } from './app-root.tsx';
import { installListFieldFakeApi } from './poc/list-field/fake-api';

// POC ONLY: answers list-field requests from localStorage until the backend serves them.
// See src/poc/list-field/README.md; delete this and that folder to switch to the real API.
installListFieldFakeApi();

const framework = {
  ghostVersion: '',
  unsplashConfig: defaultUnsplashConfig,
};

createRoot(document.getElementById('root')!).render(<AdminAppRoot framework={framework} />);
