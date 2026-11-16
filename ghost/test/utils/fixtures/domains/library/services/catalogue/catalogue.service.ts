import errors from '@tryghost/errors';
import type { BookSummary } from '../../data/book.data';
import type { Book } from '../../entities/book.entity';
import type { BookRepository } from '../../repositories/book.repository';

export class CatalogueService {
  readonly #books: BookRepository;
  readonly #record: (entry: string) => void;

  constructor({ books, record }: { books: BookRepository; record: (entry: string) => void }) {
    this.#books = books;
    this.#record = record;
  }

  /** Asks for every book on loan to come back. */
  recallOverdue() {
    const onLoan = this.#books.all().filter((book) => !book.available);
    this.#record(`recalled ${onLoan.length}`);
  }

  book(id: string): Book {
    const book = this.#books.find(id);
    if (!book) {
      throw new errors.NotFoundError({ message: `No book with id ${id}.` });
    }
    return book;
  }

  describe(id: string): BookSummary {
    const { title, available } = this.book(id);
    return { id, title, available };
  }

  list(): BookSummary[] {
    return this.#books.all().map(({ id, title, available }) => ({ id, title, available }));
  }
}
