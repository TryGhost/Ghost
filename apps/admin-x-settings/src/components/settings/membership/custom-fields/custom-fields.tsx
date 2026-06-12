import * as customFields from '../../../../../../../poc/custom-fields/repo';
import CustomFieldModal from './custom-field-modal';
import NiceModal from '@ebay/nice-modal-react';
import React, {useCallback, useEffect, useState} from 'react';
import TopLevelGroup from '../../../top-level-group';
import {Button, List, ListItem, withErrorBoundary} from '@tryghost/admin-x-design-system';

// POC: data comes from poc/custom-fields/repo (localStorage), not a real API.
const typeLabel = (type: customFields.FieldType) => customFields.TYPES.find(t => t.value === type)?.label || type;

const TypeBadge: React.FC<{type: customFields.FieldType}> = ({type}) => (
    <span className='inline-flex items-center rounded-sm bg-grey-200 px-1.5 py-0.5 text-xs font-medium text-grey-700 dark:bg-grey-900 dark:text-grey-500'>
        {typeLabel(type)}
    </span>
);

const CustomFields: React.FC<{keywords: string[]}> = ({keywords}) => {
    const [fields, setFields] = useState<customFields.FieldDefinition[]>([]);

    const refresh = useCallback(() => {
        customFields.listFields().then(setFields);
    }, []);

    useEffect(() => {
        refresh();
        return customFields.subscribe(refresh);
    }, [refresh]);

    const openModal = (field?: customFields.FieldDefinition) => {
        NiceModal.show(CustomFieldModal, {field, refresh});
    };

    const buttons = (
        <Button color='clear' label='Add custom field' size='sm' onClick={() => openModal()} />
    );

    return (
        <TopLevelGroup
            customButtons={buttons}
            description='Create and manage custom fields to store extra information about your members'
            keywords={keywords}
            navid='custom-fields'
            testId='custom-fields'
            title='Custom fields'
        >
            {fields.length > 0 && (
                <List>
                    {fields.map(field => (
                        <ListItem
                            key={field.id}
                            action={<Button color='green' label='Edit' link onClick={(e) => {
                                e?.stopPropagation();
                                openModal(field);
                            }} />}
                            testId='custom-field-list-item'
                            title={
                                <span className='inline-flex items-center gap-2'>
                                    <span className='font-medium'>{field.label}</span>
                                    <TypeBadge type={field.type} />
                                </span>
                            }
                            onClick={() => openModal(field)}
                        />
                    ))}
                </List>
            )}
        </TopLevelGroup>
    );
};

export default withErrorBoundary(CustomFields, 'Custom fields');
