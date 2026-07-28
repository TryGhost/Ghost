import React from 'react';
import TopLevelGroup from '../../top-level-group';
import useSettingGroup from '../../../hooks/use-setting-group';
import {Field, FieldDescription, FieldError, FieldLabel, Input} from '@tryghost/shade/components';
import {SettingGroupContent, SettingGroupValue, SettingGroupValueContent, SettingGroupValueTitle} from '@tryghost/shade/patterns';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {withErrorBoundary} from '../../error-boundary';

const TitleAndDescription: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {
        errors,
        localSettings,
        isEditing,
        saveState,
        focusRef,
        clearError,
        handleSave,
        handleCancel,
        updateSetting,
        handleEditingChange
    } = useSettingGroup({
        onValidate: () => {
            if (!title) {
                return {
                    title: 'Please enter a site title.'
                };
            }

            if (title.length < 4) {
                return {
                    title: 'Please use a site title longer than 3 characters.'
                };
            }

            if (title.length > 63) {
                return {
                    title: 'Please use a site title shorter than 63 characters.'
                };
            }

            return {};
        }
    });

    const [title, description] = getSettingValues(localSettings, ['title', 'description']) as string[];

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateSetting('title', e.target.value);
    };

    const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateSetting('description', e.target.value);
    };

    const values = (
        <SettingGroupContent columns={2}>
            <SettingGroupValue>
                <SettingGroupValueTitle>Site title</SettingGroupValueTitle>
                <SettingGroupValueContent className='mt-1'>{title}</SettingGroupValueContent>
            </SettingGroupValue>
            <SettingGroupValue>
                <SettingGroupValueTitle>Site description</SettingGroupValueTitle>
                <SettingGroupValueContent className='mt-1'>{description}</SettingGroupValueContent>
            </SettingGroupValue>
        </SettingGroupContent>
    );

    const inputFields = (
        <SettingGroupContent className='[&_:where(input)]:h-[var(--control-height)] [&_:where(input)]:border-transparent [&_:where(input)]:bg-muted'>
            <Field data-invalid={Boolean(errors.title) || undefined}>
                <FieldLabel htmlFor='site-title'>Site title</FieldLabel>
                <Input
                    ref={focusRef}
                    aria-invalid={Boolean(errors.title) || undefined}
                    id='site-title'
                    maxLength={63}
                    placeholder='Site title'
                    value={title}
                    onChange={handleTitleChange}
                    onKeyDown={() => clearError('title')}
                />
                {errors.title ? <FieldError>{errors.title}</FieldError> : <FieldDescription>The name of your site</FieldDescription>}
            </Field>
            <Field>
                <FieldLabel htmlFor='site-description'>Site description</FieldLabel>
                <Input
                    id='site-description'
                    maxLength={200}
                    placeholder='Site description'
                    value={description}
                    onChange={handleDescriptionChange}
                />
                <FieldDescription>A short description, used in your theme, meta data and search results</FieldDescription>
            </Field>
        </SettingGroupContent>
    );

    return (
        <TopLevelGroup
            description='The details used to identify your publication around the web'
            isEditing={isEditing}
            keywords={keywords}
            navid='general'
            saveState={saveState}
            testId='title-and-description'
            title='Title & description'
            onCancel={handleCancel}
            onEditingChange={handleEditingChange}
            onSave={handleSave}
        >
            {isEditing ? inputFields : values}
        </TopLevelGroup>
    );
};

export default withErrorBoundary(TitleAndDescription, 'Title & description');
