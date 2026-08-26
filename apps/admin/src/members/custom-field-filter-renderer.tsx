import React, {useEffect} from 'react';
import {CUSTOM_FIELD_OPERATORS, CUSTOM_FIELD_SET_OPERATORS} from './member-fields';
import {FilterSegmentInput, FilterSegmentSelect} from '@tryghost/shade/patterns';
import {createOperatorOptions} from '@/shared/filters';
import {memberCustomFieldParts, useBrowseMemberCustomFieldsIncludingArchived} from '@tryghost/admin-x-framework/api/member-custom-fields';
import type {CustomRendererProps} from '@tryghost/shade/patterns';

// The dropdown entry has already chosen the field (its key is in `field.key` as
// `custom_field.<key>`), so this renders only what's left in the pill: for a
// composite field a part selector (with "Any" for the whole field), then the
// operator, then the value. The predicate carries [subfield, value]; subfield is ''
// for a scalar field or the "Any" whole-field set/unset case. The operator lives here
// because its valid set depends on the part chosen here.

const KEY_PREFIX = 'custom_field.';

const CustomFieldFilterRenderer: React.FC<CustomRendererProps<string>> = ({field, values, onChange, operator, onOperatorChange, readOnly}) => {
    // Include-archived so an archived composite field's pill can still resolve its parts
    // and show which one the saved segment filters on.
    const {data} = useBrowseMemberCustomFieldsIncludingArchived();
    const definitions = data?.members_custom_fields ?? [];

    const fieldKey = (field.key ?? '').slice(KEY_PREFIX.length);
    const definition = definitions.find(candidate => candidate.key === fieldKey);
    // The shared catalog decides which parts a type has and what they are called; a scalar
    // field has none. Its keys are the ones the predicate carries.
    const parts = definition
        ? (memberCustomFieldParts(definition.type) ?? []).map(({key, label}) => ({value: key, label}))
        : [];
    // Name the field in each segment's aria-label so two custom-field pills on one row
    // are distinguishable to a screen reader rather than all reading "Operator"/"Value".
    const fieldLabel = field.label ?? definition?.name ?? 'Custom field';
    const isComposite = parts.length > 0;

    const [subfield = '', value = ''] = values;
    const isWholeField = subfield === '';

    // A composite's "Any" (whole field) only supports set / not-set — "Any contains X"
    // is meaningless. A specific part, and a scalar field, support the value operators
    // and set / not-set. Only "Any" restricts the set, so only it needs the operator
    // coerced when the part selection changes — done in an effect rather than the change
    // handler, because the framework's filter update reads a stale list within a tick, so
    // a value change and an operator change can't both land in the same one.
    const operators = isComposite && isWholeField
        ? CUSTOM_FIELD_SET_OPERATORS
        : CUSTOM_FIELD_OPERATORS;

    useEffect(() => {
        // A read-only pill never rewrites its own operator; it just displays what's set.
        if (readOnly || !onOperatorChange || operators.includes(operator)) {
            return;
        }
        onOperatorChange('is-set');
    }, [readOnly, operator, operators, onOperatorChange]);

    const needsValue = !CUSTOM_FIELD_SET_OPERATORS.includes(operator);
    const partOptions = [{value: '', label: 'Any'}, ...parts];

    return (
        <>
            {isComposite && (
                <FilterSegmentSelect
                    ariaLabel={`${fieldLabel} part`}
                    options={partOptions}
                    readOnly={readOnly}
                    testId="custom-field-filter-subfield"
                    value={subfield}
                    onChange={nextSubfield => onChange([nextSubfield, value])}
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
                    onChange={nextValue => onChange([subfield, nextValue])}
                />
            )}
        </>
    );
};

export default CustomFieldFilterRenderer;
