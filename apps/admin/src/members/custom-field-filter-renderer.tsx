import React, {useEffect} from 'react';
import {CUSTOM_FIELD_OPERATOR_LABELS} from './member-fields';
import {FilterSegmentInput, FilterSegmentSelect} from '@tryghost/shade/patterns';
import {useBrowseMemberCustomFields, userTypeForFieldType} from '@tryghost/admin-x-framework/api/member-custom-fields';
import type {CustomRendererProps} from '@tryghost/shade/patterns';

// The dropdown entry has already chosen the field (its key is in `field.key` as
// `custom_field.<key>`), so this renders only what's left in the pill: for a
// composite field a part selector (with "Any" for the whole field), then the
// operator, then the value. The predicate carries [subfield, value]; subfield is ''
// for a scalar field or the "Any" whole-field set/unset case. The operator lives here
// because its valid set depends on the part chosen here.

const KEY_PREFIX = 'custom_field.';
const VALUE_OPERATORS = ['is', 'is-not', 'contains', 'does-not-contain', 'starts-with', 'ends-with'];
const SET_OPERATORS = ['is-set', 'is-not-set'];

// A composite field's parts, sourced from the type's presentation so labels and keys
// stay in one place; empty for a scalar field.
function partsOf(type?: string): Array<{value: string; label: string}> {
    if (!type) {
        return [];
    }
    const subFields = userTypeForFieldType(type as Parameters<typeof userTypeForFieldType>[0]).subFields ?? {};
    return Object.entries(subFields).map(([value, label]) => ({value, label}));
}

function toOptions(operators: string[]) {
    return operators.map(op => ({value: op, label: CUSTOM_FIELD_OPERATOR_LABELS[op] ?? op}));
}

const CustomFieldFilterRenderer: React.FC<CustomRendererProps<string>> = ({field, values, onChange, operator, onOperatorChange}) => {
    const {data} = useBrowseMemberCustomFields();
    const definitions = data?.members_custom_fields ?? [];

    const fieldKey = (field.key ?? '').slice(KEY_PREFIX.length);
    const definition = definitions.find(candidate => candidate.key === fieldKey);
    const parts = partsOf(definition?.type);
    const isComposite = parts.length > 0;

    const [subfield = '', value = ''] = values;
    const isWholeField = subfield === '';

    // A composite's "Any" (whole field) only supports set / not-set; a specific part
    // only the value operators; a scalar field offers both. Kept valid as the part
    // selection changes by an effect rather than the change handler, because the
    // framework's filter update reads a stale list within a tick — a value change and
    // an operator change can't both land in the same one.
    const operators = isComposite
        ? (isWholeField ? SET_OPERATORS : VALUE_OPERATORS)
        : [...VALUE_OPERATORS, ...SET_OPERATORS];

    useEffect(() => {
        if (!onOperatorChange || !isComposite || operators.includes(operator)) {
            return;
        }
        onOperatorChange(isWholeField ? 'is-set' : 'is');
    }, [isComposite, isWholeField, operator, operators, onOperatorChange]);

    const needsValue = !SET_OPERATORS.includes(operator);
    const partOptions = [{value: '', label: 'Any'}, ...parts];

    return (
        <>
            {isComposite && (
                <FilterSegmentSelect
                    ariaLabel="Field part"
                    options={partOptions}
                    testId="custom-field-filter-subfield"
                    value={subfield}
                    onChange={nextSubfield => onChange([nextSubfield, value])}
                />
            )}

            {onOperatorChange && (
                <FilterSegmentSelect
                    ariaLabel="Operator"
                    options={toOptions(operators)}
                    testId="custom-field-filter-operator"
                    value={operator}
                    onChange={onOperatorChange}
                />
            )}

            {needsValue && (
                <FilterSegmentInput
                    ariaLabel="Value"
                    placeholder="Enter value..."
                    testId="custom-field-filter-value"
                    value={value}
                    onChange={nextValue => onChange([subfield, nextValue])}
                />
            )}
        </>
    );
};

export default CustomFieldFilterRenderer;
