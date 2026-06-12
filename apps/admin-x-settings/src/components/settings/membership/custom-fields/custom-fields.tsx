import * as customFields from '../../../../../../../poc/custom-fields/repo';
import CustomFieldModal from './custom-field-modal';
import NiceModal from '@ebay/nice-modal-react';
import React, {useCallback, useEffect, useState} from 'react';
import TopLevelGroup from '../../../top-level-group';
import {Button, DragIndicator, type SortableItemContainerProps, SortableList, withErrorBoundary} from '@tryghost/admin-x-design-system';

// POC: data comes from poc/custom-fields/repo (localStorage), not a real API.
const typeLabel = (type: customFields.FieldType) => customFields.TYPES.find(t => t.value === type)?.label || type;

const TypeBadge: React.FC<{type: customFields.FieldType}> = ({type}) => (
    <span className='inline-flex shrink-0 items-center rounded-sm bg-grey-200 px-1.5 py-0.5 text-xs font-medium whitespace-nowrap text-grey-700 dark:bg-grey-900 dark:text-grey-500'>
        {typeLabel(type)}
    </span>
);

// Drag wrapper: drag handle + content, separator between rows, no border on the
// last row. `isLast` is driven off the data because SortableList's wrapping makes
// CSS `last:`/`last-of-type` unreliable (same fix as the landing forms list).
const FieldRowContainer: React.FC<Partial<SortableItemContainerProps> & {isLast?: boolean}> = ({setRef, isDragging, style, children, isLast, ...props}) => (
    <div
        ref={setRef}
        className={`flex w-full items-center gap-3 py-2.5 dark:border-grey-900 ${isLast ? '' : 'border-b border-grey-100'} ${isDragging ? 'opacity-75' : ''}`}
        style={style}
    >
        {(props.dragHandleAttributes || isDragging) && <DragIndicator isDragging={isDragging || false} {...props} />}
        {children}
    </div>
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

    const onMove = (id: string, overId: string) => {
        const from = fields.findIndex(f => f.id === id);
        const to = fields.findIndex(f => f.id === overId);
        if (from === -1 || to === -1) {
            return;
        }
        const next = [...fields];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        setFields(next);
        customFields.reorderFields(next.map(f => f.id));
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
                <SortableList
                    container={props => <FieldRowContainer {...props} isLast={props.id === fields[fields.length - 1]?.id} />}
                    items={fields}
                    renderItem={field => (
                        <>
                            <button
                                className='flex min-w-0 flex-1 items-center gap-2 text-left'
                                data-testid='custom-field-list-item'
                                type='button'
                                onClick={() => openModal(field)}
                            >
                                <span className='min-w-0 truncate font-medium'>{field.label}</span>
                                <TypeBadge type={field.type} />
                            </button>
                            <Button color='green' label='Edit' link onClick={(e) => {
                                e?.stopPropagation();
                                openModal(field);
                            }} />
                        </>
                    )}
                    onMove={onMove}
                />
            )}
        </TopLevelGroup>
    );
};

export default withErrorBoundary(CustomFields, 'Custom fields');
