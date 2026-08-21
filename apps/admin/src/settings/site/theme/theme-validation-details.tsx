import { useMemo } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Badge,
} from '@tryghost/shade/components';
import {
  SEVERITY_ORDER,
  getDisplaySeverity,
  hasErrorProblem,
  sortBySeverity,
} from './theme-validation-issues';
import { type ThemeProblem } from '@tryghost/admin-x-framework/api/themes';
import { LucideIcon, cn, formatNumber } from '@tryghost/shade/utils';

/**
 * Ghost's legacy Ember stylesheet ships an unlayered `code, tt` rule that gives
 * every `<code>` in Admin a bordered grey chip with pink text. A bare element
 * selector loses to any class, so each property it sets has to be answered
 * explicitly — including `border-radius`, `vertical-align` and `line-height`,
 * whose absence reads as baseline drift rather than an obvious box.
 */
const LEGACY_CODE_RESET =
  '[&_code]:rounded-none [&_code]:border-0 [&_code]:bg-transparent [&_code]:p-0 [&_code]:align-baseline [&_code]:text-inherit [&_code]:leading-[inherit]';

/**
 * The same reset applied straight to a `<code>` element we render ourselves,
 * so inline mono looks identical whether it came from gscan's HTML or from us.
 * Size is left to the line it sits on: nothing should read larger than its
 * surrounding text.
 */
const INLINE_CODE =
  'rounded-none border-0 bg-transparent p-0 align-baseline font-mono text-inherit leading-[inherit]';

/**
 * gscan writes `rule` and `details` as HTML containing `<code>`, `<br>` and
 * `<a>`. We render it verbatim, so the mono treatment for inline code is
 * applied by styling those descendants rather than touching the markup. The
 * explicit `[&_code]:text-*` matches the block's own size, because a bare
 * `font-family: monospace` otherwise drops to the browser's mono default.
 */
const RULE_HTML = `text-base leading-[1.45] font-semibold text-foreground [&_code]:font-mono [&_code]:text-base ${LEGACY_CODE_RESET}`;
const DETAILS_HTML = `text-sm leading-[1.45] text-foreground [&_a]:underline [&_code]:font-mono [&_code]:text-sm ${LEGACY_CODE_RESET}`;

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
 * Counts a set of problems by display severity, most severe first, dropping
 * severities that aren't present. The single place the heading looks at what a
 * set contains, so its wording and its icon can never disagree.
 */
function countBySeverity(problems: ThemeProblem[]) {
  return SEVERITY_ORDER.map((severity) => ({
    severity,
    count: problems.filter((problem) => getDisplaySeverity(problem) === severity).length,
  })).filter(({ count }) => count > 0);
}

/**
 * Summarises a set of problems by the severities actually present, e.g.
 * `2 errors, 3 warnings`. Empty severities are omitted entirely.
 */
function formatIssueSummary(counts: ReturnType<typeof countBySeverity>): string {
  return counts
    .map(
      ({ severity, count }) =>
        `${formatNumber(count)} ${severity.toLowerCase()}${count === 1 ? '' : 's'}`,
    )
    .join(', ');
}

/** Problem codes repeat across gscan results, so the index keeps accordion values unique. */
function problemValue(problem: ThemeProblem, index: number): string {
  return `${problem.code || 'issue'}-${index}`;
}

function SeverityBadge({
  children,
  variant,
}: {
  children: string;
  variant: 'destructive' | 'warning' | 'secondary';
}) {
  return (
    <Badge className="py-1 font-mono text-sm leading-none uppercase" variant={variant}>
      {children}
    </Badge>
  );
}

