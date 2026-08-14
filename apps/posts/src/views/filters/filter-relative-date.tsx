import React, {useEffect, useRef, useState} from 'react';
import {type CustomRendererProps, FilterDatePicker, type FilterFieldConfig} from '@tryghost/shade/patterns';
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@tryghost/shade/components';
import {cn} from '@tryghost/shade/utils';
import type {FilterField} from './filter-types';

/**
 * The relative-date operator family — "in the last N days" / "in the next N
 * days" — plus the bits any view needs to use them: labels, a type guard,
 * variant builders that attach them to a date field, and the day-count input
 * renderer. Domains decide when to attach them; this file just provides the
 * pieces.
 */

export const RELATIVE_PAST_OPERATOR = 'in-the-last';
export const RELATIVE_FUTURE_OPERATOR = 'in-the-next';

export const RELATIVE_DATE_OPERATOR_LABELS: Record<string, string> = {
    [RELATIVE_PAST_OPERATOR]: 'in the last',
    [RELATIVE_FUTURE_OPERATOR]: 'in the next'
};

export function isRelativeDateOperator(operator: string): boolean {
    return operator === RELATIVE_PAST_OPERATOR || operator === RELATIVE_FUTURE_OPERATOR;
}

export function fieldHasRelativeOperator(field: FilterField): boolean {
    return field.operators.some(isRelativeDateOperator);
}

/** Returns the field with the past-leaning relative operator appended. */
export function withPastRelativeOperator<T extends FilterField>(field: T): T {
    return {...field, operators: [...field.operators, RELATIVE_PAST_OPERATOR]};
}

/** Returns the field with the future-leaning relative operator appended. */
export function withFutureRelativeOperator<T extends FilterField>(field: T): T {
    return {...field, operators: [...field.operators, RELATIVE_FUTURE_OPERATOR]};
}

/** The day-count input shown when a relative-date operator is selected. */
export function createRelativeDateRenderer(fallbackDate: string): NonNullable<FilterFieldConfig['customRenderer']> {
    const renderer = (props: CustomRendererProps) => React.createElement(RelativeDateFilter, {
        ...props,
        fallbackDate
    });

    return Object.assign(renderer, {displayName: 'RelativeDateRenderer'});
}

// ---------------------------------------------------------------------------
// Renderer component
// ---------------------------------------------------------------------------

const DEFAULT_AMOUNT = 7;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const inputClass = 'w-full bg-transparent outline-hidden dark:!bg-transparent';

interface RelativeDateFilterProps extends CustomRendererProps<unknown> {
    fallbackDate: string;
}

const RelativeDateFilter: React.FC<RelativeDateFilterProps> = ({
    field,
    values,
    onChange,
    operator,
    fallbackDate
}) => {
    const isRelative = isRelativeDateOperator(operator);
    const rawAmount = values[0];
    const amount = typeof rawAmount === 'number' && Number.isSafeInteger(rawAmount) && rawAmount > 0
        ? rawAmount
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
        const tooltipPrefix = operator === RELATIVE_PAST_OPERATOR ? 'Since' : 'Until';
        const tooltipDate = formatRelativeDateTooltip(fallbackDate, operator === RELATIVE_PAST_OPERATOR ? -amount : amount);

        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="flex w-full items-center gap-2" data-slot="filters-input-wrapper">
                            <input
                                aria-label="Relative date amount"
                                className={cn(inputClass, '[field-sizing:content] min-w-[1ch] [appearance:textfield] tabular-nums [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none')}
                                data-slot="filters-input"
                                min={1}
                                type="number"
                                value={draft}
                                onBlur={() => {
                                    const n = Number(draft);

                                    if (!Number.isSafeInteger(n) || n <= 0) {
                                        setDraft(String(amount));
                                    }
                                }}
                                onChange={(e) => {
                                    const next = e.target.value;
                                    setDraft(next);
                                    const n = Number(next);

                                    if (Number.isSafeInteger(n) && n > 0) {
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
        <FilterDatePicker
            className={field.className}
            embedded={true}
            field={field}
            value={dateValue}
            onChange={value => onChange([value])}
        />
    );
};

// `yyyymmdd` is a calendar date in the site's timezone. We construct a Date in the
// browser's local zone purely to do calendar arithmetic — only the y/m/d fields are
// read back via Intl, so the local-timezone Date is fine for display.
export function formatRelativeDateTooltip(yyyymmdd: string, dayOffset: number): string {
    const [year, month, day] = yyyymmdd.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + dayOffset);

    return new Intl.DateTimeFormat(getPreferredLocale(), {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    }).format(date);
}

function getPreferredLocale(): string {
    if (typeof navigator === 'undefined') {
        return 'en-US';
    }

    return navigator.language || 'en-US';
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
