import catalogue from '../services/catalogue';
import lending from '../services/lending';
import { serializeBooks } from './book.serializer';
import { validateLoan } from './book.validator';

// Handlers take a plain frame and return plain data. The web layer owns the
// request, the response and the middleware.
interface Frame {
  readonly params: Record<string, string>;
  readonly body?: unknown;
}

export function browse() {
  return serializeBooks(catalogue.service.list());
}

export async function lend(frame: Frame) {
  const { borrower } = validateLoan(frame.body);
  return { loans: [await lending.service.lend(frame.params.id!, borrower)] };
}
