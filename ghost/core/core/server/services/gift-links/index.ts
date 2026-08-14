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
