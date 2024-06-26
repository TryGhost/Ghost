import React from 'react';
import {Toggle} from './Toggle';

export function VisibilityDropdown({isChecked, onChange}) {
    return (
        <div className="flex w-[254px] flex-col gap-1 rounded-lg bg-white p-6 shadow-md">
            <div className="text-sm font-bold">Visibility</div>
            <ToggleSetting 
                dataTestId='visibility-toggle'
                isChecked={isChecked}
                label="Show in email only"
                onChange={onChange} />
            <hr className="mt-1 border-grey-250 pb-1 dark:border-white/5" />
            <ToggleSetting 
                dataTestId='visibility-toggle'
                isChecked={isChecked}
                label="Free members"
                onChange={onChange} />
            <ToggleSetting 
                dataTestId='visibility-toggle'
                isChecked={isChecked}
                label="Paid members"
                onChange={onChange} />
        </div>
    );
}

function ToggleSetting({label, isChecked, onChange, dataTestId}) {
    return (
        <div className="flex min-h-[3rem] w-full items-center justify-between text-sm">
            <label className="text-grey-900 dark:text-grey-300">{label}</label>
            <div className="flex shrink-0 pl-2">
                <Toggle dataTestId={dataTestId} isChecked={isChecked} onChange={onChange} />
            </div>
        </div>
    );
}