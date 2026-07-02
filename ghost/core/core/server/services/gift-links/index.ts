import {GiftLinksService} from './service';
import {actionLogger} from '../actions';

// Set by init() at boot, not at import: knex only exists once the DB has connected.
export let service: GiftLinksService | undefined;

export function init(): void {
    if (service) {
        return;
    }

    const {knex} = require('../../data/db');
    const models = require('../../models');

    service = new GiftLinksService({knex, logAction: actionLogger(models.Action)});
}
