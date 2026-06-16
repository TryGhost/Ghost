import {GiftLinksService} from './gift-links-service';
import {GiftLinkBookshelfRepository} from './gift-link-bookshelf-repository';

/**
 * The one CJS bridge for the gift-links service: boot, the API endpoint and the
 * frontend reader all reach the singleton through `require()`, so this module
 * exports via `module.exports =`. Everything else in this directory is plain ESM
 * and imported directly above to stay typed.
 *
 * `init()` lazily wires the Bookshelf model into a repository so that requiring
 * this module doesn't trigger model loading.
 */
class GiftLinksServiceWrapper {
    service?: GiftLinksService;

    init(): void {
        if (this.service) {
            return;
        }

        // `../../models` is untyped JS and only registers after boot, so it's
        // required lazily rather than imported.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const models = require('../../models');

        const repository = new GiftLinkBookshelfRepository({
            GiftLinkModel: models.GiftLink,
            knex: models.Base.knex
        });

        this.service = new GiftLinksService({giftLinkRepository: repository});
    }
}

// module.exports required - using `export` causes the module to fail to register
// with the web framework as it's loaded via require()
module.exports = new GiftLinksServiceWrapper();
