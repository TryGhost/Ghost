import type {Knex} from 'knex';
import type {FieldType} from '@tryghost/custom-field-types';
import {FIELD_STATUS} from './schema';

const FIELDS_TABLE = 'members_custom_fields';
const BINDINGS_TABLE = 'members_custom_field_bindings';

/** A destination resolved to the field it writes into, and the binding that routed it. */
export interface BoundField {
    bindingId: string;
    key: string;
    type: FieldType;
}

/**
 * Where a source sends what it collected, for whoever is about to write it.
 *
 * The read half of a binding, and all that is here. Creating one is what configuring a
 * source means, so the tier's checkout configuration writes it in the same transaction that
 * turns collection on. Reading one is a different caller entirely — a webhook holding a
 * value and a port — which is why this stays.
 */
export class CustomFieldBindingsService {
    private knex: Knex;

    constructor({knex}: {knex: Knex}) {
        this.knex = knex;
    }

    /**
     * The field a source's port lands in, or null when there is nowhere.
     *
     * Null covers three situations a caller does not need to tell apart: nothing bound,
     * bound to a field since archived, and a port this build does not know. All three mean
     * the same at the moment of a write, and none of them is an error.
     *
     * The binding's id comes back with it, because the value being written records which
     * binding routed it — the whole of its provenance in one reference.
     */
    async resolve(productId: string, port: string): Promise<BoundField | null> {
        const row = await this.knex(BINDINGS_TABLE)
            .join(FIELDS_TABLE, `${BINDINGS_TABLE}.custom_field_key`, `${FIELDS_TABLE}.key`)
            .where(`${BINDINGS_TABLE}.product_id`, productId)
            .where(`${BINDINGS_TABLE}.port`, port)
            .where(`${FIELDS_TABLE}.status`, FIELD_STATUS.active)
            .select(`${BINDINGS_TABLE}.id as binding_id`, `${FIELDS_TABLE}.key`, `${FIELDS_TABLE}.type`)
            .first();

        return row ? {bindingId: row.binding_id, key: row.key, type: row.type} : null;
    }
}
