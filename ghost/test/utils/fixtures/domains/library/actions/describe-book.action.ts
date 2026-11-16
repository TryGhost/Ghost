import type { BookSummary } from '../data/book.data';
import catalogue from '../services/catalogue';

/** What the library knows about a book. */
export function describeBook(id: string): BookSummary {
  // The service is found when the action is called, not when this file is imported.
  return catalogue.service.describe(id);
}
