import { App } from './layout/app';
import { useIsMobile } from '@tryghost/shade/utils';

export default function Settings() {
  const isMobile = useIsMobile();

  return (
    <div className={!isMobile ? 'h-full min-h-0' : 'fixed inset-0 z-50'}>
      <App />
    </div>
  );
}
