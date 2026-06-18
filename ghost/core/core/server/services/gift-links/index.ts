import {GiftLinksService} from './gift-links-service';
import {GiftLinkKnexRepository} from './gift-link-knex-repository';

// Set by init() at boot (knex isn't available at import time); consumers read the live binding.
export let service: GiftLinksService | undefined;

export function init(): void {
    if (service) {
        return;
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {knex} = require('../../data/db');

    service = new GiftLinksService({
        repository: new GiftLinkKnexRepository({knex})
    });
}