function ProblemDetails({ problem }: { problem: ThemeProblem }) {
  return (
    <div className="space-y-3">
      <div dangerouslySetInnerHTML={{ __html: problem.details }} className={DETAILS_HTML} />
      {problem.failures?.length > 0 && (
        <div>
          <h6 className="mb-1 text-base font-semibold text-muted-foreground">Affected files</h6>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {problem.failures.map((failure) => (
              <li key={`${failure.ref}-${failure.message || ''}`}>
                {/* A filename is inline mono like any other, so it carries no chip:
                                    same size, colour and family as the code in the details above. */}
                <code className={`${INLINE_CODE} text-sm`}>{failure.ref}</code>
                {failure.message ? <span>: {failure.message}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ValidationProblemItem({
  errorLabel,
  problem,
  value,
}: {
  errorLabel: string;
  problem: ThemeProblem;
  value: string;
}) {
  const severity = getDisplaySeverity(problem);

  return (
    <AccordionItem className="last:border-b-0" value={value}>
      {/* Expanding closes the trigger's own bottom padding so the details
                sit under the rule line rather than a row's worth of space. */}
      <AccordionTrigger className="items-start gap-3 p-5 hover:no-underline data-[state=open]:pb-1 [&>svg]:mt-1">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-center gap-3">
            <SeverityBadge variant={getDisplayVariant(problem)}>
              {severity === 'Error' ? errorLabel : severity}
            </SeverityBadge>
            {problem.code && (
              <span className="font-mono text-sm font-normal text-muted-foreground">
                {problem.code}
              </span>
            )}
          </div>
          <div dangerouslySetInnerHTML={{ __html: problem.rule }} className={RULE_HTML} />
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-5 pb-5">
        <ProblemDetails problem={problem} />
      </AccordionContent>
    </AccordionItem>
  );
}

/** A bare error string from the API: same row as a problem, minus anything to expand. */
function ValidationMessageRow({ errorLabel, message }: { errorLabel: string; message: string }) {
  return (
    <div className="flex flex-col gap-2 border-b border-border p-5 last:border-b-0">
      <div className="flex items-center gap-3">
        <SeverityBadge variant="destructive">{errorLabel}</SeverityBadge>
      </div>
      <p className="text-base font-semibold text-foreground">{message}</p>
    </div>
  );
}

/**
 * The problems themselves: one bordered container, one row per problem,
 * separated by a hairline, each independently expandable. Bare `messages`
 * render as rows in the same list so a dialog never stacks two treatments for
 * the same kind of content.
 *
 * `errorLabel` names what an error-severity row is, so a dialog that shows two
 * lists can say which one stopped it: the problems that blocked the action are
 * `Blocking`, the ones merely reported alongside them stay `Error`.
 */
export function ValidationProblemList({
  className,
  errorLabel = 'Error',
  expandedByDefault = false,
  messages = [],
  problems,
}: {
  className?: string;
  errorLabel?: string;
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
      {messages.map((message) => (
        <ValidationMessageRow key={message} errorLabel={errorLabel} message={message} />
      ))}
      {sortedProblems.length > 0 && (
        <Accordion defaultValue={expandedByDefault ? values : []} type="multiple">
          {sortedProblems.map((problem, index) => (
            <ValidationProblemItem
              key={values[index]}
              errorLabel={errorLabel}
              problem={problem}
              value={values[index]}
            />
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
export function ThemeValidationIssueList({ problems }: { problems: ThemeProblem[] }) {
  if (!problems.length) {
    return null;
  }

  const counts = countBySeverity(problems);
  // A set that contains errors is headed "1 error, 2 warnings", so the icon
  // beside it has to read as an error too — amber is only right when the set
  // is warnings and recommendations alone.
  const hasError = hasErrorProblem(problems);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <LucideIcon.TriangleAlert
            className={cn('size-4 shrink-0', hasError ? 'text-destructive' : 'text-state-warning')}
          />
          {formatIssueSummary(counts)}
        </h3>
        {/* Only errors get explained: warnings and recommendations restrict
                    nothing, so the same line under them would overstate them. */}
        {hasError && (
          <p className="text-sm text-muted-foreground">
            Highly recommended to fix, functionality could be restricted
          </p>
        )}
      </div>
      <ValidationProblemList problems={problems} />
    </div>
  );
}
