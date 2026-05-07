import React, {useEffect, useRef, useState} from 'react';
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@tryghost/shade/components';
import {cn} from '@tryghost/shade/utils';
import type {CustomRendererProps} from '@tryghost/shade/patterns';

const DEFAULT_AMOUNT = 7;
const MAX_AMOUNT = 365;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const inputClass = 'w-full bg-transparent outline-hidden dark:!bg-transparent';

interface RelativeDateFilterProps extends CustomRendererProps<unknown> {
    fallbackDate: string;
}

export const RelativeDateFilter: React.FC<RelativeDateFilterProps> = ({
    field,
    values,
    onChange,
    operator,
    fallbackDate
}) => {
    const isRelative = operator === 'in-the-last' || operator === 'in-the-next';
    const rawAmount = values[0];
    const amount = typeof rawAmount === 'number' && Number.isInteger(rawAmount) && rawAmount > 0
        ? Math.min(rawAmount, MAX_AMOUNT)
        : DEFAULT_AMOUNT;
    const dateValue = typeof rawAmount === 'string' && DATE_PATTERN.test(rawAmount) ? rawAmount : fallbackDate;

    // Normalize values when the operator switches between date and relative-day modes.
    // Stored in a ref so this only fires on operator transitions, not on every render —
    // which would risk a parent/child onChange ping-pong.
    const lastNormalizedOperatorRef = useRef<string | null>(null);

    useEffect(() => {
        if (lastNormalizedOperatorRef.current === operator) {
            return;
        }

        lastNormalizedOperatorRef.current = operator;

        const expected: unknown[] = isRelative ? [amount] : [dateValue];

        if (!valuesMatch(values, expected)) {
            onChange(expected);
        }
    }, [operator, isRelative, amount, dateValue, values, onChange]);

    const [draft, setDraft] = useState<string>(() => String(amount));

    useEffect(() => {
        setDraft(String(amount));
    }, [amount]);

    if (isRelative) {
        const tooltipPrefix = operator === 'in-the-last' ? 'Since' : 'Until';
        const tooltipDate = shiftAndFormatDate(fallbackDate, operator === 'in-the-last' ? -amount : amount);

        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="flex w-full items-center gap-2" data-slot="filters-input-wrapper">
                            <input
                                aria-label="Relative date amount"
                                className={cn(inputClass, 'min-w-[1ch] tabular-nums [field-sizing:content] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none')}
                                data-slot="filters-input"
                                max={MAX_AMOUNT}
                                min={1}
                                type="number"
                                value={draft}
                                onBlur={() => {
                                    const n = Number(draft);

                                    if (!Number.isInteger(n) || n <= 0 || n > MAX_AMOUNT) {
                                        setDraft(String(amount));
                                    }
                                }}
                                onChange={(e) => {
                                    const next = e.target.value;
                                    setDraft(next);
                                    const n = Number(next);

                                    if (Number.isInteger(n) && n > 0 && n <= MAX_AMOUNT) {
                                        onChange([n]);
                                    }
                                }}
                            />
                            <span className="shrink-0 text-muted-foreground select-none">{amount === 1 ? 'day' : 'days'}</span>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>{tooltipPrefix} {tooltipDate}</TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    return (
        <div className={cn('flex w-full items-center', field.className)} data-slot="filters-input-wrapper">
            <input
                aria-label={typeof field.label === 'string' ? field.label : 'Date'}
                className={inputClass}
                data-slot="filters-input"
                type="date"
                value={dateValue}
                onChange={e => onChange([e.target.value])}
            />
        </div>
    );
};

// `yyyymmdd` is a calendar date in the site's timezone. We construct a Date in the
// browser's local zone purely to do calendar arithmetic — only the y/m/d fields are
// read back via Intl, so the local-timezone Date is fine for display.
function shiftAndFormatDate(yyyymmdd: string, dayOffset: number): string {
    const [year, month, day] = yyyymmdd.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + dayOffset);

    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    }).format(date);
}

function valuesMatch(actual: unknown[], expected: unknown[]): boolean {
    if (actual.length !== expected.length) {
        return false;
    }

    for (let i = 0; i < actual.length; i += 1) {
        if (actual[i] !== expected[i]) {
            return false;
        }
    }

    return true;
}
