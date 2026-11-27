import { Main } from './components/main';
import { Preview } from './components/preview';
import type { AnnouncementSettings } from './utils/api';

type AppProps = {
  apiUrl?: string;
  previewData?: AnnouncementSettings | null;
};

export function App({ apiUrl, previewData }: AppProps) {
  if (previewData) {
    return <Preview previewData={previewData} />;
  }
  return <Main apiUrl={apiUrl} />;
}
