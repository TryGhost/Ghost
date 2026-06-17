import '@xyflow/react/dist/style.css';
import React, {useEffect, useRef, useState} from 'react';
import {AutomationDetail, AutomationSendEmailAction, AutomationWaitAction} from '@tryghost/admin-x-framework/api/automations';
import {Button, ChartConfig, DataList, DataListBar, DataListBody, DataListItemContent, DataListItemValue, DataListItemValueAbs, DataListItemValuePerc, DataListRow, Field, FieldError, FieldLabel, Input, InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText, Separator, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@tryghost/shade/components';
import {LucideIcon, cn, formatNumber, formatPercentage} from '@tryghost/shade/utils';
import {MemberTier, StepSidebarDetail} from '../types';
import {NewsletterRadialChart, NewsletterRadialChartData} from '@src/views/PostAnalytics/Newsletter/components/newsletter-radial-chart';
import {TRIGGER_CANVAS_ID} from './nodes';
import {formatWait} from './format-wait';

const MAX_WAIT_DAYS = 30;
const WHOLE_NUMBER_PATTERN = /^\d+$/;

const getValidWaitDays = (value: string): number | null => {
    const days = Number(value);
    if (!WHOLE_NUMBER_PATTERN.test(value) || !Number.isInteger(days) || days < 1 || days > MAX_WAIT_DAYS) {
        return null;
    }
    return days;
};

const SidebarField: React.FC<{label: string; children: React.ReactNode; htmlFor?: string}> = ({children, htmlFor, label}) => (
    <Field>
        <FieldLabel className='text-sm font-medium text-text-secondary' htmlFor={htmlFor}>
            {label}
        </FieldLabel>
        {children}
    </Field>
);

// Public beta limitation: only one trigger type exists, so the read-only Select
// in the sidebar header would just mirror the title above it.
// const ReadOnlySelect: React.FC<{value: string}> = ({value}) => (
//     <Select value={value}>
//         <SelectTrigger disabled>
//             <span>{value}</span>
//         </SelectTrigger>
//     </Select>
// );

const DeleteStepButton: React.FC<{onClick: () => void}> = ({onClick}) => (
    <Button
        className='w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground'
        type='button'
        variant='outline'
        onClick={onClick}
    >
        <LucideIcon.Trash2 className='size-4' />
      Delete step
    </Button>
);

const MEMBER_TIER_LABELS: Record<MemberTier, string> = {
    free: 'Free',
    paid: 'Paid'
};

const TriggerSidebarBody: React.FC<{memberTiers: MemberTier[]}> = ({memberTiers}) => {
    const selectedTiers = memberTiers.map(tier => MEMBER_TIER_LABELS[tier]).join(', ');

    return (
        <div className='flex flex-col gap-5'>
            {/* Public beta limitation: only one trigger type exists, so the read-only Select
                in the sidebar header would just mirror the title above it.
            <SidebarField label='Trigger'>
                <ReadOnlySelect value='New member sign up' />
            </SidebarField> */}
            {selectedTiers && (
                <div className='flex flex-col'>
                    <span className='text-sm font-medium text-text-secondary'>Members</span>
                    <span className='text-base text-foreground'>{selectedTiers}</span>
                </div>
            )}
        </div>
    );
};

const WaitSidebarBody: React.FC<{
  action: AutomationWaitAction;
  onUpdate: (waitHours: number) => void;
  onDelete: () => void;
}> = ({action, onUpdate, onDelete}) => {
    if (action.data.wait_hours % 24 !== 0) {
        throw new Error(`WaitSidebarBody: wait_hours must be a multiple of 24, received ${action.data.wait_hours}`);
    }
    const initialDays = action.data.wait_hours / 24;
    const [daysText, setDaysText] = useState<string>(String(initialDays));
    const [hasBlurredDaysInput, setHasBlurredDaysInput] = useState(false);

    const days = Number(daysText);
    const isValid = getValidWaitDays(daysText) !== null;
    const showValidationError = hasBlurredDaysInput && !isValid;
    const updateWaitDays = (nextDays: number) => {
        const nextHours = nextDays * 24;
        if (nextHours !== action.data.wait_hours) {
            onUpdate(nextHours);
        }
    };

    const stepWaitDays = (direction: -1 | 1) => {
        const currentDays = getValidWaitDays(daysText);
        if (currentDays === null) {
            return;
        }

        const nextDays = Math.min(MAX_WAIT_DAYS, Math.max(1, currentDays + direction));
        setDaysText(String(nextDays));
        updateWaitDays(nextDays);
    };

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const nextDaysText = event.target.value;
        setDaysText(nextDaysText);

        const nextDays = getValidWaitDays(nextDaysText);
        if (nextDays === null) {
            return;
        }
        updateWaitDays(nextDays);
    };

    return (
        <div className='flex flex-1 flex-col gap-5'>
            <SidebarField htmlFor='automation-wait-days' label='Wait for'>
                <InputGroup
                    aria-label='Wait duration in days'
                    className='h-(--control-height)'
                    data-disabled={showValidationError ? 'true' : undefined}
                >
                    <InputGroupInput
                        aria-describedby={showValidationError ? 'automation-wait-days-error' : undefined}
                        aria-invalid={showValidationError}
                        className='w-10 min-w-10 flex-none pr-1 font-mono tabular-nums'
                        id='automation-wait-days'
                        inputMode='numeric'
                        value={daysText}
                        onBlur={() => setHasBlurredDaysInput(true)}
                        onChange={handleChange}
                        onFocus={() => setHasBlurredDaysInput(false)}
                    />
                    <InputGroupText className='mr-auto'>{days === 1 ? 'day' : 'days'}</InputGroupText>
                    <InputGroupAddon align='inline-end' className='gap-0.5 pr-2'>
                        <InputGroupButton
                            aria-label='Decrease wait by one day'
                            disabled={!isValid || days <= 1}
                            size='icon-xs'
                            title='Decrease wait by one day'
                            onClick={() => stepWaitDays(-1)}
                        >
                            <LucideIcon.Minus className='size-4' />
                        </InputGroupButton>
                        <InputGroupButton
                            aria-label='Increase wait by one day'
                            disabled={!isValid || days >= MAX_WAIT_DAYS}
                            size='icon-xs'
                            title='Increase wait by one day'
                            onClick={() => stepWaitDays(1)}
                        >
                            <LucideIcon.Plus className='size-4' />
                        </InputGroupButton>
                    </InputGroupAddon>
                </InputGroup>
                {showValidationError && (
                    <FieldError className='text-xs' id='automation-wait-days-error'>
                      Enter a delay between 1 and {formatNumber(MAX_WAIT_DAYS)} days
                    </FieldError>
                )}
            </SidebarField>
            <div className='mt-auto pt-6'>
                <DeleteStepButton onClick={onDelete} />
            </div>
        </div>
    );
};

