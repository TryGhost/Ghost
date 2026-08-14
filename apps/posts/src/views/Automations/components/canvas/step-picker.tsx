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
        className='flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-grey-50 focus-visible:bg-grey-50 focus-visible:outline-none dark:hover:bg-grey-900 dark:focus-visible:bg-grey-900'
        type='button'
        onClick={onClick}
    >
        <div className='flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-text-secondary'>
            <Icon className='size-4' />
        </div>
        <div className='flex min-w-0 flex-col'>
            <span className='font-medium'>{label}</span>
            <span className='text-xs text-text-secondary'>{description}</span>
        </div>
    </button>
);

const StepPicker: React.FC<StepPickerProps> = ({onPick}) => (
    <div className='flex w-72 flex-col gap-1 p-1' data-testid='step-picker'>
        <PickerOption
            description='Send an email'
            icon={LucideIcon.Mail}
            label='Email'
            onClick={() => onPick('send_email')}
        />
        <PickerOption
            description='Add a delay before the next step'
            icon={LucideIcon.Clock}
            label='Wait'
            onClick={() => onPick('wait')}
        />
    </div>
);

export default StepPicker;
