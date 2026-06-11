import * as customFields from '../../../../../../../poc/custom-fields/repo';
import React, {useCallback, useEffect, useState} from 'react';
import {getSettingValues} from '@tryghost/admin-x-framework/api/settings';
import {useGlobalData} from '../../../providers/global-data-provider';

// POC: a live (non-interactive) preview of the member-facing Landing card,
// rendering the fields placed on one landing form. Subscribes so it updates as
// the picker is edited. Proportions mirror the signup form.

const PreviewField: React.FC<{field: customFields.FieldDefinition}> = ({field}) => {
    if (field.type === 'boolean') {
        return (
            <div className='flex items-center gap-2'>
                <span className='h-4 w-4 rounded border border-grey-300 dark:border-grey-700'></span>
                <span className='text-md'>{field.label}</span>
            </div>
        );
    }

    if (field.type === 'select' && field.multiple) {
        return (
            <div>
                <span className='mb-1.5 block text-sm font-semibold'>{field.label}</span>
                <div className='flex flex-col gap-2'>
                    {(field.options || []).slice(0, 3).map(option => (
                        <div key={option} className='flex items-center gap-2'>
                            <span className='h-4 w-4 rounded border border-grey-300 dark:border-grey-700'></span>
                            <span className='text-md'>{option}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (field.type === 'select') {
        return (
            <div>
                <span className='mb-1.5 block text-sm font-semibold'>{field.label}</span>
                <div className='flex h-11 items-center justify-between rounded-lg border border-grey-300 px-3 text-grey-500 dark:border-grey-800'>
                    <span className='text-md'>Select an option</span>
                    <svg fill='none' height='8' viewBox='0 0 12 8' width='12'>
                        <path d='M1 1l5 5 5-5' stroke='currentColor' strokeLinecap='round' strokeLinejoin='round' strokeWidth='1.5' />
                    </svg>
                </div>
            </div>
        );
    }

    return (
        <div>
            <span className='mb-1.5 block text-sm font-semibold'>{field.label}</span>
            <div className='h-11 rounded-lg border border-grey-300 dark:border-grey-800'></div>
        </div>
    );
};

const LandingPreview: React.FC<{formId: string}> = ({formId}) => {
    const {settings} = useGlobalData();
    const [accentColor, icon] = getSettingValues<string>(settings, ['accent_color', 'icon']);
    const accent = accentColor || '#F6414E';

    const [fields, setFields] = useState<customFields.FieldDefinition[]>([]);

    const refresh = useCallback(async () => {
        const [form, defs] = await Promise.all([customFields.getLandingFormFields(formId), customFields.listFields()]);
        setFields(
            form
                .map(p => defs.find(d => d.id === p.fieldId && !d.archived))
                .filter((d): d is customFields.FieldDefinition => Boolean(d))
        );
    }, [formId]);

    useEffect(() => {
        refresh();
        return customFields.subscribe(refresh);
    }, [refresh]);

    return (
        <div className='flex h-full w-full items-center justify-center p-8'>
            <div className='w-full max-w-[400px] rounded-xl bg-white p-10 shadow-xl dark:bg-black'>
                {/* Like the signup portal: show the site icon only if set, nothing otherwise. */}
                {icon && <img alt='' className='mx-auto mb-4 block size-[60px] rounded' src={icon} />}
                <h4 className='mb-8 text-center text-2xl font-bold'>Tell us a bit more about you</h4>
                {fields.length ? (
                    <div className='flex flex-col gap-5'>
                        {fields.map(field => <PreviewField key={field.id} field={field} />)}
                        <button className='mt-2 flex h-11 items-center justify-center rounded-md' style={{backgroundColor: accent}} type='button'>
                            <span className='text-[15px] font-medium text-white'>Save</span>
                        </button>
                    </div>
                ) : (
                    <p className='text-center text-grey-600'>Add fields to see them here.</p>
                )}
            </div>
        </div>
    );
};

export default LandingPreview;
