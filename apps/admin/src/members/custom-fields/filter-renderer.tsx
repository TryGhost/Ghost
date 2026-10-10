import React, { useEffect, useMemo } from 'react';
import { CUSTOM_FIELD_SET_OPERATORS, parseMetafieldFieldId } from './addressing';
import { FILTER_TYPES, createOperatorOptions, listsOperator } from '@/shared/filters';
import {
  FilterSegmentInput,
  FilterSegmentMultiSelect,
  FilterSegmentSelect,
} from '@tryghost/shade/patterns';
import { countryOptions } from '@tryghost/admin-x-framework/utils/countries';
import { memberCustomFieldParts } from '@tryghost/admin-x-framework/api/member-custom-fields';
import { partFilterType } from './filter-fields';
import { useCustomFieldDefinitionsIncludingArchived } from '@/shared/member-custom-fields/use-definitions';
import type { CustomRendererProps, FilterFieldConfig } from '@tryghost/shade/patterns';
import type { PartFilterType } from './filter-fields';

// "Is set" and "is not set" apply to a field of any value type.
const PRESENCE_ONLY_OPTIONS = createOperatorOptions(CUSTOM_FIELD_SET_OPERATORS);

// The whole of a composite has no value of its own, so it filters on presence alone;
// a part filters with the operators of its own type (text typed in, or a set picked
// from a list) plus presence; a scalar field offers everything it declared.
function offeredOperators(field: FilterFieldConfig<string>, part: PartFilterType | 'whole' | null) {
  const declared = field.operators?.length ? field.operators : PRESENCE_ONLY_OPTIONS;
  const allowed =
    part === 'whole'
      ? CUSTOM_FIELD_SET_OPERATORS
      : part
        ? [...FILTER_TYPES[part].operators, ...CUSTOM_FIELD_SET_OPERATORS]
        : null;
  const options = allowed
    ? declared.filter((option) => listsOperator(allowed, option.value))
    : declared;
  const ids = options.map((option) => option.value);

  // An operator the new part cannot use moves to the first it can: "is" for a typed
  // part, "is any of" for a picked one, presence for the whole.
  return { options, ids, fallback: ids[0] ?? 'is-set' };
}

const CustomFieldFilterRenderer: React.FC<CustomRendererProps<string>> = ({
  field,
  values,
  onChange,
  operator,
  onOperatorChange,
  readOnly,
}) => {
  const { data } = useCustomFieldDefinitionsIncludingArchived();
  const definitions = data ?? [];

  const fieldKey = parseMetafieldFieldId(field.key ?? '')?.key ?? '';
  const definition = definitions.find((candidate) => candidate.key === fieldKey);
  const parts = definition
    ? (memberCustomFieldParts(definition.type) ?? []).map(({ key, label }) => ({
        value: key,
        label,
      }))
    : [];
  const fieldLabel = field.label ?? definition?.name ?? 'Custom field';
  const isComposite = parts.length > 0;

  // The part first, then what it holds: one text, or the codes an "is any of" lists.
  const [subfield = '', ...rest] = values;
  const partType = definition ? partFilterType(definition.type, subfield) : undefined;
  const filtersAs = isComposite ? (partType ?? 'whole') : null;

  const {
    options: operatorOptions,
    ids: operators,
    fallback: fallbackOperator,
  } = offeredOperators(field, filtersAs);

  useEffect(() => {
    if (readOnly || !onOperatorChange || operators.includes(operator)) {
      return;
    }
    onOperatorChange(fallbackOperator);
  }, [readOnly, operator, operators, fallbackOperator, onOperatorChange]);

  const needsValue = !listsOperator(CUSTOM_FIELD_SET_OPERATORS, operator);
  const partOptions = [{ value: '', label: 'Any' }, ...parts];
  // A presence pill carries an empty value slot; it is not a code.
  const codes = useMemo(() => values.slice(1).filter((code) => code !== ''), [values]);

  return (
    <>
      {isComposite && (
        <FilterSegmentSelect
          ariaLabel={`${fieldLabel} part`}
          options={partOptions}
          readOnly={readOnly}
          testId="custom-field-filter-subfield"
          value={subfield}
          onChange={(nextSubfield) => {
            // What one part holds is meaningless to a part of another type: a
            // country code is not a city, and a city is not on the country list.
            const sameType =
              definition && partFilterType(definition.type, nextSubfield) === partType;
            onChange(sameType ? [nextSubfield, ...rest] : [nextSubfield]);
          }}
        />
      )}

      {onOperatorChange && (
        <FilterSegmentSelect
          ariaLabel={`${fieldLabel} operator`}
          options={operatorOptions}
          readOnly={readOnly}
          testId="custom-field-filter-operator"
          value={operator}
          onChange={onOperatorChange}
        />
      )}

      {needsValue && filtersAs === 'set' && (
        <FilterSegmentMultiSelect
          ariaLabel={`${fieldLabel} value`}
          options={countryOptions(codes)}
          placeholder="Select countries..."
          readOnly={readOnly}
          searchPlaceholder="Search countries..."
          testId="custom-field-filter-value"
          values={codes}
          onChange={(nextCodes) => onChange([subfield, ...nextCodes])}
        />
      )}

      {needsValue && filtersAs !== 'set' && (
        <FilterSegmentInput
          ariaLabel={`${fieldLabel} value`}
          placeholder="Enter value..."
          readOnly={readOnly}
          testId="custom-field-filter-value"
          value={rest[0] ?? ''}
          onChange={(nextValue) => onChange([subfield, nextValue])}
        />
      )}
    </>
  );
};

export default CustomFieldFilterRenderer;
