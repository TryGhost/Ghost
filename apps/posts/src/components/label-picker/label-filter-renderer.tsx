import LabelPicker from './label-picker';
import React from 'react';
import {CustomRendererProps, ValueSource} from '@tryghost/shade';
import {useLabelPicker} from '@src/hooks/use-label-picker';

const LabelFilterRenderer: React.FC<CustomRendererProps<string>> = ({field, values, onChange}) => {
    const picker = useLabelPicker({
        selectedSlugs: values,
        onSelectionChange: onChange,
        valueSource: field.valueSource as ValueSource<string> | undefined
    });

    return (
        <LabelPicker
            isDuplicateName={picker.isDuplicateName}
            isLoading={picker.isLoading}
            labels={picker.labels}
            resolvedSelectedLabels={picker.resolvedSelectedLabels}
            searchValue={picker.searchValue}
            selectedSlugs={picker.selectedSlugs}
            inline
            onCreate={picker.createLabel}
            onDelete={picker.deleteLabel}
            onEdit={picker.editLabel}
            onSearchChange={picker.onSearchChange}
            onToggle={picker.toggleLabel}
        />
    );
};

export default LabelFilterRenderer;
