import type { LoanReceipt } from '../data/book.data';
import lending from '../services/lending';

/** Lends a book to a borrower. */
export function lendBook(input: { bookId: string; borrower: string }): Promise<LoanReceipt> {
  return lending.service.lend(input.bookId, input.borrower);
}
