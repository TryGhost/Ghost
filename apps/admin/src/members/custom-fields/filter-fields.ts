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
  matchShape,
  type FieldType,
  type Leaf,
  type LeafKind,
} from '@tryghost/metafield-types/structure';
import type {
  FieldDescriptor,
  FieldProvider,
  PresenceAddressing,
  ValueSemantics,
} from '@/shared/filters';
import type { MemberCustomField } from '@tryghost/admin-x-framework/api/member-custom-fields';

type ScalarFilterBase = {
  key: string;
  icon: 'text';
  addressing: PresenceAddressing;
  ui: { label: string; type: 'custom' };
};

// How each leaf filters. Typed text is text; a choice picked from a list is a set, the way labels
// and tiers are: "is any of" a choice of them.
export type LeafFilterType = 'text' | 'set';

export const LEAF_FILTER: { [K in LeafKind]: LeafFilterType } = { text: 'text', choice: 'set' };

// Each entry builds its own descriptor so the compiler checks it against that filter type, which a
// map to a union of filter types can't do.
const SCALAR_FILTER: { [F in LeafFilterType]: (base: ScalarFilterBase) => FieldDescriptor } = {
  text: (base) => ({ ...base, type: 'text' }),
  set: (base) => ({ ...base, type: 'set' }),
};

// Parse order: a plain string is text ("is"), and only a list is a set ("is any of").
// Set semantics would also claim a plain string, so text has to be asked first.
const LEAF_FILTER_TYPES: readonly LeafFilterType[] = ['text', 'set'];

const LEAF_SEMANTICS: { [T in LeafFilterType]: () => ValueSemantics<string> } = {
  text: () => textSemantics(),
  // Quoted, as the text a sibling part holds is, so a code reads the same either way.
  set: () => setSemantics({ quoteStrings: true }),
};

const partNamed = (parts: Readonly<Record<string, Leaf>>, part: string): Leaf | undefined =>
  Object.entries(parts).find(([name]) => name === part)?.[1];

/** The leaf a filter on `part` compares: a scalar's own, or the named part of a record. */
export function filterLeaf(type: FieldType, part: string): Leaf | undefined {
  return matchShape<Leaf | undefined>(type, {
    scalar: ({ leaf }) => leaf,
    record: ({ parts }) => partNamed(parts, part),
    // A list's options are its field's own, not a leaf's.
    set: () => undefined,
  });
}

export function partFilterType(
  type: MemberCustomField['type'],
  part: string,
): LeafFilterType | undefined {
  return matchShape<LeafFilterType | undefined>(type, {
    scalar: () => undefined,
    record: ({ parts }) => {
      const leaf = partNamed(parts, part);
      return leaf && LEAF_FILTER[leaf.leaf];
    },
    set: () => undefined,
  });
}

function usedFilterTypes(parts: Readonly<Record<string, Leaf>>): readonly LeafFilterType[] {
  const used = new Set(Object.values(parts).map((leaf) => LEAF_FILTER[leaf.leaf]));
  return LEAF_FILTER_TYPES.filter((candidate) => used.has(candidate));
}

// A composite is read with one semantics, so it combines its parts' registered types:
// an operator serializes through the type that owns it, and a clause parses back by
// its shape, not by which part it names. The renderer offers each part only the
// operators of its own type, and moves an operator the part cannot use.
export function customFieldSemantics(partTypes: readonly LeafFilterType[]): ValueSemantics<string> {
  const members = LEAF_FILTER_TYPES.filter((candidate) => partTypes.includes(candidate)).map(
    (candidate) => LEAF_SEMANTICS[candidate](),
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
export function customFieldOperators(partTypes: readonly LeafFilterType[]): readonly string[] {
  return [
    ...LEAF_FILTER_TYPES.filter((candidate) => partTypes.includes(candidate)).flatMap(
      (candidate) => FILTER_TYPES[candidate].operators,
    ),
    ...CUSTOM_FIELD_SET_OPERATORS,
  ];
}

export const CUSTOM_FIELD_CLAUSE = METAFIELDS_FIELD_PREFIX;

export type CustomFieldDefinition = Pick<MemberCustomField, 'namespace' | 'key' | 'name' | 'type'>;

export function customFieldDescriptor(definition: CustomFieldDefinition): FieldDescriptor {
  return matchShape<FieldDescriptor>(definition.type, {
    scalar: ({ leaf }) =>
      SCALAR_FILTER[LEAF_FILTER[leaf.leaf]]({
        key: metafieldFieldId(definition),
        icon: 'text',
        addressing: customFieldAddressing(definition),
        ui: {
          label: definition.name,
          type: 'custom',
        },
      }),
    record: ({ parts }) =>
      domainField({
        key: metafieldFieldId(definition),
        icon: 'text',
        semantics: customFieldSemantics(usedFilterTypes(parts)),
        operators: customFieldOperators(usedFilterTypes(parts)),
        addressing: customFieldAddressing(definition),
        ui: {
          label: definition.name,
          type: 'custom',
          defaultOperator: 'is-set',
        },
      }),
    // Options are picked, as labels are: "is any of" a choice of them, or "is none of".
    set: () =>
      domainField({
        key: metafieldFieldId(definition),
        icon: 'text',
        semantics: customFieldSemantics(['set']),
        operators: customFieldOperators(['set']),
        addressing: customFieldAddressing(definition),
        ui: {
          label: definition.name,
          type: 'custom',
          defaultOperator: 'is-any',
        },
      }),
  });
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
