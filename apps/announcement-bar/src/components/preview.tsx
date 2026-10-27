import { AnnouncementBar } from './announcement-bar';
import type { AnnouncementSettings } from '../utils/api';

type PreviewProps = {
  previewData: AnnouncementSettings;
};

export function Preview({ previewData }: PreviewProps) {
  return <AnnouncementBar settings={previewData} />;
}
