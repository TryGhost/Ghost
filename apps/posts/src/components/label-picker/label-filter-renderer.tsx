import LabelPicker from './label-picker';
import React from 'react';
import {CustomRendererProps} from '@tryghost/shade';
import {useLabelPicker} from '@src/hooks/use-label-picker';

const LabelFilterRenderer: React.FC<CustomRendererProps<string>> = ({values, onChange}) => {
    const picker = useLabelPicker({
        selectedSlugs: values,
        onSelectionChange: onChange
    });

    return (
        <LabelPicker
            isDuplicateName={picker.isDuplicateName}
            isFetching={picker.isFetching}
            labels={picker.labels}
            searchValue={picker.searchValue}
            selectedLabels={picker.selectedLabels}
            inline
            onDelete={picker.deleteLabel}
            onEdit={picker.editLabel}
            onSearchChange={picker.onSearchChange}
            onToggle={picker.toggleLabel}
        />
    );
};

export default LabelFilterRenderer;
