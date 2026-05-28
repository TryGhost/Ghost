import type {Meta, StoryObj} from '@storybook/react-vite';
import {ChevronDown, X} from 'lucide-react';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger} from '@/components/ui/dialog';
import {cn} from '@/lib/utils';
import {useEffect, useState} from 'react';

type ValidationMode = 'development' | 'production';
type ValidationScenario = 'custom' | 'fatal-multiple-fatal-errors' | 'fatal-many-affected-files' | 'fatal-many-non-blocking-issues' | 'fatal-one-non-blocking-issue' | 'fatal-no-non-blocking-issues' | 'success-many-non-blocking-issues' | 'success-one-non-blocking-issue' | 'success-no-issues';
type ValidationOutcome = 'fatal' | 'success';
type FatalFiles = 'one' | 'many';
type ValidationSeverity = 'error' | 'warning' | 'recommendation';

type StoryArgs = {
    additionalIssues: number;
    fatalFiles: FatalFiles;
    mode: ValidationMode;
    numFatals: number;
    outcome: ValidationOutcome;
    scenario: ValidationScenario;
};

type ValidationIssue = {
    code: string;
    details: string;
    fatal?: boolean;
    ref: string;
    rule: string;
    severity: ValidationSeverity;
};

const fatalIssue: ValidationIssue = {
    code: 'GS005-TPL-COMPILATION-ERR',
    details: 'Ghost could not compile this template. Fix the syntax error before saving or activating the theme.',
    fatal: true,
    ref: 'default.hbs',
    rule: 'Template syntax must be valid',
    severity: 'error'
};

const missingIndexIssue: ValidationIssue = {
    code: 'GS020-INDEX-REQ',
    details: 'Your theme must have a template file called index.hbs.',
    fatal: true,
    ref: 'index.hbs',
    rule: 'A template file called index.hbs must be present',
    severity: 'error'
};

const missingPostIssue: ValidationIssue = {
    code: 'GS020-POST-REQ',
    details: 'Your theme must have a template file called post.hbs.',
    fatal: true,
    ref: 'post.hbs',
    rule: 'A template file called post.hbs must be present',
    severity: 'error'
};

const fatalManyFilesIssue: ValidationIssue = {
    code: 'GS005-TPL-ERR',
    details: 'Several templates contain invalid Handlebars syntax and could not be compiled.',
    fatal: true,
    ref: 'index.hbs, post.hbs, page.hbs, tag.hbs',
    rule: 'Templates must contain valid Handlebars',
    severity: 'error'
};

const fatalIssueTemplates: ValidationIssue[] = [
    fatalIssue,
    missingIndexIssue,
    missingPostIssue,
    {
        code: 'GS005-NO-INLINE-DYNAMIC-PARTIAL',
        details: 'Inline dynamic partials can throw a page error when the named partial does not exist.',
        fatal: true,
        ref: 'partials/card.hbs',
        rule: 'Use the block form for dynamic partials',
        severity: 'error'
    },
    {
        code: 'GS030-ASSET-SYM',
        details: 'Symbolic links in themes are not allowed. Use regular files and the asset helper instead.',
        fatal: true,
        ref: 'assets/css/screen.css',
        rule: 'Symlinks in themes are not allowed',
        severity: 'error'
    }
];

const manyAffectedFileRefs = 'index.hbs, post.hbs, page.hbs, tag.hbs';

