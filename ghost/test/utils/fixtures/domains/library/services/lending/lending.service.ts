import type { LoanReceipt } from '../../data/book.data';
import BookLent from '../../events/book-lent.event';
import type { CatalogueService } from '../catalogue/catalogue.service';

export class LendingService {
  readonly #catalogue: CatalogueService;
  readonly #publish: (event: object) => Promise<void>;
  readonly #now: () => Date;

  constructor(deps: {
    catalogue: CatalogueService;
    publish: (event: object) => Promise<void>;
    now: () => Date;
  }) {
    this.#catalogue = deps.catalogue;
    this.#publish = deps.publish;
    this.#now = deps.now;
  }

  async lend(bookId: string, borrower: string): Promise<LoanReceipt> {
    this.#catalogue.book(bookId).lendTo(borrower);
    const receipt = { bookId, borrower, lentAt: this.#now().toISOString() };
    await this.#publish(BookLent.create(receipt, this.#now()));
    return receipt;
  }
}
