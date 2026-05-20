import {useComputedValue} from './use-computed-value';

type Step = {name: string; cssVar: string; sample?: string};

const DEFAULT_SAMPLE = 'The quick brown fox jumps over the lazy dog';

function ScaleRow({step}: {step: Step}) {
    const computed = useComputedValue(step.cssVar);
    return (
        <div className="flex flex-col gap-2 border-b border-border-subtle py-4 last:border-b-0 sm:flex-row sm:items-baseline sm:gap-6">
            <div className="flex w-40 shrink-0 flex-col gap-0.5">
                <code className="text-sm font-medium text-text-primary">{step.name}</code>
                <code className="text-2xs text-text-secondary">{step.cssVar}</code>
                <code className="text-2xs text-text-tertiary">{computed || '—'}</code>
            </div>
            <p
                className="text-text-primary"
                style={{fontSize: `var(${step.cssVar})`, lineHeight: 'var(--leading-tight)'}}
            >
                {step.sample ?? DEFAULT_SAMPLE}
            </p>
        </div>
    );
}

export function TypeScale({steps}: {steps: Step[]}) {
    return (
        <section className="flex flex-col">
            {steps.map(step => <ScaleRow key={step.cssVar} step={step} />)}
        </section>
    );
}

type Family = {name: string; cssVar: string};

export function FontFamilies({families}: {families: Family[]}) {
    return (
        <section className="flex flex-col gap-4">
            {families.map(f => (
                <div key={f.cssVar} className="flex flex-col gap-2 border-b border-border-subtle pb-4 last:border-b-0">
                    <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium text-text-primary">{f.name}</span>
                        <code className="text-2xs text-text-secondary">{f.cssVar}</code>
                    </div>
                    <p
                        className="text-text-primary"
                        style={{fontFamily: `var(${f.cssVar})`, fontSize: 'var(--text-2xl)', lineHeight: 'var(--leading-tight)'}}
                    >
                        {DEFAULT_SAMPLE}
                    </p>
                </div>
            ))}
        </section>
    );
}

type Leading = {name: string; cssVar: string};

export function LeadingScale({values}: {values: Leading[]}) {
    return (
        <section className="grid gap-6 sm:grid-cols-2">
            {values.map(v => (
                <div key={v.cssVar} className="flex flex-col gap-2 rounded-md border border-border-default p-4">
                    <div className="flex items-baseline justify-between gap-2">
                        <code className="text-sm font-medium text-text-primary">{v.name}</code>
                        <code className="text-2xs text-text-secondary">{v.cssVar}</code>
                    </div>
                    <p
                        className="text-text-primary"
                        style={{fontSize: 'var(--text-base)', lineHeight: `var(${v.cssVar})`}}
                    >
                        Each token controls the vertical rhythm of body and heading text. The same paragraph rendered at different line-heights shows how the rhythm shifts.
                    </p>
                </div>
            ))}
        </section>
    );
}
