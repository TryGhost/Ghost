import Button from '../../../admin-x-ds/global/Button';
import Heading from '../../../admin-x-ds/global/Heading';
import React from 'react';
import Select from '../../../admin-x-ds/global/form/Select';
import SettingGroup from '../../../admin-x-ds/settings/SettingGroup';
import SettingGroupContent from '../../../admin-x-ds/settings/SettingGroupContent';
import TextField from '../../../admin-x-ds/global/form/TextField';
import useSettingGroup from '../../../hooks/useSettingGroup';

const TipsOrDonations: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {
        isEditing,
        saveState,
        handleSave,
        handleCancel,
        focusRef,
        handleEditingChange
    } = useSettingGroup();

    const values = (
        <SettingGroupContent
            columns={2}
            values={[
                {
                    heading: 'Suggested amount',
                    key: 'suggested-amount',
                    value: '$12'
                },
                {
                    heading: '',
                    key: 'sharable-link',
                    value: (
                        <div className='w-100'>
                            <div className='flex items-center gap-2'>
                                <Heading level={6}>Sharable link &mdash;</Heading>
                                <a className='text-2xs font-semibold uppercase tracking-wider text-green' href="https://ghost.org" rel="noopener noreferrer" target="_blank">Preview</a>
                            </div>
                            <div className='w-100 group relative -m-1 mt-0 overflow-hidden rounded p-1 hover:bg-grey-50'>
                            https://example.com/tip
                                <div className='invisible absolute right-0 top-[50%] flex translate-y-[-50%] gap-1 bg-white pl-1 group-hover:visible'>
                                    <Button color='outline' label='Copy' size='sm' />
                                </div>
                            </div>
                        </div>
                    )
                }
            ]}
        />
    );

    const inputFields = (
        <SettingGroupContent className='max-w-[180px]'>
            <TextField
                inputRef={focusRef}
                placeholder="0"
                rightPlaceholder={(
                    <Select
                        border={false}
                        options={[
                            {label: 'USD', value: 'usd'},
                            {label: 'EUR', value: 'eur'}
                        ]}
                        selectClassName='w-auto'
                        onSelect={() => {}}
                    />
                )}
                title='Suggested amount'
                value='12'
                onChange={() => {}}
            />
        </SettingGroupContent>
    );

    return (
        <SettingGroup
            description="Give your audience a one-time way to support your work, no membership required."
            isEditing={isEditing}
            keywords={keywords}
            navid='tips-or-donations'
            saveState={saveState}
            testId='tips-or-donations'
            title="Tips or donations"
            onCancel={handleCancel}
            onEditingChange={handleEditingChange}
            onSave={handleSave}
        >
            {isEditing ? inputFields : values}
        </SettingGroup>
    );
};

export default TipsOrDonations;