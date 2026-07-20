import {CustomFieldDefinitionsService} from './definitions-service';
import {CustomFieldValuesService} from './values-service';
import {recordCustomFieldAction, type RecordCustomFieldAction} from './actions';
import {resolveMaxDefinitions} from './config';

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

    // Resolved here, not in the service: reading config is this module's job, and
    // the service is handed a number. A getter rather than a value because the
    // ceiling is an operator setting that can change between requests, and a Ghost
    // container holds no state across them.
    const config = require('../../../shared/config');

    definitions = new CustomFieldDefinitionsService({
        knex,
        recordAction,
        getMaxDefinitions: () => resolveMaxDefinitions(config.get('members:customFields:maxDefinitions'))
    });
    // The values service reads the field definitions straight from the table, so
    // it needs knex and the same ceiling — no handle on the definitions service.
    // A write can't name more keys than the site is allowed definitions, so the
    // two share one number rather than the value path inventing its own.
    values = new CustomFieldValuesService({
        knex,
        getMaxDefinitions: () => resolveMaxDefinitions(config.get('members:customFields:maxDefinitions'))
    });
}
