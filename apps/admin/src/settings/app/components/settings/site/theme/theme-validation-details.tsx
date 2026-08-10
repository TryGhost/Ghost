import React, {useEffect, useMemo, useState} from 'react';
import {Badge, Banner} from '@tryghost/shade/components';
import {type InstalledTheme, type ThemeProblem} from '@tryghost/admin-x-framework/api/themes';
import {LucideIcon} from '@tryghost/shade/utils';

type ThemeValidationErrorDetails = {
    errors?: ThemeProblem[];
    warnings?: ThemeProblem[];
};

type ThemeValidationError = {
    details: ThemeValidationErrorDetails | string;
};

export type FatalErrors = ThemeValidationError[];

type IssueSummary = {
    blockingProblems: ThemeProblem[];
    secondaryProblems: ThemeProblem[];
    stringErrors: string[];
};

type DisplaySeverity = 'Error' | 'Warning' | 'Recommendation';

function isDetailsObject(details: ThemeValidationError['details']): details is ThemeValidationErrorDetails {
    return typeof details === 'object' && details !== null;
}

function allProblemsFromDetails(details: ThemeValidationErrorDetails) {
    return [...(details.errors || []), ...(details.warnings || [])];
}

export function getIssuesFromFatalErrors(fatalErrors: FatalErrors = []): IssueSummary {
    const blockingProblems: ThemeProblem[] = [];
    const secondaryProblems: ThemeProblem[] = [];
    const stringErrors: string[] = [];

    fatalErrors.forEach((error) => {
        if (isDetailsObject(error.details)) {
            allProblemsFromDetails(error.details).forEach((problem) => {
                if (problem.fatal) {
                    blockingProblems.push(problem);
                } else {
                    secondaryProblems.push(problem);
                }
            });
        } else {
            stringErrors.push(error.details);
        }
    });

    return {blockingProblems, secondaryProblems, stringErrors};
}

export function getIssuesFromInstalledTheme(installedTheme: InstalledTheme): ThemeProblem[] {
    return [...(installedTheme.errors || []), ...(installedTheme.warnings || [])];
}

function getDisplaySeverity(problem: ThemeProblem): DisplaySeverity {
    if (problem.level === 'warning') {
        return 'Warning';
    }

    if (problem.level === 'recommendation') {
        return 'Recommendation';
    }

    return 'Error';
}

function getDisplayVariant(problem: ThemeProblem): 'destructive' | 'warning' | 'secondary' {
    if (problem.level === 'warning') {
        return 'warning';
    }

    if (problem.level === 'recommendation') {
        return 'secondary';
    }

    return 'destructive';
}

function formatNonBlockingIssueCount(count: number) {
    return `${count} non-blocking ${count === 1 ? 'issue' : 'issues'}`;
}

function ProblemDetails({problem}: {problem: ThemeProblem}) {
    return (
        <div className='space-y-3'>
            <div dangerouslySetInnerHTML={{__html: problem.details}} className='text-sm text-muted-foreground' />
            {problem.failures?.length > 0 && (
                <div>
                    <h6 className='mb-1 text-xs font-semibold text-muted-foreground uppercase'>Affected files</h6>
                    <ul className='space-y-1 text-sm text-muted-foreground'>
                        {problem.failures.map(failure => (
                            <li key={`${failure.ref}-${failure.message || ''}`}>
                                <code className='rounded bg-muted px-1 py-0.5 text-xs text-foreground'>{failure.ref}</code>
                                {failure.message ? <span>: {failure.message}</span> : null}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

export function ValidationProblemCard({problem, prominent = false}: {problem: ThemeProblem; prominent?: boolean}) {
    const [expanded, setExpanded] = useState(prominent);
    const displaySeverity = getDisplaySeverity(problem);

    return (
        <div className={`rounded-lg border ${prominent ? 'border-destructive/30 bg-background' : 'border-border bg-background'} p-4`}>
            <button
                className='flex w-full items-start justify-between gap-3 text-left'
                type='button'
                onClick={() => setExpanded(!expanded)}
            >
                <div className='min-w-0 flex-1'>
                    <div className='mb-2 flex items-center gap-2'>
                        <Badge variant={getDisplayVariant(problem)}>{displaySeverity}</Badge>
                        {problem.code && <span className='text-xs text-muted-foreground'>{problem.code}</span>}
                    </div>
                    <div dangerouslySetInnerHTML={{__html: problem.rule}} className='text-sm font-medium text-foreground' />
                </div>
                <LucideIcon.ChevronDown className={`mt-1 size-4 shrink-0 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
            {expanded && (
                <div className='mt-4 border-t border-border pt-4'>
                    <ProblemDetails problem={problem} />
                </div>
            )}
        </div>
    );
}

export function ThemeValidationDetailsDisclosure({
    defaultOpen,
    problems
}: {
    defaultOpen: boolean;
    problems: ThemeProblem[];
}) {
    const [open, setOpen] = useState(defaultOpen);
    const count = problems.length;

    useEffect(() => {
        setOpen(defaultOpen);
    }, [defaultOpen]);

    const sortedProblems = useMemo(() => {
        return [...problems].sort((a, b) => {
            const severityOrder: Record<DisplaySeverity, number> = {Error: 0, Warning: 1, Recommendation: 2};
            return severityOrder[getDisplaySeverity(a)] - severityOrder[getDisplaySeverity(b)];
        });
    }, [problems]);

    if (!count) {
        return null;
    }

    return (
        <div className='mt-6 border-t border-border pt-5'>
            <button
                className='flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-background p-4 text-left transition-colors hover:bg-muted/40'
                type='button'
                onClick={() => setOpen(!open)}
            >
                <div>
                    <div className='text-sm font-semibold text-foreground'>
                        Review {formatNonBlockingIssueCount(count)}
                    </div>
                    <div className='mt-1 text-sm text-muted-foreground'>
                        {open ? 'Hide details' : 'Show details'}
                    </div>
                </div>
                <LucideIcon.ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className='mt-4 space-y-3'>
                    {sortedProblems.map(problem => (
                        <ValidationProblemCard key={problem.code} problem={problem} />
                    ))}
                </div>
            )}
        </div>
    );
}

export function ErrorTextCard({message}: {message: string}) {
    return (
        <div className='rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive'>
            <div className='flex items-start gap-2'>
                <LucideIcon.AlertTriangle className='mt-0.5 size-4 shrink-0' />
                <p>{message}</p>
            </div>
        </div>
    );
}

export function OutcomeBanner({
    children,
    title,
    variant
}: {
    children: React.ReactNode;
    title: string;
    variant: 'success' | 'destructive';
}) {
    const Icon = variant === 'success' ? LucideIcon.CheckCircle2 : LucideIcon.AlertTriangle;
    const iconClassName = variant === 'success' ? 'text-state-success' : 'text-destructive';

    return (
        <Banner role={variant === 'destructive' ? 'alert' : 'status'} size='lg' variant={variant === 'success' ? 'success' : 'destructive'}>
            <div className='flex items-start gap-3'>
                <div className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full ${variant === 'success' ? 'bg-state-success/10' : 'bg-destructive/10'}`}>
                    <Icon className={`size-5 ${iconClassName}`} />
                </div>
                <div>
                    <h3 className={`text-xl font-semibold tracking-tight ${variant === 'success' ? 'text-state-success' : 'text-destructive'}`}>{title}</h3>
                    <div className='mt-1 text-sm text-foreground'>{children}</div>
                </div>
            </div>
        </Banner>
    );
}
