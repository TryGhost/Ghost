import { defineDomain } from '../../../../../core/kernel/domains/definitions';
import { bus, clock, journal } from '../../domain-foundation';

// Everything the library's service roots need from outside the domain. With
// this file, no root in the domain imports application code.
export interface LibraryDependencies {
  readonly publish: (event: object) => Promise<void>;
  readonly now: () => Date;
  readonly record: (entry: string) => void;
}

export default defineDomain<LibraryDependencies>({
  dependencies: () => ({
    publish: (event) => bus.dispatch(event),
    now: clock.now,
    record: (entry) => {
      journal.push(entry);
    },
  }),
});
