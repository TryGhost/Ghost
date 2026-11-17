import { defineService } from '../../../../../../../core/kernel/define-service';
import type { NoticesDependencies } from '../../boot';
import { NoticeService } from './notice.service';

// The event bus and the other domain's action arrive from boot.ts.
export default defineService(
  'Notices',
  ({ publish, record, describeBook }: NoticesDependencies) => {
    record('start notices');
    return new NoticeService({ publish, describeBook });
  },
);
