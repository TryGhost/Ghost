import {LucideIcon, TabsTrigger, cn} from '@tryghost/shade';

interface KpiTabTriggerProps extends React.ComponentProps<typeof TabsTrigger> {
    children: React.ReactNode;
}

const KpiTabTrigger: React.FC<KpiTabTriggerProps> = ({children, ...props}) => {
    return (
        <TabsTrigger className='mt-4 h-auto' {...props}>
            {children}
        </TabsTrigger>
    );
};

interface KpiTabValueProps {
    label: string;
    value: string | number;
    diffDirection?: 'up' | 'down' | 'same';
    diffValue?: string | number;
}

const KpiTabValue: React.FC<KpiTabValueProps> = ({label, value, diffDirection, diffValue}) => {
    const diffContainerClassName = cn(
        'hidden xl:!flex xl:!visible items-center gap-1 rounded-full px-1.5 text-xs -mb-0.5',
        diffDirection === 'up' && 'bg-green/15 text-green-600',
        diffDirection === 'down' && 'bg-red/10 text-red-600',
        diffDirection === 'same' && 'bg-gray-200 text-gray-700'
    );
    return (
        <div className='flex w-full flex-col items-start'>
            <span className='font-semibold tracking-tight'>{label}</span>
            <div className='-mt-0.5 flex items-center gap-3'>
                <span className='text-[2.0rem] tracking-tight xl:text-[2.3rem] xl:tracking-[-0.04em]'>{value}</span>
                {diffValue &&
                    <>
                        <div className={diffContainerClassName}>
                            {diffDirection === 'up' &&
                                <LucideIcon.TrendingUp className='!size-[14px]' size={14} strokeWidth={2} />
                            }
                            {diffDirection === 'down' &&
                                <LucideIcon.TrendingDown className='!size-[14px]' size={14} strokeWidth={2} />
                            }
                            <span className='font-medium'>{diffValue}</span>
                        </div>
                    </>
                }
            </div>
        </div>
    );
};

export {KpiTabTrigger, KpiTabValue};