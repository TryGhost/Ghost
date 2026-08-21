import {
  fatalErrorsSchema,
  getIssuesFromFatalErrors,
  parseFatalErrors,
} from './theme-validation-issues';

const problem = {
  code: 'GS030-NO-DEFAULT-TEMPLATE',
  details: 'The theme must have a default.hbs template.',
  failures: [{ ref: 'default.hbs' }],
  fatal: true,
  level: 'error' as const,
  rule: 'A default template is required.',
};

describe('fatalErrorsSchema', () => {
  it('parses string and structured validation details', () => {
    const result = fatalErrorsSchema.safeParse([
      { details: 'Missing default.hbs' },
      { details: { errors: [problem] } },
    ]);

    expect(result.success).toBe(true);

    if (result.success) {
      expect(getIssuesFromFatalErrors(result.data)).toEqual({
        blockingProblems: [problem],
        secondaryProblems: [],
        stringErrors: ['Missing default.hbs'],
      });
    }
  });

  it('rejects malformed theme problems', () => {
    const result = fatalErrorsSchema.safeParse([
      { details: { errors: [{ ...problem, fatal: 'yes' }] } },
    ]);

    expect(result.success).toBe(false);
  });

  it('does not treat empty or non-blocking payloads as fatal errors', () => {
    expect(parseFatalErrors([])).toBeNull();
    expect(parseFatalErrors([{ details: {} }])).toBeNull();
    expect(
      parseFatalErrors([
        {
          details: {
            warnings: [{ ...problem, fatal: false, level: 'warning' }],
          },
        },
      ]),
    ).toBeNull();
    expect(parseFatalErrors([{ details: '   ' }])).toBeNull();
  });
});
