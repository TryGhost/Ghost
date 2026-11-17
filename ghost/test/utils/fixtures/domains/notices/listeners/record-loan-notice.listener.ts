import { defineListener } from '@tryghost/kernel/domains/definitions';
import type { DomainEvent } from '@tryghost/kernel/domains/definitions';
import type { LoanReceipt } from '../../library/data/book.data';
import BookLent from '../../library/events/book-lent.event';
import notices from '../services/notices';

export default defineListener({
  event: BookLent,
  handle: (event: DomainEvent<LoanReceipt>) => notices.service.recordLoan(event.data),
});
