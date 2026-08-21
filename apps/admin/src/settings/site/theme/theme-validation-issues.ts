import {type InstalledTheme, type ThemeProblem} from '@tryghost/admin-x-framework/api/themes';
import {z} from 'zod';

const themeProblemSchema = z.object({
    code: z.string(),
    details: z.string(),
    failures: z.array(z.object({
        ref: z.string(),
        message: z.string().optional(),
        rule: z.string().optional()
    })),
    fatal: z.boolean(),
    level: z.enum(['error', 'warning', 'recommendation']),
    rule: z.string()
});

const themeValidationErrorDetailsSchema = z.object({
    errors: z.array(themeProblemSchema).optional(),
    warnings: z.array(themeProblemSchema).optional()
});

export const fatalErrorsSchema = z.array(z.object({
    details: z.union([themeValidationErrorDetailsSchema, z.string().trim().min(1)])
}));

type ThemeValidationErrorDetails = z.infer<typeof themeValidationErrorDetailsSchema>;
type ThemeValidationError = z.infer<typeof fatalErrorsSchema>[number];

export type FatalErrors = z.infer<typeof fatalErrorsSchema>;

type IssueSummary = {
    blockingProblems: ThemeProblem[];
    secondaryProblems: ThemeProblem[];
    stringErrors: string[];
};

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

export function parseFatalErrors(data: unknown): FatalErrors | null {
    const parsed = fatalErrorsSchema.safeParse(data);

    if (!parsed.success) {
        return null;
    }

    const {blockingProblems, stringErrors} = getIssuesFromFatalErrors(parsed.data);
    return blockingProblems.length > 0 || stringErrors.length > 0 ? parsed.data : null;
}

export function getIssuesFromInstalledTheme(installedTheme: InstalledTheme): ThemeProblem[] {
    return [...(installedTheme.errors || []), ...(installedTheme.warnings || [])];
}
