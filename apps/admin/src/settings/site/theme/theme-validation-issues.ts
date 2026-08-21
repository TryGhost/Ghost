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

/*
 * Display layer. Everything above turns an API payload into buckets of
 * `ThemeProblem`; everything below classifies those problems for the UI that
 * renders them.
 */

export type DisplaySeverity = 'Error' | 'Warning' | 'Recommendation';

/** Most to least severe — drives both the list order and the summary order. */
export const SEVERITY_ORDER: DisplaySeverity[] = ['Error', 'Warning', 'Recommendation'];

export function getDisplaySeverity(problem: ThemeProblem): DisplaySeverity {
  if (problem.level === 'warning') {
    return 'Warning';
  }

  if (problem.level === 'recommendation') {
    return 'Recommendation';
  }

  return 'Error';
}

export function sortBySeverity(problems: ThemeProblem[]): ThemeProblem[] {
  return [...problems].sort(
    (a, b) =>
      SEVERITY_ORDER.indexOf(getDisplaySeverity(a)) - SEVERITY_ORDER.indexOf(getDisplaySeverity(b)),
  );
}

/**
 * Whether a set of problems contains anything Ghost displays as an error. The
 * single answer to that question: copy, badges and button labels all read it,
 * so none of them can classify a set differently from the list beside them.
 */
export function hasErrorProblem(problems: ThemeProblem[]): boolean {
  return problems.some((problem) => getDisplaySeverity(problem) === 'Error');
}

/**
 * Completes "<theme> was ..." for a theme that installed successfully but may
 * carry non-blocking problems. `errors` and `warnings` are merged by
 * `getIssuesFromInstalledTheme`, so the phrase has to look at the levels
 * rather than the count: calling a set that contains errors "warnings"
 * contradicts the issue list rendered directly beneath it.
 */
export function describeThemeOutcome(action: string, problems: ThemeProblem[]): string {
  if (!problems.length) {
    return `${action} successfully`;
  }

  return `${action}, but it has some ${hasErrorProblem(problems) ? 'issues' : 'warnings'}`;
}
