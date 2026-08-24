import { useMemo } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Badge,
} from '@tryghost/shade/components';
import {
  type DisplayVariant,
  SEVERITY_ORDER,
  getDisplaySeverity,
  getDisplayVariant,
  hasErrorProblem,
  sortBySeverity,
} from './theme-validation-issues';
import { type ThemeProblem } from '@tryghost/admin-x-framework/api/themes';
import { LucideIcon, cn, formatNumber } from '@tryghost/shade/utils';

/**
 * A grey inline-code chip that also answers every property of Ghost's legacy
 * unlayered `code, tt` rule. Tokens are spelled out in full because Tailwind
 * only generates utilities it finds literally in the source.
 */
const CODE_CHIP =
  '[&_code]:rounded-xs [&_code]:border-0 [&_code]:bg-secondary [&_code]:px-1 [&_code]:py-0.5 [&_code]:align-baseline [&_code]:font-mono [&_code]:text-sm [&_code]:text-inherit [&_code]:leading-[inherit] [&_code]:whitespace-nowrap';

/** gscan writes `rule` and `details` as HTML, rendered verbatim. */
const RULE_HTML = `text-base leading-[1.45] font-semibold text-foreground ${CODE_CHIP}`;
const DETAILS_HTML = `text-base leading-[1.45] text-foreground [&_a]:underline ${CODE_CHIP}`;

const FAILURE_LIST = `space-y-1 text-base text-muted-foreground ${CODE_CHIP}`;

function countBySeverity(problems: ThemeProblem[]) {
  return SEVERITY_ORDER.map((severity) => ({
    severity,
    count: problems.filter((problem) => getDisplaySeverity(problem) === severity).length,
  })).filter(({ count }) => count > 0);
}

/** e.g. `2 errors, 3 warnings`, omitting severities that aren't present. */
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

function SeverityBadge({ children, variant }: { children: string; variant: DisplayVariant }) {
  return (
    <Badge className="py-1 font-mono text-sm leading-none uppercase" variant={variant}>
      {children}
    </Badge>
  );
}

function ProblemDetails({ problem }: { problem: ThemeProblem }) {
  return (
    <div className="mt-3 space-y-3">
      <div dangerouslySetInnerHTML={{ __html: problem.details }} className={DETAILS_HTML} />
      {problem.failures?.length > 0 && (
        <div>
          <h6 className="mb-1 text-base font-semibold text-muted-foreground">Affected files</h6>
          <ul className={FAILURE_LIST}>
            {problem.failures.map((failure) => (
              <li key={`${failure.ref}-${failure.message || ''}`}>
                <code>{failure.ref}</code>
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

  // An explicit colour: the cascade would give this row the translucent
  // border token, which disappears against an opaque card in dark mode.
  return (
    <AccordionItem className="border-border-default last:border-b-0" value={value}>
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
    <div className="flex flex-col gap-2 border-b border-border-default p-5 last:border-b-0">
      <div className="flex items-center gap-3">
        <SeverityBadge variant="destructive">{errorLabel}</SeverityBadge>
      </div>
      <p className="text-base font-semibold text-foreground">{message}</p>
    </div>
  );
}

export const THEME_PROBLEM_LIST_TESTID = 'theme-problem-list';

/**
 * `errorLabel` names an error-severity row, so a dialog showing two lists can
 * say which one blocked it: `Blocking` vs. plain `Error`.
 */
export function ValidationProblemList({
  errorLabel = 'Error',
  expandedByDefault = false,
  messages = [],
  problems,
}: {
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
    <div
      className="overflow-hidden rounded-lg border border-border-default"
      data-testid={THEME_PROBLEM_LIST_TESTID}
    >
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

export function ThemeValidationIssueList({ problems }: { problems: ThemeProblem[] }) {
  if (!problems.length) {
    return null;
  }

  const counts = countBySeverity(problems);
  // The heading reads severity, not count, so the icon has to match it: amber
  // is only right when the set is warnings and recommendations alone.
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
