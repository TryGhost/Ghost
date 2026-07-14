import {GiftLinksService} from './service';
import {recordGiftLinkAction, type RecordGiftLinkAction} from './actions';

export type {RequestContext} from './actions';

// Constructed by init() at boot, not at import: knex is only available once the DB has connected.
export let service: GiftLinksService | undefined;

export function init(): void {
    if (service) {
        return;
    }

    const {knex} = require('../../data/db');
    const models = require('../../models');

    const recordAction: RecordGiftLinkAction = ({context, verb, subject}) =>
        recordGiftLinkAction({Action: models.Action, context, verb, subject});
    service = new GiftLinksService({knex, recordAction});
}
