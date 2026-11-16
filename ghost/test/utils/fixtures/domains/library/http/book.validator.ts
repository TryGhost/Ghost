import errors from '@tryghost/errors';

export function validateLoan(body: unknown): { borrower: string } {
  const borrower = (body as { borrower?: unknown } | undefined)?.borrower;
  if (typeof borrower !== 'string' || borrower.length === 0) {
    throw new errors.ValidationError({ message: 'A loan needs a borrower.' });
  }
  return { borrower };
}
