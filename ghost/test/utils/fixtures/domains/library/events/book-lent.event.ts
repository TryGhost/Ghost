import { defineEvent } from '@tryghost/kernel/domains/definitions';
import type { LoanReceipt } from '../data/book.data';

export default defineEvent<LoanReceipt>('BookLent');