// TODO: replace with real analytics — see NY-1347
const MOCK_EMAIL_PERFORMANCE = {
    openRate: 0.78,
    clickRate: 0.22,
    clickedCount: 227,
    links: [
        {id: 'l1', to: 'https://sure-footed-chapel.org/broken-spirit', count: 61},
        {id: 'l2', to: 'https://major-publicity.org/french-carboxyl', count: 60},
        {id: 'l3', to: 'https://simple-strait.info/made-up-innovation', count: 54},
        {id: 'l4', to: 'https://trivial-yarmulke.com/sudden-labourer', count: 52},
        {id: 'l5', to: 'https://ringed-doorbell.io/articles/quarterly-roundup-of-product-news-and-tips', count: 38},
        {id: 'l6', to: 'https://gentle-banyan.dev/changelog#2026-q1', count: 24}
    ]
} as const;

const EMAIL_PERFORMANCE_CHART_CONFIG = {
    Opened: {label: 'Opened'},
    Clicked: {label: 'Clicked'}
} satisfies ChartConfig;

const EmailPerformanceSection: React.FC = () => {
    const {openRate, clickRate, clickedCount, links} = MOCK_EMAIL_PERFORMANCE;
    const chartData: NewsletterRadialChartData[] = [
        {datatype: 'Clicked', value: clickRate, fill: 'url(#gradientTeal)', color: 'var(--chart-teal)'},
        {datatype: 'Opened', value: openRate, fill: 'url(#gradientBlue)', color: 'var(--chart-blue)'}
    ];
    const sortedLinks = [...links].sort((a, b) => b.count - a.count);

    return (
        <div className='flex flex-col gap-5'>
            <Separator />
            <div className='flex flex-col gap-5'>
                <h3 className='text-sm font-medium tracking-normal text-text-secondary'>
                    Email performance
                </h3>
                <div className='grid grid-cols-2 gap-4'>
                    <div className='flex flex-col gap-0.5'>
                        <span className='flex items-center gap-1.5 text-sm text-text-secondary'>
                            <span aria-hidden='true' className='size-2 rounded-full' style={{backgroundColor: 'var(--chart-blue)'}} />
                            Open rate
                        </span>
                        <span className='text-xl font-semibold tracking-tight'>{formatPercentage(openRate)}</span>
                    </div>
                    <div className='flex flex-col gap-0.5'>
                        <span className='flex items-center gap-1.5 text-sm text-text-secondary'>
                            <span aria-hidden='true' className='size-2 rounded-full' style={{backgroundColor: 'var(--chart-teal)'}} />
                            Click rate
                        </span>
                        <span className='text-xl font-semibold tracking-tight'>{formatPercentage(clickRate)}</span>
                    </div>
                </div>
                <div className='mx-auto h-[200px] w-[200px]'>
                    <NewsletterRadialChart
                        className='pointer-events-none aspect-square h-[200px]'
                        config={EMAIL_PERFORMANCE_CHART_CONFIG}
                        data={chartData}
                        size='md'
                        tooltip={false}
                    />
                </div>
            </div>
            <Separator />
            <div className='flex flex-col gap-3'>
                <div className='flex items-center justify-between'>
                    <span className='text-sm font-medium text-text-secondary'>Top clicked links</span>
                    <span className='text-sm font-medium text-muted-foreground'>Members</span>
                </div>
                <TooltipProvider delayDuration={500}>
                    <DataList className='group/datalist'>
                        <DataListBody>
                            {sortedLinks.map((link) => {
                                const percentage = clickedCount > 0 ? link.count / clickedCount : 0;
                                return (
                                    <DataListRow key={link.id}>
                                        <DataListBar style={{width: `${Math.round(percentage * 100)}%`}} />
                                        <DataListItemContent>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <a
                                                        className='flex min-w-0 items-center gap-2 hover:underline'
                                                        href={link.to}
                                                        rel='noreferrer'
                                                        target='_blank'
                                                    >
                                                        <LucideIcon.Link className='size-3.5 shrink-0 text-muted-foreground' strokeWidth={1.5} />
                                                        <span className='truncate font-medium'>{link.to.replace(/^https?:\/\//, '')}</span>
                                                    </a>
                                                </TooltipTrigger>
                                                <TooltipContent className='max-w-[28rem] break-all'>{link.to}</TooltipContent>
                                            </Tooltip>
                                        </DataListItemContent>
                                        <DataListItemValue>
                                            <DataListItemValueAbs>{formatNumber(link.count)}</DataListItemValueAbs>
                                            <DataListItemValuePerc>{formatPercentage(percentage)}</DataListItemValuePerc>
                                        </DataListItemValue>
                                    </DataListRow>
                                );
                            })}
                        </DataListBody>
                    </DataList>
                </TooltipProvider>
            </div>
        </div>
    );
};

const SendEmailSidebarBody: React.FC<{
  action: AutomationSendEmailAction;
  onUpdateSubject: (subject: string) => void;
  onEditEmail: () => void;
  onDelete: () => void;
}> = ({action, onUpdateSubject, onEditEmail, onDelete}) => {
    const subjectInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        subjectInputRef.current?.focus({preventScroll: true});
    }, [action.id]);

    return (
        <div className='flex flex-1 flex-col gap-5'>
            <SidebarField label='Subject line'>
                <Input
                    ref={subjectInputRef}
                    placeholder='Subject line'
                    value={action.data.email_subject}
                    onChange={e => onUpdateSubject(e.target.value)}
                />
            </SidebarField>
            <Button
                className='w-full'
                type='button'
                variant='outline'
                onClick={onEditEmail}
            >
                <LucideIcon.Pencil className='size-4' />
              Edit email content
            </Button>
            <EmailPerformanceSection />
            <div className='mt-auto pt-6 pb-2'>
                <DeleteStepButton onClick={onDelete} />
            </div>
        </div>
    );
};

