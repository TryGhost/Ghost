import { customFieldAddressing } from './addressing';
import { memberCustomFieldKind } from '@tryghost/admin-x-framework/api/member-custom-fields';
import type { FieldDescriptor, FieldProvider, FilterTypeId } from '@/shared/filters';
import type {
  MemberCustomField,
  MemberCustomFieldKind,
} from '@tryghost/admin-x-framework/api/member-custom-fields';

export const KIND_FILTER_TYPE: { [K in MemberCustomFieldKind]: FilterTypeId } = {
  text: 'text',
  date: 'plain_date',
  number: 'number',
  record: 'text',
};

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
    type: KIND_FILTER_TYPE[kind],
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
