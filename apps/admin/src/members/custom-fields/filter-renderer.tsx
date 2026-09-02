import React, { useEffect } from 'react';
import { parseMetafieldFieldId } from './addressing';
import { CUSTOM_FIELD_SET_OPERATORS } from './addressing';
import { FilterSegmentInput, FilterSegmentSelect } from '@tryghost/shade/patterns';
import { createOperatorOptions, listsOperator } from '@/shared/filters';
import { memberCustomFieldParts } from '@tryghost/admin-x-framework/api/member-custom-fields';
import { useCustomFieldDefinitionsIncludingArchived } from '@/shared/member-custom-fields/use-definitions';
import type { CustomRendererProps, FilterFieldConfig } from '@tryghost/shade/patterns';

// "Is set" and "is not set" apply to a field of any value type.
const PRESENCE_ONLY_OPTIONS = createOperatorOptions(CUSTOM_FIELD_SET_OPERATORS);

function offeredOperators(field: FilterFieldConfig<string>, wholeComposite: boolean) {
  const declared = field.operators?.length ? field.operators : PRESENCE_ONLY_OPTIONS;
  const options = wholeComposite
    ? declared.filter((option) => listsOperator(CUSTOM_FIELD_SET_OPERATORS, option.value))
    : declared;
  const ids = options.map((option) => option.value);
  const fallback =
    field.defaultOperator && ids.includes(field.defaultOperator)
      ? field.defaultOperator
      : (ids[0] ?? 'is-set');

  return { options, ids, fallback };
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

  const [subfield = '', value = ''] = values;
  const isWholeField = subfield === '';

  const {
    options: operatorOptions,
    ids: operators,
    fallback: fallbackOperator,
  } = offeredOperators(field, isComposite && isWholeField);

  useEffect(() => {
    if (readOnly || !onOperatorChange || operators.includes(operator)) {
      return;
    }
    onOperatorChange(fallbackOperator);
  }, [readOnly, operator, operators, fallbackOperator, onOperatorChange]);

  const needsValue = !listsOperator(CUSTOM_FIELD_SET_OPERATORS, operator);
  const partOptions = [{ value: '', label: 'Any' }, ...parts];

  return (
    <>
      {isComposite && (
        <FilterSegmentSelect
          ariaLabel={`${fieldLabel} part`}
          options={partOptions}
          readOnly={readOnly}
          testId="custom-field-filter-subfield"
          value={subfield}
          onChange={(nextSubfield) => onChange([nextSubfield, value])}
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

      {needsValue && (
        <FilterSegmentInput
          ariaLabel={`${fieldLabel} value`}
          placeholder="Enter value..."
          readOnly={readOnly}
          testId="custom-field-filter-value"
          value={value}
          onChange={(nextValue) => onChange([subfield, nextValue])}
        />
      )}
    </>
  );
};

export default CustomFieldFilterRenderer;
