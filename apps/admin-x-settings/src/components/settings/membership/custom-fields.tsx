import CustomFieldModal from './custom-fields/custom-field-modal';
import NiceModal from '@ebay/nice-modal-react';
import React from 'react';
import TopLevelGroup from '../../top-level-group';
import {Button, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {useBrowseMemberCustomFields, userTypeForField} from '@tryghost/admin-x-framework/api/member-custom-fields';
import type {MemberCustomField} from '@tryghost/admin-x-framework/api/member-custom-fields';

const CustomFields: React.FC<{keywords: string[]}> = ({keywords}) => {
    const {data} = useBrowseMemberCustomFields();
    const fields = data?.member_custom_fields || [];

    const openModal = (field?: MemberCustomField) => NiceModal.show(CustomFieldModal, {field});

    return (
        <TopLevelGroup
            customButtons={<Button color='clear' label='Add custom field' size='sm' onClick={() => openModal()} />}
            description='Create and manage custom fields to store extra information about your members'
            keywords={keywords}
            navid='custom-fields'
            testId='custom-fields'
            title='Custom fields'
        >
            {fields.length > 0 && (
                <div>
                    {fields.map((field, index) => {
                        const userType = userTypeForField(field);
                        return (
                            <div
                                key={field.id}
                                className={`flex w-full items-center gap-3 py-3 dark:border-grey-900 ${index === fields.length - 1 ? '' : 'border-b border-grey-100'}`}
                            >
                                <button
                                    className='flex min-w-0 flex-1 items-center gap-3 text-left'
                                    data-testid='custom-field-list-item'
                                    type='button'
                                    onClick={() => openModal(field)}
                                >
                                    <div className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-grey-100 text-[1.5rem] font-semibold dark:bg-grey-900'>
                                        {userType.iconText}
                                    </div>
                                    <div className='min-w-0 grow'>
                                        <div className='truncate leading-tight font-semibold'>{field.name}</div>
                                        <div className='mt-0.5 text-sm text-grey-700 dark:text-grey-600'>{userType.label}</div>
                                    </div>
                                </button>
                                <Button color='green' label='Edit' link onClick={() => openModal(field)} />
                            </div>
                        );
                    })}
                </div>
            )}
        </TopLevelGroup>
    );
};

export default withErrorBoundary(CustomFields, 'Custom fields');
