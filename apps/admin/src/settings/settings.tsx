import { App } from './layout/app';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';
import { useIsMobile } from '@tryghost/shade/utils';

export default function Settings() {
  const admin7Settings = useFeatureFlag('admin7settings');
  const isMobile = useIsMobile();

  return (
    <div className={admin7Settings && !isMobile ? 'h-full min-h-0' : 'fixed inset-0 z-50'}>
      <App />
    </div>
  );
}
