import React from 'react';
import {CUSTOM_FIELD_OPERATOR_LABELS, operatorsForCustomFieldType} from './member-fields';
import {FilterSegmentInput, FilterSegmentSelect} from '@tryghost/shade/patterns';
import {useBrowseMemberCustomFields, userTypeForFieldType} from '@tryghost/admin-x-framework/api/member-custom-fields';
import type {CustomRendererProps} from '@tryghost/shade/patterns';

// One "Custom field" filter stands in for every defined field, so its value area is a
// cascade of native filter segments: which field, then (for a composite like an
// address) which part, then the operator, then the value. The operator lives here
// because its valid set depends on the field's type, which is chosen here. Segments
// are composed from the framework's own primitives so they read as one pill with the
// other filters. The predicate carries the value selections as [fieldKey, subfield,
// value] (the shape member-fields.ts serialises to compound NQL); the operator stays
// the predicate's own operator, driven through onOperatorChange.

// A composite field's parts, sourced from the type's presentation so labels and keys
// stay in one place; empty for a scalar field.
function partsOf(type?: string): Array<{value: string; label: string}> {
    if (!type) {
        return [];
    }
    const subFields = userTypeForFieldType(type as Parameters<typeof userTypeForFieldType>[0]).subFields ?? {};
    return Object.entries(subFields).map(([value, label]) => ({value, label}));
}

const VALUELESS_OPERATORS = new Set(['is-set', 'is-not-set']);

const CustomFieldFilterRenderer: React.FC<CustomRendererProps<string>> = ({values, onChange, operator, onOperatorChange}) => {
    const {data} = useBrowseMemberCustomFields();
    const fields = data?.members_custom_fields ?? [];

    const [fieldKey = '', subfield = '', value = ''] = values;
    const selectedField = fields.find(field => field.key === fieldKey);
    const parts = partsOf(selectedField?.type);
    const isComposite = parts.length > 0;
    const hasField = !!selectedField;
    const needsValue = !VALUELESS_OPERATORS.has(operator);

    const fieldOptions = fields.map(field => ({value: field.key, label: field.name}));
    const operatorOptions = operatorsForCustomFieldType(selectedField?.type).map(op => ({
        value: op,
        label: CUSTOM_FIELD_OPERATOR_LABELS[op] ?? op
    }));

    const handleFieldChange = (nextKey: string) => {
        const nextField = fields.find(field => field.key === nextKey);
        // Default a composite to its first part so the value targets a real leaf
        // (path) rather than the scalar root the field doesn't fill.
        const nextParts = partsOf(nextField?.type);
        const nextSubfield = nextParts[0]?.value ?? '';
        onChange([nextKey, nextSubfield, '']);
        // Every field type shares one operator set today, so the current operator
        // stays valid across a field change and needs no reset. When a type with a
        // different set arrives, resetting it here can't piggyback on this call —
        // the framework's updateFilter maps a stale `filters` closure, so a second
        // update in the same tick would clobber this one. It'll need a combined
        // value+operator update path at that point.
    };

    return (
        <>
            <FilterSegmentSelect
                ariaLabel="Custom field"
                options={fieldOptions}
                placeholder="Select field"
                testId="custom-field-filter-field"
                value={fieldKey}
                onChange={handleFieldChange}
            />

            {isComposite && needsValue && (
                <FilterSegmentSelect
                    ariaLabel="Field part"
                    options={parts}
                    placeholder="Select part"
                    testId="custom-field-filter-subfield"
                    value={subfield}
                    onChange={nextSubfield => onChange([fieldKey, nextSubfield, value])}
                />
            )}

            {hasField && onOperatorChange && (
                <FilterSegmentSelect
                    ariaLabel="Operator"
                    options={operatorOptions}
                    testId="custom-field-filter-operator"
                    value={operator}
                    onChange={onOperatorChange}
                />
            )}

            {hasField && needsValue && (
                <FilterSegmentInput
                    ariaLabel="Value"
                    placeholder="Enter value..."
                    testId="custom-field-filter-value"
                    value={value}
                    onChange={nextValue => onChange([fieldKey, subfield, nextValue])}
                />
            )}
        </>
    );
};

export default CustomFieldFilterRenderer;
