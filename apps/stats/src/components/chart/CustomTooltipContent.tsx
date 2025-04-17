import {formatDisplayDate} from '@src/utils/data-formatters';

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
}

const CustomTooltipContent = ({active, payload}: TooltipProps) => {
    if (!active || !payload?.length) {
        return null;
    }

    const {date, formattedValue, label} = payload[0].payload;
    const displayValue = formattedValue || payload[0].value;

    return (
        <div className="bg-background min-w-[120px] rounded-lg border px-3 py-2 shadow-lg">
            {date && <div className="text-foreground text-sm">{formatDisplayDate(date)}</div>}
            <div className='flex items-center gap-1'>
                <span className='inline-block size-[10px] rounded-[2px]' style={{backgroundColor: 'hsl(var(--chart-1))'}}></span>
                <div className='flex grow items-center justify-between gap-3'>
                    {label && <div className="text-muted-foreground text-sm">{label}</div>}
                    <div className="font-mono font-medium">{displayValue}</div>
                </div>
            </div>
        </div>
    );
};

export default CustomTooltipContent;