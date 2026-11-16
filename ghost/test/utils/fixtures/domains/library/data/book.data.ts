/** A book as other domains see it. */
export interface BookSummary {
  readonly id: string;
  readonly title: string;
  readonly available: boolean;
}

export interface LoanReceipt {
  readonly bookId: string;
  readonly borrower: string;
  readonly lentAt: string;
}
