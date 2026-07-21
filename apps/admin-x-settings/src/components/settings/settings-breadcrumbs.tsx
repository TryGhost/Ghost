import React from 'react';
import {Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator, Button} from '@tryghost/shade/components';
import {Inline} from '@tryghost/shade/primitives';
import {LucideIcon} from '@tryghost/shade/utils';

interface SettingsBreadcrumbsProps {
    current: React.ReactNode;
    label: string;
    onBack: () => void;
    className?: string;
}

const SettingsBreadcrumbs: React.FC<SettingsBreadcrumbsProps> = ({current, label, onBack, className}) => {
    return (
        <Inline className={className} gap='sm'>
            <Button aria-label='Back' size='icon' type='button' variant='ghost' onClick={onBack}>
                <LucideIcon.ArrowLeft />
            </Button>
            <Breadcrumb className='max-md:hidden'>
                <BreadcrumbList className='whitespace-nowrap'>
                    <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                            <button
                                className='cursor-pointer rounded-sm focus-visible:ring-1 focus-visible:ring-focus-ring focus-visible:outline-hidden'
                                type='button'
                                onClick={onBack}
                            >
                                {label}
                            </button>
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>{current}</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
        </Inline>
    );
};

export default SettingsBreadcrumbs;
