// PROTOTYPE ONLY (NY-1750): mounts the prototype menu in its own root, beside Admin's (see
// menu.tsx). Called from main.tsx. Don't merge this folder.
import { createRoot } from 'react-dom/client';
import { PrototypeMenu } from './menu';

export const mountPrototypeMenu = () => {
  const host = document.createElement('div');
  host.setAttribute('data-prototype-menu', '');
  document.body.appendChild(host);
  createRoot(host).render(<PrototypeMenu />);
};
