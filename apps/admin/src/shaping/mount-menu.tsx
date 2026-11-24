import { createRoot } from 'react-dom/client';
import { ShapingMenu } from './menu';

// Mounts the prototype menu in its own root, beside Admin's (see menu.tsx).
export const mountShapingMenu = (mocked: boolean) => {
  const host = document.createElement('div');
  host.setAttribute('data-shaping-menu', '');
  document.body.appendChild(host);
  createRoot(host).render(<ShapingMenu mocked={mocked} />);
};