const StepSidebarBody: React.FC<{detail: StepSidebarDetail}> = ({detail}) => {
    switch (detail.type) {
    case 'trigger':
        return <TriggerSidebarBody memberTiers={detail.memberTiers} />;
    case 'wait':
        return <WaitSidebarBody key={detail.action.id} action={detail.action} onDelete={detail.onDelete} onUpdate={detail.onUpdate} />;
    case 'send_email':
        return <SendEmailSidebarBody key={detail.action.id} action={detail.action} onDelete={detail.onDelete} onEditEmail={detail.onEditEmail} onUpdateSubject={detail.onUpdateSubject} />;
    default: {
        const _exhaustive: never = detail;
        throw new Error(`Unknown sidebar type: ${_exhaustive}`);
    }
    }
};

const StepSidebarContent: React.FC<{detail: StepSidebarDetail}> = ({detail}) => {
    const Icon = detail.icon;

    return (
        <div className='flex min-h-full flex-col gap-6'>
            <div className='flex items-start gap-4'>
                <div className='flex min-w-0 items-center gap-3'>
                    <div className='flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-text-secondary'>
                        <Icon className='size-4' />
                    </div>
                    <div className='min-w-0'>
                        <span className='block text-sm text-text-secondary'>{detail.label}</span>
                        <h2 className={cn('truncate text-base leading-tight font-medium tracking-normal text-foreground', detail.isPlaceholderTitle && 'opacity-50')}>{detail.title}</h2>
                    </div>
                </div>
            </div>

            <StepSidebarBody detail={detail} />
        </div>
    );
};

