import {GiftLinksService} from './service';

// Set by init() at boot, not at import: knex only exists once the DB has connected.
export let service: GiftLinksService | undefined;

export function init(): void {
    if (service) {
        return;
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {knex} = require('../../data/db');

    service = new GiftLinksService({knex});
}

// Test seam: inject (or clear) the service singleton. The exported `service`
// binding above is read-only to importers once compiled, so tests that need a
// stubbed service set it through here rather than by assignment.
export function setService(stub: GiftLinksService | undefined): void {
    service = stub;
}

// The frontend reader path (/g/) consumes these. Lazily required (on access, not
// at module load) so this module can be required at boot without pulling in the
// middleware's frontend deps.
export const middleware = {
    get loadGiftLink() {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        return require('./middleware').loadGiftLink;
    },
    get countGiftRead() {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        return require('./middleware').countGiftRead;
    }
};
