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
            hasMore={picker.hasMore}
            isDuplicateName={picker.isDuplicateName}
            isLoadingMore={picker.isLoadingMore}
            labels={picker.labels}
            selectedSlugs={picker.selectedSlugs}
            inline
            onDelete={picker.deleteLabel}
            onEdit={picker.editLabel}
            onLoadMore={picker.onLoadMore}
            onSearchChange={picker.onSearchChange}
            onToggle={picker.toggleLabel}
        />
    );
};

export default LabelFilterRenderer;
