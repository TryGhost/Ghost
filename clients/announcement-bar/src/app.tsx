import { AnnouncementBar } from './components/announcement-bar';
import { Main } from './components/main';
import type { AnnouncementSettings } from './utils/api';

type AppProps = {
  apiUrl?: string;
  initialSettings?: AnnouncementSettings | null;
};

export function App({ apiUrl, initialSettings }: AppProps) {
  if (initialSettings) {
    return <AnnouncementBar settings={initialSettings} />;
  }
  return <Main apiUrl={apiUrl} />;
}
