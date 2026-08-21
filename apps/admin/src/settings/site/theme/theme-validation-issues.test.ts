import {describeThemeOutcome, fatalErrorsSchema, getIssuesFromFatalErrors, getIssuesFromInstalledTheme, parseFatalErrors, sortBySeverity} from './theme-validation-issues';
import {type InstalledTheme, type ThemeProblem} from '@tryghost/admin-x-framework/api/themes';

const problem = {
    code: 'GS030-NO-DEFAULT-TEMPLATE',
    details: 'The theme must have a default.hbs template.',
    failures: [{ref: 'default.hbs'}],
    fatal: true,
    level: 'error' as const,
    rule: 'A default template is required.'
};

/** A problem at an arbitrary severity, for the display-level helpers. */
function themeProblem(level: string, code = 'GS000'): ThemeProblem {
    return {code, level, rule: 'rule', details: 'details', failures: [], fatal: false} as unknown as ThemeProblem;
}

describe('fatalErrorsSchema', () => {
    it('parses string and structured validation details', () => {
        const result = fatalErrorsSchema.safeParse([
            {details: 'Missing default.hbs'},
            {details: {errors: [problem]}}
        ]);

        expect(result.success).toBe(true);

        if (result.success) {
            expect(getIssuesFromFatalErrors(result.data)).toEqual({
                blockingProblems: [problem],
                secondaryProblems: [],
                stringErrors: ['Missing default.hbs']
            });
        }
    });

    it('rejects malformed theme problems', () => {
        const result = fatalErrorsSchema.safeParse([
            {details: {errors: [{...problem, fatal: 'yes'}]}}
        ]);

        expect(result.success).toBe(false);
    });

    it('does not treat empty or non-blocking payloads as fatal errors', () => {
        expect(parseFatalErrors([])).toBeNull();
        expect(parseFatalErrors([{details: {}}])).toBeNull();
        expect(parseFatalErrors([{
            details: {
                warnings: [{...problem, fatal: false, level: 'warning'}]
            }
        }])).toBeNull();
        expect(parseFatalErrors([{details: '   '}])).toBeNull();
    });
});

describe('describeThemeOutcome', () => {
    it('reports a clean install', () => {
        expect(describeThemeOutcome('uploaded', [])).toBe('uploaded successfully');
    });

    it('calls a warnings-only set warnings', () => {
        expect(describeThemeOutcome('uploaded', [themeProblem('warning'), themeProblem('recommendation')]))
            .toBe('uploaded, but it has some warnings');
    });

    it('calls a set containing an error issues, so it cannot contradict the issue list', () => {
        expect(describeThemeOutcome('uploaded', [themeProblem('error'), themeProblem('warning')]))
            .toBe('uploaded, but it has some issues');
    });

    it('carries the caller\'s verb', () => {
        expect(describeThemeOutcome('saved', [])).toBe('saved successfully');
        expect(describeThemeOutcome('installed', [themeProblem('warning')])).toBe('installed, but it has some warnings');
    });

    it('treats a theme\'s merged errors and warnings as one set', () => {
        const theme = {
            name: 'mytheme',
            errors: [themeProblem('error')],
            warnings: [themeProblem('warning')]
        } as unknown as InstalledTheme;

        expect(describeThemeOutcome('uploaded', getIssuesFromInstalledTheme(theme)))
            .toBe('uploaded, but it has some issues');
    });
});

describe('sortBySeverity', () => {
    it('orders errors before warnings before recommendations', () => {
        const sorted = sortBySeverity([
            themeProblem('recommendation', 'REC'),
            themeProblem('warning', 'WARN'),
            themeProblem('error', 'ERR')
        ]);

        expect(sorted.map(item => item.code)).toEqual(['ERR', 'WARN', 'REC']);
    });
});
