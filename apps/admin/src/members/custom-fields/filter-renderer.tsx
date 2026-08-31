import React, { useEffect } from 'react';
import { CUSTOM_FIELDS_PREFIX, CUSTOM_FIELD_OPERATORS } from '@/members/member-fields';
import { CUSTOM_FIELD_SET_OPERATORS } from './addressing';
import { FilterSegmentInput, FilterSegmentSelect } from '@tryghost/shade/patterns';
import { createOperatorOptions, listsOperator } from '@/shared/filters';
import { memberCustomFieldParts } from '@tryghost/admin-x-framework/api/member-custom-fields';
import { useCustomFieldDefinitionsIncludingArchived } from '@/shared/member-custom-fields/use-definitions';
import type { CustomRendererProps } from '@tryghost/shade/patterns';

const CustomFieldFilterRenderer: React.FC<CustomRendererProps<string>> = ({
  field,
  values,
  onChange,
  operator,
  onOperatorChange,
  readOnly,
}) => {
  const { data } = useCustomFieldDefinitionsIncludingArchived();
  const definitions = data?.members_custom_fields ?? [];

  const fieldKey = (field.key ?? '').slice(CUSTOM_FIELDS_PREFIX.length);
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

  const operators =
    isComposite && isWholeField ? CUSTOM_FIELD_SET_OPERATORS : CUSTOM_FIELD_OPERATORS;

  useEffect(() => {
    if (readOnly || !onOperatorChange || listsOperator(operators, operator)) {
      return;
    }
    onOperatorChange('is-set');
  }, [readOnly, operator, operators, onOperatorChange]);

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
          options={createOperatorOptions(operators)}
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
