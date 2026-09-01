import { customFieldAddressing } from './addressing';
import {
  memberCustomFieldKind,
  memberCustomFieldParts,
} from '@tryghost/admin-x-framework/api/member-custom-fields';
import type { FieldDescriptor, FieldProvider, FilterTypeId } from '@/shared/filters';
import type {
  MemberCustomField,
  MemberCustomFieldKind,
  MemberCustomFieldPartType,
} from '@tryghost/admin-x-framework/api/member-custom-fields';

export const SCALAR_KIND_FILTER_TYPE: {
  [K in Exclude<MemberCustomFieldKind, 'record'>]: FilterTypeId;
} = {
  text: 'text',
  date: 'plain_date',
  number: 'number',
};

export const PART_FILTER_TYPE: { [P in MemberCustomFieldPartType]: FilterTypeId } = {
  short_text: 'text',
  postal_code: 'text',
  country_code: 'text',
};

function compositeFilterType(type: MemberCustomField['type']): FilterTypeId {
  const partFilterTypes = [
    ...new Set((memberCustomFieldParts(type) ?? []).map((p) => PART_FILTER_TYPE[p.type])),
  ];

  if (partFilterTypes.length > 1) {
    throw new Error(
      `The parts of '${type}' filter as different types (${partFilterTypes.join(', ')}), ` +
        'but the filter engine reads a composite with a single semantics. Build per-part ' +
        'dispatch into the codec before mapping a part type away from its siblings.',
    );
  }

  return partFilterTypes[0] ?? 'text';
}

export const CUSTOM_FIELD_CLAUSE = 'custom_fields.';

export interface CustomFieldDefinition {
  key: string;
  name: string;
  type: MemberCustomField['type'];
}

export function customFieldDescriptor(definition: CustomFieldDefinition): FieldDescriptor {
  const kind = memberCustomFieldKind(definition.type);

  return {
    key: `custom_fields.${definition.key}`,
    icon: 'text',
    type: kind === 'record' ? compositeFilterType(definition.type) : SCALAR_KIND_FILTER_TYPE[kind],
    addressing: customFieldAddressing(definition.key),
    ui: {
      label: definition.name,
      type: 'custom',
      ...(kind === 'record' ? { defaultOperator: 'is-set' } : {}),
    },
  } as FieldDescriptor;
}

export function customFieldProvider(
  definitions: readonly CustomFieldDefinition[] | undefined,
): FieldProvider {
  return {
    resolved: definitions !== undefined,
    claims: [CUSTOM_FIELD_CLAUSE],
    fields: (definitions ?? []).map(customFieldDescriptor),
  };
}
