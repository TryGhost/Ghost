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
        <div className="min-w-[120px] rounded-lg border bg-white p-2 shadow-lg">
            {date && <div className="text-sm text-black">{formatDisplayDate(date)}</div>}
            <div className='flex items-center gap-1'>
                <span className='inline-block size-[10px] rounded-[2px] bg-purple-500'></span>
                <div className='flex grow items-center justify-between gap-3'>
                    {label && <div className="text-sm text-gray-800">{label}</div>}
                    <div className="font-mono font-medium">{displayValue}</div>
                </div>
            </div>
        </div>
    );
};

export default CustomTooltipContent;