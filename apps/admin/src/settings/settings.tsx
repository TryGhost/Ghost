import { App } from './layout/app';
import { useFeatureFlag } from '@tryghost/admin-x-framework/hooks';

export default function Settings() {
  const admin7Settings = useFeatureFlag('admin7settings');

  // Legacy Settings is a full-screen takeover over the shell. Keep one wrapper
  // either way so the flag resolving late doesn't remount the whole app.
  return (
    <div className={admin7Settings ? 'h-full min-h-0' : 'fixed inset-0 z-50'}>
      <App />
    </div>
  );
}
