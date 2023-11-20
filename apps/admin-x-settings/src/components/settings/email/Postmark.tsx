import React from 'react';
import TopLevelGroup from '../../TopLevelGroup';
import useSettingGroup from '../../../hooks/useSettingGroup';
import {IconLabel, Link, SettingGroupContent, TextField, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';

const Postmark: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {
        localSettings,
        isEditing,
        saveState,
        handleSave,
        handleCancel,
        updateSetting,
        handleEditingChange
    } = useSettingGroup();

    const [postmarkApiToken] = getSettingValues(localSettings, [
        'postmark_api_token'
    ]) as string[];

    const data = postmarkApiToken ? [
        {
            key: 'status',
            value: (
                <IconLabel icon='check-circle' iconColorClass='text-green'>
                    Postmark is set up
                </IconLabel>
            )
        }
    ] : [
        {
            heading: 'Status',
            key: 'status',
            value: 'Postmark is not set up'
        }
    ];

    const values = (
        <SettingGroupContent
            columns={1}
            values={data}
        />
    );

    const apiKeysHint = (
        <>Learn where to find your Postmark API Token <Link href="https://postmarkapp.com/developer/api/overview#authentication" rel="noopener noreferrer" target="_blank">here</Link></>
    );
    const inputs = (
        <SettingGroupContent>
            <div className='grid grid-cols-[120px_auto] gap-x-3 gap-y-6'>
                <div className='col-span-2'>
                    <TextField
                        hint={apiKeysHint}
                        title='Postmark API token'
                        type='password'
                        value={postmarkApiToken}
                        onChange={(e) => {
                            updateSetting('postmark_api_token', e.target.value);
                        }}
                    />
                </div>
            </div>
        </SettingGroupContent>
    );

    const groupDescription = (
        <>The Postmark API is used for bulk email newsletter delivery. <Link href='https://ghost.org/docs/faq/mailgun-newsletters/' target='_blank'>Why is this required?</Link></>
    );

    return (
        <TopLevelGroup
            description={groupDescription}
            isEditing={isEditing}
            keywords={keywords}
            navid='postmark'
            saveState={saveState}
            testId='postmark'
            title='Postmark'
            onCancel={handleCancel}
            onEditingChange={handleEditingChange}
            onSave={async () => {
                // this is a special case where we need to set the region to the default if it's not set,
                // since when the Mailgun Region is not changed, the value doesn't get set in the updateSetting
                // resulting in the mailgun base url remaining null
                // this should not fire if the user has changed the region or if the region is already set

                handleSave();
            }}
        >
            {isEditing ? inputs : values}
        </TopLevelGroup>
    );
};

export default withErrorBoundary(Postmark, 'Postmark');