const secondaryIssues: ValidationIssue[] = [
    {
        code: 'GS001-DEPR-TWITTER-URL',
        details: 'The twitter URL helper is deprecated. Use the social URL helper instead.',
        ref: 'default.hbs',
        rule: 'Replace {{twitter_url}} with {{social_url type="twitter"}}',
        severity: 'recommendation'
    },
    {
        code: 'GS040-GH-REQ',
        details: 'The ghost_head helper is required for scripts, metadata, and structured data.',
        ref: 'default.hbs',
        rule: 'The helper {{ghost_head}} should be present',
        severity: 'recommendation'
    },
    {
        code: 'GS040-GF-REQ',
        details: 'The ghost_foot helper is required for scripts injected before the closing body tag.',
        ref: 'default.hbs',
        rule: 'The helper {{ghost_foot}} should be present',
        severity: 'recommendation'
    },
    {
        code: 'GS050-CSS-KGWW',
        details: 'Wide Koenig cards may not render correctly without styling for this class.',
        ref: 'assets/css/screen.css',
        rule: 'The .kg-width-wide CSS class is required to appear styled in your theme',
        severity: 'warning'
    },
    {
        code: 'GS051-CUSTOM-FONTS',
        details: 'Add support for Ghost custom font variables so publication typography controls work correctly.',
        ref: 'assets/css/screen.css',
        rule: 'Missing support for custom fonts',
        severity: 'recommendation'
    },
    {
        code: 'GS110-PAGE-BUILDER-USAGE',
        details: 'Respect the page builder title and feature-image visibility setting in page templates.',
        ref: 'page.hbs',
        rule: 'Support the {{@page.show_title_and_feature_image}} editor setting',
        severity: 'recommendation'
    }
];