const automationSlugMemberTiers: Record<string, MemberTier[]> = {
    'member-welcome-email-free': ['free'],
    'member-welcome-email-paid': ['paid']
};

type StepSidebarDetailOptions = {
    automation: AutomationDetail;
    onDelete: (actionId: string) => void;
    onUpdateWait: (actionId: string, waitHours: number) => void;
    onUpdateSubject: (actionId: string, subject: string) => void;
    onEditEmail: (actionId: string) => void;
    stepId: string | null;
};

const getStepSidebarDetail = ({automation, stepId, onDelete, onUpdateWait, onUpdateSubject, onEditEmail}: StepSidebarDetailOptions): StepSidebarDetail | null => {
    if (!stepId) {
        return null;
    }

    if (stepId === TRIGGER_CANVAS_ID) {
        return {
            icon: LucideIcon.Zap,
            label: 'Trigger',
            title: 'Member signs up',
            memberTiers: automationSlugMemberTiers[automation.slug] ?? [],
            type: 'trigger'
        };
    }

    const action = automation.actions.find(item => item.id === stepId);
    if (!action) {
        return null;
    }

    switch (action.type) {
    case 'wait': {
        const waitValue = formatWait(action.data.wait_hours);
        return {
            icon: LucideIcon.Clock,
            label: 'Wait',
            title: waitValue,
            action,
            onDelete: () => onDelete(action.id),
            onUpdate: (waitHours: number) => onUpdateWait(action.id, waitHours),
            type: 'wait'
        };
    }
    case 'send_email':
        return {
            icon: LucideIcon.Mail,
            label: 'Send email',
            isPlaceholderTitle: !action.data.email_subject,
            title: action.data.email_subject || 'Untitled',
            action,
            onDelete: () => onDelete(action.id),
            onUpdateSubject: (subject: string) => onUpdateSubject(action.id, subject),
            onEditEmail: () => onEditEmail(action.id),
            type: 'send_email'
        };
    default: {
        const _exhaustive: never = action;
        throw new Error(`Unknown automation action type: ${_exhaustive}`);
    }
    }
};

type StepSidebarProps = { 
    automation: AutomationDetail
    stepId: string | null
    onDelete: (actionId: string) => void;
    onUpdateWait: (actionId: string, waitHours: number) => void;
    onUpdateSubject: (actionId: string, subject: string) => void;
    onEditEmail: (actionId: string) => void;
    isEmailModalOpen: boolean
    onClose: () => void
}

export const StepSidebar: React.FC<StepSidebarProps> = ({automation, stepId, onDelete, onUpdateWait, onUpdateSubject, onEditEmail, isEmailModalOpen, onClose}) => {
    const detail = getStepSidebarDetail({
        automation,
        stepId,
        onDelete,
        onUpdateWait,
        onUpdateSubject,
        onEditEmail
    });
    
    useEffect(() => {
        if (!detail) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                if (isEmailModalOpen) {
                    return;
                }
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [detail, isEmailModalOpen, onClose]);

    return (
        <aside
            aria-hidden={!detail}
            aria-label='Step details'
            className={cn(
                'absolute inset-y-0 right-0 z-[1] flex w-[calc(100%-6rem)] max-w-none translate-x-full flex-col gap-6 overflow-y-auto bg-background p-6 shadow-sm transition-transform duration-200 ease-out sm:w-[36rem] dark:border-l dark:border-gray-950',
                detail ? 'translate-x-0' : 'pointer-events-none'
            )}
            data-state={detail ? 'open' : 'closed'}
            data-testid='automation-step-sidebar'
        >
            {detail && <StepSidebarContent detail={detail} />}
        </aside>
    );
};
