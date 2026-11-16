import type { Notice } from '../data/notice.data';
import notices from '../services/notices';

export function listNotices(): Notice[] {
  return notices.service.list();
}
