import React from 'react';
import {LucideIcon} from '@tryghost/shade/utils';

export type StepPickerType = 'wait' | 'send_email';

interface StepPickerProps {
    onPick: (type: StepPickerType) => void;
}

interface PickerOptionProps {
    icon: React.ElementType;
    label: string;
    description: string;
    onClick: () => void;
}

const PickerOption: React.FC<PickerOptionProps> = ({icon: Icon, label, description, onClick}) => (
    <button
        className='flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-grey-100 focus-visible:bg-grey-100 focus-visible:outline-none dark:hover:bg-grey-925 dark:focus-visible:bg-grey-925'
        type='button'
        onClick={onClick}
    >
        <div className='flex size-8 shrink-0 items-center justify-center rounded-md bg-grey-100 text-grey-700 dark:bg-grey-900 dark:text-grey-300'>
            <Icon className='size-4' />
        </div>
        <div className='flex min-w-0 flex-col'>
            <span className='font-medium'>{label}</span>
            <span className='text-xs text-grey-600 dark:text-grey-500'>{description}</span>
        </div>
    </button>
);

const StepPicker: React.FC<StepPickerProps> = ({onPick}) => (
    <div className='flex w-64 flex-col gap-1 p-1' data-testid='step-picker'>
        <PickerOption
            description='Send an email'
            icon={LucideIcon.Mail}
            label='Email'
            onClick={() => onPick('send_email')}
        />
        <PickerOption
            description='Wait a set amount of time'
            icon={LucideIcon.Clock}
            label='Wait'
            onClick={() => onPick('wait')}
        />
    </div>
);

export default StepPicker;
