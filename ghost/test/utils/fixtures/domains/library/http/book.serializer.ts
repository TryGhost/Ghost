import type { BookSummary } from '../data/book.data';

export function serializeBooks(books: BookSummary[]) {
  return { books: books.map(({ id, title, available }) => ({ id, title, available })) };
}
