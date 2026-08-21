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
 * Ghost's legacy Ember stylesheet ships an unlayered `code, tt` rule that gives
 * every `<code>` in Admin a bordered grey chip with pink text. A bare element
 * selector loses to any class, so each property it sets has to be answered
 * explicitly — including `border-radius`, `vertical-align` and `line-height`,
 * whose absence reads as baseline drift rather than an obvious box.
 *
 * Written once and applied to `<code>` descendants, so inline mono looks the
 * same whether the markup came from gscan or from us. Class names are spelled
 * out in full rather than assembled, because Tailwind only generates the
 * utilities it can find literally in the source.
 */
const CODE_RESET =
  '[&_code]:rounded-none [&_code]:border-0 [&_code]:bg-transparent [&_code]:p-0 [&_code]:align-baseline [&_code]:font-mono [&_code]:text-inherit [&_code]:leading-[inherit]';

/**
 * A bare `font-family: monospace` drops to the browser's mono default, which
 * reads a size smaller, so the size of the surrounding text is restated.
 */
const CODE_SIZE = {
  base: '[&_code]:text-base',
  sm: '[&_code]:text-sm',
} as const;

/** The reset, at the size of the text the code sits in. */
function codeStyles(size: keyof typeof CODE_SIZE): string {
  return `${CODE_RESET} ${CODE_SIZE[size]}`;
}

/**
 * gscan writes `rule` and `details` as HTML containing `<code>`, `<br>` and
 * `<a>`. We render it verbatim, so inline code is styled through those
 * descendants rather than by touching the markup.
 */
const RULE_HTML = `text-base leading-[1.45] font-semibold text-foreground ${codeStyles('base')}`;
const DETAILS_HTML = `text-sm leading-[1.45] text-foreground [&_a]:underline ${codeStyles('sm')}`;

/**
 * A filename is inline mono like any other, so it carries no chip: the same
 * reset the details above it get, at the same size.
 */
const FAILURE_LIST = `space-y-1 text-sm text-muted-foreground ${codeStyles('sm')}`;

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

function SeverityBadge({ children, variant }: { children: string; variant: DisplayVariant }) {
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

  // Shade's own `border-b` leaves the colour to the cascade. A row divider
  // inside an opaque card takes the opaque token, not the translucent one
  // floating surfaces composite with — which reads as a missing line in dark
  // mode.
  return (
    <AccordionItem className="border-border-default last:border-b-0" value={value}>
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
    <div className="flex flex-col gap-2 border-b border-border-default p-5 last:border-b-0">
      <div className="flex items-center gap-3">
        <SeverityBadge variant="destructive">{errorLabel}</SeverityBadge>
      </div>
      <p className="text-base font-semibold text-foreground">{message}</p>
    </div>
  );
}

/**
 * Names the bordered container so tests can address a whole list — and tell
 * two of them apart — without reaching for the utility classes that draw it.
 */
export const THEME_PROBLEM_LIST_TESTID = 'theme-problem-list';

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
