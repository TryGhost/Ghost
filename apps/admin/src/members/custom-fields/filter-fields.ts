import {CUSTOM_FIELD_SET_OPERATORS, customFieldAddressing} from './addressing';
import {filterType} from '@/shared/filters';
import {memberCustomFieldKind} from '@tryghost/admin-x-framework/api/member-custom-fields';
import type {FieldDescriptor, FieldProvider, FilterTypeId} from '@/shared/filters';
import type {MemberCustomField, MemberCustomFieldKind} from '@tryghost/admin-x-framework/api/member-custom-fields';

const FILTER_TYPE_FOR_KIND: Record<MemberCustomFieldKind, FilterTypeId> = {
    text: 'text',
    date: 'plain_date',
    number: 'number',
    record: 'text'
};

export const CUSTOM_FIELD_CLAUSE = 'custom_fields.';

export interface CustomFieldDefinition {
    key: string;
    name: string;
    type: MemberCustomField['type'];
}

function filterTypeFor(type: MemberCustomField['type']): FilterTypeId {
    return FILTER_TYPE_FOR_KIND[memberCustomFieldKind(type)];
}

export function customFieldDescriptor(definition: CustomFieldDefinition): FieldDescriptor {
    const type = filterTypeFor(definition.type);
    const isRecord = memberCustomFieldKind(definition.type) === 'record';

    return {
        key: `custom_fields.${definition.key}`,
        icon: 'text',
        type,
        addressing: customFieldAddressing(definition.key),
        ui: {
            label: definition.name,
            type: 'custom',
            defaultOperator: isRecord
                ? CUSTOM_FIELD_SET_OPERATORS[0]
                : filterType(type).defaultOperator ?? CUSTOM_FIELD_SET_OPERATORS[0]
        }
    } as FieldDescriptor;
}

export function customFieldProvider(definitions: readonly CustomFieldDefinition[] | undefined): FieldProvider {
    return {
        resolved: definitions !== undefined,
        claims: [CUSTOM_FIELD_CLAUSE],
        fields: (definitions ?? []).map(customFieldDescriptor)
    };
}
