import {formatDisplayDateWithRange} from '@tryghost/shade';

interface TooltipPayload {
    value: number;
    payload: {
        date?: string;
        formattedValue?: string;
        label?: string;
    };
}

interface TooltipProps {
    active?: boolean;
    payload?: TooltipPayload[];
    range?: number;
    color?: string;
}

const CustomTooltipContent = ({active, payload, range, color}: TooltipProps) => {
    if (!active || !payload?.length) {
        return null;
    }

    const {date, formattedValue, label} = payload[0].payload;
    const displayValue = formattedValue || payload[0].value;

    return (
        <div className="min-w-[120px] rounded-lg border bg-background px-3 py-2 shadow-lg">
            {date && <div className="text-sm text-foreground">{formatDisplayDateWithRange(date, range || 0)}</div>}
            <div className='flex items-center gap-2'>
                <span className='inline-block size-[9px] rounded-[2px] opacity-50' style={{backgroundColor: color || 'hsl(var(--chart-blue))'}}></span>
                <div className='flex grow items-center justify-between gap-3'>
                    {label && <div className="text-sm text-muted-foreground">{label}</div>}
                    <div className="font-mono font-medium">{displayValue}</div>
                </div>
            </div>
        </div>
    );
};

export default CustomTooltipContent;
