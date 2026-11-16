import type { Notice } from '../../data/notice.data';
import { renderLoanNotice } from '../../emails/loan-notice.renderer';
import NoticeRecorded from '../../events/notice-recorded.event';

export class NoticeService {
  readonly #notices: Notice[] = [];
  readonly #publish: (event: object) => Promise<void>;
  readonly #describeBook: (id: string) => { title: string };

  constructor(deps: {
    publish: (event: object) => Promise<void>;
    describeBook: (id: string) => { title: string };
  }) {
    this.#publish = deps.publish;
    this.#describeBook = deps.describeBook;
  }

  async recordLoan(loan: { bookId: string; borrower: string }) {
    // The other domain is asked at the moment of use.
    const { title } = this.#describeBook(loan.bookId);
    const notice = renderLoanNotice({ title, borrower: loan.borrower });
    this.#notices.push(notice);
    await this.#publish(NoticeRecorded.create(notice));
  }

  list(): Notice[] {
    return [...this.#notices];
  }
}
