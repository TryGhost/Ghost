import { z } from 'zod';
import { defineDomain } from '@tryghost/kernel/domains/definitions';
import type { Logger } from '@tryghost/kernel/logging';

/** The part of the application's config the library reads, and its shape. */
const DeskConfig = z.object({
  name: z.string().min(1),
  loanDays: z.number().int().positive(),
});

// Everything the library's service roots need from outside the domain. With
// this file, no root in the domain imports anything but the domain and the kernel.
export interface LibraryDependencies {
  readonly publish: (event: object) => Promise<void>;
  readonly now: () => Date;
  readonly record: (entry: string) => void;
  readonly desk: z.output<typeof DeskConfig>;
  readonly logging: Pick<Logger, 'info'>;
}

export default defineDomain<LibraryDependencies>({
  // The foundation is handed in. What the application shares beyond it is imported here.
  dependencies: ({ config, logging, events }) => {
    const { clock, journal }: typeof import('../../second-application/shared') = require('../../second-application/shared');
    return {
      publish: async (event) => events.dispatch(event),
      now: clock.now,
      record: (entry) => {
        journal.push(entry);
      },
      // Parsed once, here: a desk the library cannot use stops the application starting.
      desk: config.slice('desk', DeskConfig),
      logging,
    };
  },
});
