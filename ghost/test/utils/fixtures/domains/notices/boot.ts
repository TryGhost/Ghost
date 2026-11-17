import { defineDomain } from '../../../../../core/kernel/domains/definitions';

export interface NoticesDependencies {
  readonly publish: (event: object) => Promise<void>;
  readonly record: (entry: string) => void;
  /** When an event happened is given by whoever publishes it. */
  readonly now: () => Date;
  /** Another domain, through its public action. */
  readonly describeBook: (id: string) => { title: string };
}

export default defineDomain<NoticesDependencies>({
  dependencies: ({ events }) => {
    const {
      clock,
      journal,
    }: typeof import('../../second-application/shared') = require('../../second-application/shared');
    const {
      describeBook,
    }: typeof import('../library/actions/describe-book.action') = require('../library/actions/describe-book.action');
    return {
      publish: async (event) => events.dispatch(event),
      record: (entry) => {
        journal.push(entry);
      },
      describeBook,
      now: clock.now,
    };
  },
});
