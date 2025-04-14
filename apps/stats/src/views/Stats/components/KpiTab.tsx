import {TabsTrigger} from '@tryghost/shade';

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
}

const KpiTabValue: React.FC<KpiTabValueProps> = ({label, value}) => {
    return (
        <div className='flex w-full flex-col items-start'>
            <span className='text-[1.5rem] tracking-tight'>{label}</span>
            <span className='-mt-1 text-[2.3rem] tracking-[-0.04em]'>{value}</span>
        </div>
    );
};

export {KpiTabTrigger, KpiTabValue};