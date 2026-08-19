import {type InstalledTheme, type ThemeProblem} from '@tryghost/admin-x-framework/api/themes';

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