const meta = {
    title: 'Spikes / Theme Validation Modal',
    args: {
        additionalIssues: 6,
        fatalFiles: 'one',
        mode: 'production',
        numFatals: 1,
        outcome: 'fatal',
        scenario: 'custom'
    },
    parameters: {
        layout: 'fullscreen',
        docs: {
            description: {
                component: 'Draft theme validation modal treatments. These are deliberately story-only so we can compare volume, tone, and footer behavior before wiring the production UI.'
            }
        }
    },
    argTypes: {
        mode: {
            control: {type: 'inline-radio'},
            options: ['development', 'production']
        },
        scenario: {
            control: {type: 'select'},
            description: 'Preset scenario. Choose custom to use the controls below.',
            options: ['custom', 'fatal-multiple-fatal-errors', 'fatal-many-affected-files', 'fatal-many-non-blocking-issues', 'fatal-one-non-blocking-issue', 'fatal-no-non-blocking-issues', 'success-many-non-blocking-issues', 'success-one-non-blocking-issue', 'success-no-issues'],
            labels: {
                custom: 'Custom controls',
                'fatal-multiple-fatal-errors': 'Fatal: multiple fatal errors',
                'fatal-many-affected-files': 'Fatal: one fatal error, many affected files',
                'fatal-many-non-blocking-issues': 'Fatal: one fatal error + many non-blocking issues',
                'fatal-one-non-blocking-issue': 'Fatal: one fatal error + one non-blocking issue',
                'fatal-no-non-blocking-issues': 'Fatal: one fatal error only',
                'success-many-non-blocking-issues': 'Success: many non-blocking issues',
                'success-one-non-blocking-issue': 'Success: one non-blocking issue',
                'success-no-issues': 'Success: no issues'
            }
        },
        outcome: {
            control: {type: 'inline-radio'},
            description: 'Used when scenario is custom.',
            options: ['fatal', 'success']
        },
        numFatals: {
            control: {max: 5, min: 1, step: 1, type: 'range'},
            description: 'Number of blocking errors to show when scenario is custom and outcome is fatal.'
        },
        fatalFiles: {
            control: {type: 'inline-radio'},
            description: 'Whether each custom fatal error shows one affected file or many affected files.',
            options: ['one', 'many']
        },
        additionalIssues: {
            control: {max: 10, min: 0, step: 1, type: 'range'},
            description: 'Number of non-blocking issues to show when scenario is custom.'
        }
    }
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

function getSecondaryIssues(count: number) {
    return Array.from({length: count}, (_, index) => {
        const issue = secondaryIssues[index % secondaryIssues.length];

        if (index < secondaryIssues.length) {
            return issue;
        }

        return {
            ...issue,
            code: `${issue.code}-${index + 1}`
        };
    });
}

function getCustomBlockingIssues(numFatals: number, fatalFiles: FatalFiles) {
    return fatalIssueTemplates.slice(0, Math.max(1, Math.min(numFatals, 5))).map((issue, index) => ({
        ...issue,
        ref: fatalFiles === 'many' ? manyAffectedFileRefs : issue.ref,
        ...(index >= fatalIssueTemplates.length ? {code: `${issue.code}-${index + 1}`} : {})
    }));
}

function getScenario({additionalIssues = 1, fatalFiles = 'one', numFatals = 1, outcome = 'fatal', scenario = 'custom'}: Partial<StoryArgs>) {
    if (scenario === 'custom') {
        const blockingIssues = outcome === 'fatal' ? getCustomBlockingIssues(numFatals, fatalFiles) : [];

        return {
            blockingIssues,
            secondaryIssues: getSecondaryIssues(Math.max(0, Math.min(additionalIssues, 10))),
            status: blockingIssues.length > 0 ? 'fatal' : 'success'
        } as const;
    }

    const hasFatal = scenario.startsWith('fatal');
    const many = scenario.includes('many-non-blocking');
    const multipleFatal = scenario === 'fatal-multiple-fatal-errors';
    const manyAffectedFiles = scenario === 'fatal-many-affected-files';
    const noNonBlockingIssues = scenario.includes('no-non-blocking') || scenario === 'success-no-issues' || manyAffectedFiles || multipleFatal;
    const nonBlockingIssues = noNonBlockingIssues ? [] : secondaryIssues.slice(0, many ? secondaryIssues.length : 1);

    return {
        blockingIssues: hasFatal ? (multipleFatal ? [missingIndexIssue, missingPostIssue] : [manyAffectedFiles ? fatalManyFilesIssue : fatalIssue].flat()) : [],
        secondaryIssues: nonBlockingIssues,
        status: hasFatal ? 'fatal' : 'success'
    } as const;
}

function severityLabel(issue: ValidationIssue) {
    if (issue.fatal) {
        return 'Error';
    }

    if (issue.severity === 'warning') {
        return 'Warning';
    }

    return 'Recommendation';
}

function severityVariant(issue: ValidationIssue): 'destructive' | 'warning' | 'secondary' {
    if (issue.fatal) {
        return 'destructive';
    }

    if (issue.severity === 'warning') {
        return 'warning';
    }

    return 'secondary';
}

function severitySortValue(issue: ValidationIssue) {
    if (issue.fatal) {
        return 0;
    }

    if (issue.severity === 'warning') {
        return 1;
    }

    if (issue.severity === 'recommendation') {
        return 2;
    }

    return 3;
}

function sortValidationIssues(issues: ValidationIssue[]) {
    return [...issues].sort((a, b) => severitySortValue(a) - severitySortValue(b));
}

function PreviewLink() {
    return <a className='font-semibold text-foreground hover:underline' href='https://example.com' rel='noreferrer' target='_blank'>Take a look →</a>;
}

function ModalCloseButton({onClick}: {onClick?: () => void}) {
    return (
        <DialogClose asChild>
            <Button className='absolute top-3 right-3 cursor-pointer p-2 text-muted-foreground hover:text-foreground [&_svg]:size-6!' size='lg' title='Close' variant='link' onClick={onClick}>
                <X size={24} strokeWidth={1} />
                <span className='sr-only'>Close</span>
            </Button>
        </DialogClose>
    );
}

function IssueRow({issue, prominent = false}: {issue: ValidationIssue; prominent?: boolean}) {
    const [open, setOpen] = useState(prominent);

    return (
        <div className={cn('rounded-lg border bg-background', prominent ? 'border-destructive/25' : 'border-border')}>
            <button className='flex w-full items-start justify-between gap-4 p-4 text-left' type='button' onClick={() => setOpen(!open)}>
                <div className='min-w-0 space-y-2'>
                    <div className='flex flex-wrap items-center gap-2'>
                        <Badge variant={severityVariant(issue)}>{severityLabel(issue)}</Badge>
                        <span className='text-xs text-muted-foreground'>{issue.code}</span>
                    </div>
                    <div className='text-sm font-medium text-foreground'>{issue.rule}</div>
                </div>
                <ChevronDown className={cn('mt-1 size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
            </button>
            {open && (
                <div className='border-t border-border px-4 pt-3 pb-4 text-sm text-muted-foreground'>
                    <p>{issue.details}</p>
                    <p className='mt-3 text-xs uppercase'>Affected files</p>
                    <div className='mt-1 flex flex-wrap gap-1.5'>
                        {issue.ref.split(',').map(ref => (
                            <code key={ref.trim()} className='inline-block rounded bg-muted px-1.5 py-1 text-xs text-foreground'>{ref.trim()}</code>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function SecondaryIssues({defaultOpen, issues}: {defaultOpen: boolean; issues: ValidationIssue[]}) {
    const [open, setOpen] = useState(defaultOpen);
    const sortedIssues = sortValidationIssues(issues);

    useEffect(() => {
        setOpen(defaultOpen);
    }, [defaultOpen]);

    if (!issues.length) {
        return null;
    }

    return (
        <div className='border-t border-border pt-5'>
            <button className='flex w-full items-center justify-between gap-4 rounded-lg border border-border bg-background p-4 text-left hover:bg-muted/40' type='button' onClick={() => setOpen(!open)}>
                <div>
                    <div className='font-semibold text-foreground'>Review {issues.length} non-blocking {issues.length === 1 ? 'issue' : 'issues'}</div>
                    <div className='mt-1 text-sm text-muted-foreground'>{open ? 'Hide details' : 'Show details'}</div>
                </div>
                <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
            </button>
            {open && (
                <div className='mt-4 space-y-3'>
                    {sortedIssues.map(issue => <IssueRow key={issue.code} issue={issue} />)}
                </div>
            )}
        </div>
    );
}

function DraftThemeValidationModal({additionalIssues, fatalFiles, mode, numFatals, outcome, scenario}: StoryArgs) {
    const {blockingIssues, secondaryIssues: nonBlockingIssues, status} = getScenario({additionalIssues, fatalFiles, numFatals, outcome, scenario});
    const isFatal = status === 'fatal';
    const defaultOpen = mode === 'development';
    const title = isFatal ? 'Theme not saved' : 'It\'s live!';
    const blockingIssueCount = blockingIssues.length;

    return (
        <Dialog open>
            <DialogContent className='flex max-h-[calc(100vh-16vmin)] max-w-[540px] flex-col gap-0 overflow-hidden p-0'>
                <ModalCloseButton />
                <DialogHeader className='p-8 pb-6 text-left'>
                    <DialogTitle className={cn('text-3xl leading-[1.15em] font-bold', isFatal ? 'text-foreground' : 'text-state-success')}>{title}</DialogTitle>
                    <DialogDescription className='mt-3 text-lg leading-normal text-foreground'>
                        {isFatal ? (
                            <>Ghost found {blockingIssueCount === 1 ? 'a blocking validation error' : `${blockingIssueCount} blocking validation errors`} and did not save your theme. Fix {blockingIssueCount === 1 ? 'the issue' : 'the issues'} below and try again.</>
                        ) : (
                            <>Your theme <strong>validation-preview-theme</strong> was saved successfully and is now visible to your readers. <PreviewLink /></>
                        )}
                    </DialogDescription>
                </DialogHeader>

                <div className='min-h-0 flex-1 space-y-5 overflow-y-auto px-8 pb-6'>
                    {blockingIssues.length > 0 && (
                        <div className='space-y-3'>
                            {blockingIssues.map(issue => <IssueRow key={issue.code} issue={issue} prominent />)}
                        </div>
                    )}

                    <SecondaryIssues defaultOpen={defaultOpen} issues={nonBlockingIssues} />
                </div>

                <DialogFooter className='sticky bottom-0 border-t border-border bg-background/95 px-8 py-5 backdrop-blur'>
                    <Button variant='outline'>Close</Button>
                    <Button>{isFatal ? 'Retry' : 'OK'}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function TriggeredDraftThemeValidationModal({additionalIssues, fatalFiles, mode, numFatals, outcome, scenario}: StoryArgs) {
    const [open, setOpen] = useState(false);
    const {blockingIssues, secondaryIssues: nonBlockingIssues, status} = getScenario({additionalIssues, fatalFiles, numFatals, outcome, scenario});
    const isFatal = status === 'fatal';
    const defaultOpen = mode === 'development';
    const title = isFatal ? 'Theme not saved' : 'It\'s live!';
    const blockingIssueCount = blockingIssues.length;

    return (
        <div className='p-8'>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button>Open draft modal</Button>
                </DialogTrigger>
                <DialogContent className='flex max-h-[calc(100vh-16vmin)] max-w-[540px] flex-col gap-0 overflow-hidden p-0'>
                    <ModalCloseButton onClick={() => setOpen(false)} />
                    <DialogHeader className='p-8 pb-6 text-left'>
                        <DialogTitle className={cn('text-3xl leading-[1.15em] font-bold', isFatal ? 'text-foreground' : 'text-state-success')}>{title}</DialogTitle>
                        <DialogDescription className='mt-3 text-lg leading-normal text-foreground'>
                            {isFatal ? <>Ghost found {blockingIssueCount === 1 ? 'a blocking validation error' : `${blockingIssueCount} blocking validation errors`} and did not save your theme. Fix {blockingIssueCount === 1 ? 'the issue' : 'the issues'} below and try again.</> : <>Your theme <strong>validation-preview-theme</strong> was saved successfully and is now visible to your readers. <PreviewLink /></>}
                        </DialogDescription>
                    </DialogHeader>
                    <div className='min-h-0 flex-1 space-y-5 overflow-y-auto px-8 pb-6'>
                        {blockingIssues.length > 0 && (
                            <div className='space-y-3'>
                                {blockingIssues.map(issue => <IssueRow key={issue.code} issue={issue} prominent />)}
                            </div>
                        )}
                        <SecondaryIssues defaultOpen={defaultOpen} issues={nonBlockingIssues} />
                    </div>
                    <DialogFooter className='sticky bottom-0 border-t border-border bg-background/95 px-8 py-5 backdrop-blur'>
                        <Button variant='outline' onClick={() => setOpen(false)}>Close</Button>
                        <Button onClick={() => setOpen(false)}>{isFatal ? 'Retry' : 'OK'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export const Playground: Story = {
    args: {
        additionalIssues: 6,
        fatalFiles: 'one',
        mode: 'production',
        numFatals: 1,
        outcome: 'fatal',
        scenario: 'custom'
    },
    render: args => <DraftThemeValidationModal {...args} />
};

export const Triggered: Story = {
    args: {
        additionalIssues: 6,
        fatalFiles: 'one',
        mode: 'production',
        numFatals: 1,
        outcome: 'fatal',
        scenario: 'custom'
    },
    render: args => <TriggeredDraftThemeValidationModal {...args} />
};

export const FatalMultipleFatalErrors: Story = {
    args: {
        mode: 'production',
        scenario: 'fatal-multiple-fatal-errors'
    },
    render: args => <DraftThemeValidationModal {...args} />
};

export const FatalManyAffectedFiles: Story = {
    args: {
        mode: 'production',
        scenario: 'fatal-many-affected-files'
    },
    render: args => <DraftThemeValidationModal {...args} />
};

export const FatalManyNonBlockingIssues: Story = {
    args: {
        mode: 'production',
        scenario: 'fatal-many-non-blocking-issues'
    },
    render: args => <DraftThemeValidationModal {...args} />
};

export const SuccessManyNonBlockingIssues: Story = {
    args: {
        mode: 'production',
        scenario: 'success-many-non-blocking-issues'
    },
    render: args => <DraftThemeValidationModal {...args} />
};

export const SuccessNoIssues: Story = {
    args: {
        mode: 'production',
        scenario: 'success-no-issues'
    },
    render: args => <DraftThemeValidationModal {...args} />
};
