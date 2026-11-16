import errors from '@tryghost/errors';

export class Book {
  readonly id: string;
  readonly title: string;
  #borrower: string | undefined;

  constructor(id: string, title: string, borrower?: string) {
    this.id = id;
    this.title = title;
    this.#borrower = borrower;
  }

  get available() {
    return this.#borrower === undefined;
  }

  lendTo(borrower: string) {
    if (!this.available) {
      throw new errors.ValidationError({ message: `${this.title} is already on loan.` });
    }
    this.#borrower = borrower;
  }
}
