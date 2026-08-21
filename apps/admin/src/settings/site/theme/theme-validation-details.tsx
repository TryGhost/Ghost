import {useMemo} from 'react';
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger, Badge} from '@tryghost/shade/components';
import {SEVERITY_ORDER, getDisplaySeverity, sortBySeverity} from './theme-validation-issues';
import {type ThemeProblem} from '@tryghost/admin-x-framework/api/themes';
import {formatNumber} from '@tryghost/shade/utils';

function getDisplayVariant(problem: ThemeProblem): 'destructive' | 'warning' | 'secondary' {
    if (problem.level === 'warning') {
        return 'warning';
    }

    if (problem.level === 'recommendation') {
        return 'secondary';
    }

    return 'destructive';
}

/**
 * Summarises a set of problems by the severities actually present, e.g.
 * `2 errors, 3 warnings`. Empty severities are omitted entirely.
 */
function formatIssueSummary(problems: ThemeProblem[]): string {
    return SEVERITY_ORDER
        .map(severity => ({
            severity,
            count: problems.filter(problem => getDisplaySeverity(problem) === severity).length
        }))
        .filter(({count}) => count > 0)
        .map(({severity, count}) => `${formatNumber(count)} ${severity.toLowerCase()}${count === 1 ? '' : 's'}`)
        .join(', ');
}

/** Problem codes repeat across gscan results, so the index keeps accordion values unique. */
function problemValue(problem: ThemeProblem, index: number): string {
    return `${problem.code || 'issue'}-${index}`;
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

function ValidationProblemItem({problem, value}: {problem: ThemeProblem; value: string}) {
    return (
        <AccordionItem className='last:border-b-0' value={value}>
            <AccordionTrigger className='items-start gap-3 hover:no-underline'>
                <div className='min-w-0 flex-1'>
                    <div className='mb-2 flex items-center gap-2'>
                        <Badge variant={getDisplayVariant(problem)}>{getDisplaySeverity(problem)}</Badge>
                        {problem.code && <span className='text-xs font-normal text-muted-foreground'>{problem.code}</span>}
                    </div>
                    <div dangerouslySetInnerHTML={{__html: problem.rule}} className='text-sm font-medium text-foreground' />
                </div>
            </AccordionTrigger>
            <AccordionContent>
                <ProblemDetails problem={problem} />
            </AccordionContent>
        </AccordionItem>
    );
}

/** A bare error string from the API: same row as a problem, minus anything to expand. */
function ValidationMessageRow({message}: {message: string}) {
    return (
        <div className='border-b border-border py-4 last:border-b-0'>
            <div className='mb-2 flex items-center gap-2'>
                <Badge variant='destructive'>Error</Badge>
            </div>
            <p className='text-sm font-medium text-foreground'>{message}</p>
        </div>
    );
}

/**
 * The problems themselves: one row per problem, separated by a hairline, each
 * independently expandable. Bare `messages` render as rows in the same list so
 * a dialog never stacks two treatments for the same kind of content.
 */
export function ValidationProblemList({
    className,
    expandedByDefault = false,
    messages = [],
    problems
}: {
    className?: string;
    expandedByDefault?: boolean;
    messages?: string[];
    problems: ThemeProblem[];
}) {
    const sortedProblems = useMemo(() => sortBySeverity(problems), [problems]);
    const values = useMemo(() => sortedProblems.map(problemValue), [sortedProblems]);

    if (!sortedProblems.length && !messages.length) {
        return null;
    }

    return (
        <div className={className}>
            {messages.map(message => <ValidationMessageRow key={message} message={message} />)}
            {sortedProblems.length > 0 && (
                <Accordion defaultValue={expandedByDefault ? values : []} type='multiple'>
                    {sortedProblems.map((problem, index) => (
                        <ValidationProblemItem key={values[index]} problem={problem} value={values[index]} />
                    ))}
                </Accordion>
            )}
        </div>
    );
}

/**
 * Non-blocking validation problems, headed by a static count of what was
 * found. Renders nothing when the theme validated cleanly.
 */
export function ThemeValidationIssueList({problems}: {problems: ThemeProblem[]}) {
    if (!problems.length) {
        return null;
    }

    return (
        <div className='border-t border-border pt-5'>
            <h3 className='border-b border-border pb-3 text-md font-semibold text-foreground'>{formatIssueSummary(problems)}</h3>
            <ValidationProblemList problems={problems} />
        </div>
    );
}
