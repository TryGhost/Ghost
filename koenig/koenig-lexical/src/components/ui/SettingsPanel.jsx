import React from 'react';
import {Toggle} from './Toggle';
import {Input} from './Input';

export function SettingsPanel() {
    return (
        <div className="not-kg-prose z-[9999999] m-0 w-[320px] flex-col overflow-y-auto rounded-lg bg-white bg-clip-padding font-sans shadow">
            <ToggleSetting label='Loop' description='Autoplay your video on a loop without sound.' />
            <InputSetting label='Button title' value='' placeholder='Add button text' />
        </div>
    );
}

export function ToggleSetting({label, description}) {
    return (
        <div className="flex w-full items-center justify-between border-b border-b-grey-200 p-6 text-[1.3rem] last-of-type:border-b-0">
            <div>
                <div className="font-bold text-grey-900">{label}</div>
                {description &&
                    <p className="text-[1.25rem] font-normal leading-snug text-grey-700">{description}</p>
                }
            </div>
            <div className="shrink-0 pl-2">
                <Toggle />
            </div>
        </div>
    );
}

export function InputSetting({label, description, value, placeholder}) {
    return (
        <div className="flex w-full flex-col justify-between gap-2 border-b border-b-grey-200 p-6 text-[1.3rem] last-of-type:border-b-0">
            <div className="font-bold text-grey-900">{label}</div>
            <Input value={value} placeholder={placeholder} />
            {description &&
                    <p className="text-[1.25rem] font-normal leading-snug text-grey-700">{description}</p>
            }
        </div>
    );
}