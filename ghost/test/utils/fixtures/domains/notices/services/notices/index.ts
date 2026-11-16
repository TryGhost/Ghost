import { defineService } from '../../../../../../../core/kernel/define-service';
import { bus, journal } from '../../../../domain-foundation';
import { describeBook } from '../../../library/actions/describe-book.action';
import { NoticeService } from './notice.service';

// This domain has no boot.ts, so its root wires what it needs itself: the
// foundation's event bus and another domain's action.
export default defineService('Notices', () => {
  journal.push('start notices');
  return new NoticeService({
    publish: (event) => bus.dispatch(event),
    describeBook,
  });
});
