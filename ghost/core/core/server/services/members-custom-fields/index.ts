import {CustomFieldDefinitionsService} from './definitions-service';
import {CustomFieldValuesService} from './values-service';
import {recordCustomFieldAction, type RecordCustomFieldAction} from './actions';

export type {CustomField} from './models';
export type {RequestContext} from './actions';

// Two services from one module, split along an aggregate boundary rather than a
// technical layer: `definitions` owns the field definitions, which belong to the
// site's settings, and `values` owns the per-member values, which belong to the
// member. The values service reads the definitions table directly for the
// reference data it needs — a value referencing its definition, not a boundary
// crossing.
//
// Constructed by init() at boot, not at import: knex is only available once the DB has connected.
export let definitions: CustomFieldDefinitionsService | undefined;
export let values: CustomFieldValuesService | undefined;

export function init(): void {
    // The two are constructed together below, so checking both keeps the "both or
    // neither" invariant explicit rather than trusting one to stand in for the pair.
    if (definitions && values) {
        return;
    }

    const {knex} = require('../../data/db');
    const models = require('../../models');

    const recordAction: RecordCustomFieldAction = ({context, verb, subject, details}) =>
        recordCustomFieldAction({Action: models.Action, context, verb, subject, details});

    definitions = new CustomFieldDefinitionsService({knex, recordAction});
    // The values service reads the field definitions straight from the table, so
    // it needs only knex — no handle on the definitions service.
    values = new CustomFieldValuesService({knex});
}
