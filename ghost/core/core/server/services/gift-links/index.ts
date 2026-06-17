import {GiftLinksService} from './gift-links-service';
import {GiftLinkBookshelfRepository} from './gift-link-bookshelf-repository';

// Wired by init() at boot. Left undefined until then so that requiring this
// module doesn't pull in the model layer (init lazily requires ../../models).
// Consumers import this binding and assert it with `service!` (set before any
// request is served).
export let service: GiftLinksService | undefined;

export function init(): void {
    if (service) {
        return;
    }

    // `../../models` is untyped JS and only registers after boot, so it's
    // required lazily rather than imported.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const models = require('../../models');

    service = new GiftLinksService({
        giftLinkRepository: new GiftLinkBookshelfRepository({
            GiftLinkModel: models.GiftLink,
            knex: models.Base.knex
        })
    });
}
