import {
  CUSTOM_FIELD_SET_OPERATORS,
  METAFIELDS_FIELD_PREFIX,
  customFieldAddressing,
  metafieldFieldId,
} from './addressing';
import {
  FILTER_TYPES,
  domainField,
  listsOperator,
  setSemantics,
  textSemantics,
} from '@/shared/filters';
import {
  memberCustomFieldKind,
  memberCustomFieldParts,
} from '@tryghost/admin-x-framework/api/member-custom-fields';
import type {
  FieldDescriptor,
  FieldProvider,
  FilterTypeId,
  ValueSemantics,
} from '@/shared/filters';
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

// How each part of a composite filters. A typed part is text; a part picked from a
// list (a country) is a set, the way labels and tiers are: "is any of" a choice of them.
export type PartFilterType = 'text' | 'set';

export const PART_FILTER_TYPE: { [P in MemberCustomFieldPartType]: PartFilterType } = {
  short_text: 'text',
  postal_code: 'text',
  country_code: 'set',
};

// Parse order: a plain string is text ("is"), and only a list is a set ("is any of").
// Set semantics would also claim a plain string, so text has to be asked first.
const PART_FILTER_TYPES: readonly PartFilterType[] = ['text', 'set'];

const PART_SEMANTICS: { [T in PartFilterType]: () => ValueSemantics<string> } = {
  text: () => textSemantics(),
  // Quoted, as the text a sibling part holds is, so a code reads the same either way.
  set: () => setSemantics({ quoteStrings: true }),
};

export function partFilterType(
  type: MemberCustomField['type'],
  subfield: string,
): PartFilterType | undefined {
  const part = memberCustomFieldParts(type)?.find((candidate) => candidate.key === subfield);
  return part ? PART_FILTER_TYPE[part.type] : undefined;
}

function usedPartTypes(type: MemberCustomField['type']): readonly PartFilterType[] {
  const used = new Set((memberCustomFieldParts(type) ?? []).map((p) => PART_FILTER_TYPE[p.type]));
  return PART_FILTER_TYPES.filter((candidate) => used.has(candidate));
}

// A composite is read with one semantics, so it combines its parts' registered types:
// an operator serializes through the type that owns it, and a clause parses back by
// its shape, not by which part it names. The renderer offers each part only the
// operators of its own type, and moves an operator the part cannot use.
export function customFieldSemantics(partTypes: readonly PartFilterType[]): ValueSemantics<string> {
  const members = PART_FILTER_TYPES.filter((candidate) => partTypes.includes(candidate)).map(
    (candidate) => PART_SEMANTICS[candidate](),
  );

  return {
    operators: members.flatMap((member) => member.operators),
    serialize(input, ctx) {
      const owner = members.find((member) => listsOperator(member.operators, input.operator));
      return owner ? owner.serialize(input, ctx) : null;
    },
    parse(comparator, ctx) {
      for (const member of members) {
        // Set semantics would also read a lone value as a one-item set; here a
        // list is the only shape that means a set, so a lone value stays text.
        if (member !== members[0] && !Array.isArray(comparator.value)) {
          continue;
        }
        const parsed = member.parse(comparator, ctx);
        if (parsed) {
          return parsed;
        }
      }
      return null;
    },
  };
}

// The operators offered in the registered order of each part type, then presence.
export function customFieldOperators(partTypes: readonly PartFilterType[]): readonly string[] {
  return [
    ...PART_FILTER_TYPES.filter((candidate) => partTypes.includes(candidate)).flatMap(
      (candidate) => FILTER_TYPES[candidate].operators,
    ),
    ...CUSTOM_FIELD_SET_OPERATORS,
  ];
}

export const CUSTOM_FIELD_CLAUSE = METAFIELDS_FIELD_PREFIX;

export interface CustomFieldDefinition {
  namespace: string;
  key: string;
  name: string;
  type: MemberCustomField['type'];
}

export function customFieldDescriptor(definition: CustomFieldDefinition): FieldDescriptor {
  const kind = memberCustomFieldKind(definition.type);

  if (kind === 'record') {
    return domainField({
      key: metafieldFieldId(definition),
      icon: 'text',
      semantics: customFieldSemantics(usedPartTypes(definition.type)),
      operators: customFieldOperators(usedPartTypes(definition.type)),
      addressing: customFieldAddressing(definition),
      ui: {
        label: definition.name,
        type: 'custom',
        defaultOperator: 'is-set',
      },
    });
  }

  return {
    key: metafieldFieldId(definition),
    icon: 'text',
    type: SCALAR_KIND_FILTER_TYPE[kind],
    addressing: customFieldAddressing(definition),
    ui: {
      label: definition.name,
      type: 'custom',
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
