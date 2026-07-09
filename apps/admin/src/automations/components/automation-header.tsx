import AutomationStatusBadge from './automation-status-badge';
import React from 'react';
import {Button, type ButtonProps, Skeleton} from '@tryghost/shade/components';
import {Link} from '@tryghost/admin-x-framework';
import {LucideIcon} from '@tryghost/shade/utils';
import type {AutomationDetail} from '@tryghost/admin-x-framework/api/automations';

export type AutomationRequestState = 'idle' | 'loading' | 'error';

interface AutomationHeaderProps {
    automation: AutomationDetail | undefined;
    isLoadingAutomation: boolean;
    isSaveButtonEnabled: boolean;
    isPublishButtonEnabled: boolean;
    saveButtonVariant: ButtonProps['variant'];
    publishButtonVariant: ButtonProps['variant'];
    isTurnOffButtonEnabled: boolean;
    saveButtonChildren: React.ReactNode;
    publishButtonChildren: React.ReactNode;
    onSave: () => void;
    onPublish: () => void;
    onTurnOff: () => void;
}

const AutomationHeader: React.FC<AutomationHeaderProps> = ({
    automation,
    isLoadingAutomation,
    isSaveButtonEnabled,
    isPublishButtonEnabled,
    saveButtonVariant,
    publishButtonVariant,
    isTurnOffButtonEnabled,
    saveButtonChildren,
    publishButtonChildren,
    onSave,
    onPublish,
    onTurnOff
}) => {
    const name = automation?.name;
    const status = automation?.status;

    return (
        <header className='relative z-10 flex h-14 shrink-0 items-center justify-between bg-surface-elevated px-4 shadow-sm dark:border-b dark:border-gray-950'>
            <div className='flex min-w-0 items-center gap-3'>
                <Button variant='ghost' asChild>
                    <Link aria-label='Back to automations' to='/automations'>
                        <LucideIcon.ArrowLeft strokeWidth={2} />
                    </Link>
                </Button>
                {isLoadingAutomation ? (
                    <Skeleton className='h-5 w-40' />
                ) : (
                    <>
                        <span className='truncate text-lg font-semibold'>{name}</span>
                        {status && <AutomationStatusBadge status={status} />}
                    </>
                )}
            </div>
            <div className='flex shrink-0 items-center gap-3'>
                {status === 'active' && (
                    <Button
                        disabled={!isTurnOffButtonEnabled}
                        variant='outline'
                        onClick={onTurnOff}
                    >
                        <LucideIcon.Power />
                        Turn off
                    </Button>
                )}
                {status === 'inactive' && (
                    <Button
                        disabled={!isSaveButtonEnabled}
                        variant={saveButtonVariant}
                        onClick={onSave}
                    >
                        {saveButtonChildren}
                    </Button>
                )}
                <Button
                    disabled={!isPublishButtonEnabled}
                    variant={publishButtonVariant}
                    onClick={onPublish}
                >
                    {publishButtonChildren}
                </Button>
            </div>
        </header>
    );
};

export default AutomationHeader;
