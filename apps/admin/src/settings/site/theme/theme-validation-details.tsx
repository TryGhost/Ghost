import {useMemo} from 'react';
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger, Badge} from '@tryghost/shade/components';
import {SEVERITY_ORDER, getDisplaySeverity, sortBySeverity} from './theme-validation-issues';
import {type ThemeProblem} from '@tryghost/admin-x-framework/api/themes';
import {LucideIcon, cn, formatNumber} from '@tryghost/shade/utils';

/**
 * gscan writes `rule` and `details` as HTML containing `<code>`, `<br>` and
 * `<a>`. We render it verbatim, so the mono treatment for inline code is
 * applied by styling those descendants rather than touching the markup.
 */
const RULE_HTML = 'text-base font-semibold text-foreground [&_code]:font-mono [&_code]:text-md';
const DETAILS_HTML = 'text-sm text-muted-foreground [&_a]:underline [&_code]:font-mono [&_code]:text-base';

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

function SeverityBadge({children, variant}: {children: string; variant: 'destructive' | 'warning' | 'secondary'}) {
    return <Badge className='py-1 font-mono text-md leading-none uppercase' variant={variant}>{children}</Badge>;
}

function ProblemDetails({problem}: {problem: ThemeProblem}) {
    return (
        <div className='space-y-3'>
            <div dangerouslySetInnerHTML={{__html: problem.details}} className={DETAILS_HTML} />
            {problem.failures?.length > 0 && (
                <div>
                    <h6 className='mb-1 text-xs font-semibold text-muted-foreground uppercase'>Affected files</h6>
                    <ul className='space-y-1 text-sm text-muted-foreground'>
                        {problem.failures.map(failure => (
                            <li key={`${failure.ref}-${failure.message || ''}`}>
                                <code className='rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground'>{failure.ref}</code>
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
            {/* Expanding closes the trigger's own bottom padding so the details
                sit under the rule line rather than a row's worth of space. */}
            <AccordionTrigger className='items-start gap-3 p-5 hover:no-underline data-[state=open]:pb-1 [&>svg]:mt-1'>
                <div className='flex min-w-0 flex-1 flex-col gap-2'>
                    <div className='flex items-center gap-3'>
                        <SeverityBadge variant={getDisplayVariant(problem)}>{getDisplaySeverity(problem)}</SeverityBadge>
                        {problem.code && <span className='font-mono text-md font-normal text-muted-foreground'>{problem.code}</span>}
                    </div>
                    <div dangerouslySetInnerHTML={{__html: problem.rule}} className={RULE_HTML} />
                </div>
            </AccordionTrigger>
            <AccordionContent className='px-5 pb-5'>
                <ProblemDetails problem={problem} />
            </AccordionContent>
        </AccordionItem>
    );
}

/** A bare error string from the API: same row as a problem, minus anything to expand. */
function ValidationMessageRow({message}: {message: string}) {
    return (
        <div className='flex flex-col gap-2 border-b border-border p-5 last:border-b-0'>
            <div className='flex items-center gap-3'>
                <SeverityBadge variant='destructive'>Error</SeverityBadge>
            </div>
            <p className='text-base font-semibold text-foreground'>{message}</p>
        </div>
    );
}

/**
 * The problems themselves: one bordered container, one row per problem,
 * separated by a hairline, each independently expandable. Bare `messages`
 * render as rows in the same list so a dialog never stacks two treatments for
 * the same kind of content.
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
        <div className={cn('overflow-hidden rounded-lg border border-border', className)}>
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
        <div>
            <h3 className='flex items-center gap-2 text-base font-semibold text-foreground'>
                <LucideIcon.TriangleAlert className='size-4 shrink-0 text-state-warning' />
                {formatIssueSummary(problems)}
            </h3>
            <ValidationProblemList className='mt-4' problems={problems} />
        </div>
    );
}
