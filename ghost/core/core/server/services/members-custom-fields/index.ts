import {CustomFieldsService} from './service';
import {recordCustomFieldAction, type RecordCustomFieldAction} from './actions';

export type {CustomField} from './models';
export type {RequestContext} from './actions';

// Constructed by init() at boot, not at import: knex is only available once the DB has connected.
export let service: CustomFieldsService | undefined;

export function init(): void {
    if (service) {
        return;
    }

    const {knex} = require('../../data/db');
    const models = require('../../models');

    const recordAction: RecordCustomFieldAction = ({context, verb, subject}) =>
        recordCustomFieldAction({Action: models.Action, context, verb, subject});

    service = new CustomFieldsService({knex, recordAction});
}
