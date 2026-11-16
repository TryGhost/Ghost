import { Book } from '../entities/book.entity';

/** Books kept in memory. A real repository would be given a database connection. */
export class BookRepository {
  readonly #books = new Map<string, Book>();

  constructor(titles: Readonly<Record<string, string>>) {
    for (const [id, title] of Object.entries(titles)) {
      this.#books.set(id, new Book(id, title));
    }
  }

  find(id: string) {
    return this.#books.get(id);
  }

  all() {
    return [...this.#books.values()];
  }
}
