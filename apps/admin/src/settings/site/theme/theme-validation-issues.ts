import { type InstalledTheme, type ThemeProblem } from '@tryghost/admin-x-framework/api/themes';
import { z } from 'zod';

const themeProblemSchema = z.object({
  code: z.string(),
  details: z.string(),
  failures: z.array(
    z.object({
      ref: z.string(),
      message: z.string().optional(),
      rule: z.string().optional(),
    }),
  ),
  fatal: z.boolean(),
  level: z.enum(['error', 'warning', 'recommendation']),
  rule: z.string(),
});

const themeValidationErrorDetailsSchema = z.object({
  errors: z.array(themeProblemSchema).optional(),
  warnings: z.array(themeProblemSchema).optional(),
});

export const fatalErrorsSchema = z.array(
  z.object({
    details: z.union([themeValidationErrorDetailsSchema, z.string().trim().min(1)]),
  }),
);

type ThemeValidationErrorDetails = z.infer<typeof themeValidationErrorDetailsSchema>;
type ThemeValidationError = z.infer<typeof fatalErrorsSchema>[number];

export type FatalErrors = z.infer<typeof fatalErrorsSchema>;

type IssueSummary = {
  blockingProblems: ThemeProblem[];
  secondaryProblems: ThemeProblem[];
  stringErrors: string[];
};

function isDetailsObject(
  details: ThemeValidationError['details'],
): details is ThemeValidationErrorDetails {
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

  return { blockingProblems, secondaryProblems, stringErrors };
}

export function parseFatalErrors(data: unknown): FatalErrors | null {
  const parsed = fatalErrorsSchema.safeParse(data);

  if (!parsed.success) {
    return null;
  }

  const { blockingProblems, stringErrors } = getIssuesFromFatalErrors(parsed.data);
  return blockingProblems.length > 0 || stringErrors.length > 0 ? parsed.data : null;
}

export function getIssuesFromInstalledTheme(installedTheme: InstalledTheme): ThemeProblem[] {
  return [...(installedTheme.errors || []), ...(installedTheme.warnings || [])];
}

export type DisplaySeverity = 'Error' | 'Warning' | 'Recommendation';

/** The Shade `Badge` variants a severity is allowed to take. */
export type DisplayVariant = 'destructive' | 'warning' | 'secondary';

/** Most to least severe — drives both the list order and the summary order. */
export const SEVERITY_ORDER: DisplaySeverity[] = ['Error', 'Warning', 'Recommendation'];

/** Name and colour in one row per level, so a badge can never mix the two. */
const SEVERITY_DISPLAY: Record<
  ThemeProblem['level'],
  { severity: DisplaySeverity; variant: DisplayVariant }
> = {
  error: { severity: 'Error', variant: 'destructive' },
  warning: { severity: 'Warning', variant: 'warning' },
  recommendation: { severity: 'Recommendation', variant: 'secondary' },
};

function displayFor(problem: ThemeProblem) {
  return SEVERITY_DISPLAY[problem.level] ?? SEVERITY_DISPLAY.error;
}

export function getDisplaySeverity(problem: ThemeProblem): DisplaySeverity {
  return displayFor(problem).severity;
}

export function getDisplayVariant(problem: ThemeProblem): DisplayVariant {
  return displayFor(problem).variant;
}

export function sortBySeverity(problems: ThemeProblem[]): ThemeProblem[] {
  return [...problems].sort(
    (a, b) =>
      SEVERITY_ORDER.indexOf(getDisplaySeverity(a)) - SEVERITY_ORDER.indexOf(getDisplaySeverity(b)),
  );
}

export function hasErrorProblem(problems: ThemeProblem[]): boolean {
  return problems.some((problem) => getDisplaySeverity(problem) === 'Error');
}

/** Past tense of what Ghost did, or refused to do, with a theme. */
export type ThemeAction = 'uploaded' | 'installed' | 'activated' | 'saved';

/**
 * Completes "<theme> was ...". `errors` and `warnings` arrive merged, so the
 * noun reads the severities present rather than the count — a set containing
 * errors called "warnings" contradicts the list rendered beside it.
 */
export function describeThemeOutcome(action: ThemeAction, problems: ThemeProblem[]): string {
  if (!problems.length) {
    return `${action} successfully`;
  }

  return `${action}, but it has some ${hasErrorProblem(problems) ? 'issues' : 'warnings'}`;
}
