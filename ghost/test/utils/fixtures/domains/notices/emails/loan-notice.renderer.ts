import type { Notice } from '../data/notice.data';

/** Writes the notice for a loan. A real renderer would fill a template. */
export function renderLoanNotice(loan: { title: string; borrower: string }): Notice {
  return {
    subject: `${loan.title} was lent`,
    body: `${loan.borrower} borrowed ${loan.title}.`,
  };
}
