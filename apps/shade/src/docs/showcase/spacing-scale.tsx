import {useComputedValue} from './use-computed-value';

type Step = {name: string; multiplier: number};

function SpacingRow({step}: {step: Step}) {
    const baseValue = useComputedValue('--spacing');
    const widthValue = baseValue ? `calc(${baseValue} * ${step.multiplier})` : `calc(0.4rem * ${step.multiplier})`;
    return (
        <div className="flex items-center gap-4 border-b border-border-subtle py-3 last:border-b-0">
            <div className="flex w-32 shrink-0 flex-col gap-0.5">
                <code className="text-sm font-medium text-text-primary">{step.name}</code>
                <code className="text-2xs text-text-secondary">{`var(--spacing) * ${step.multiplier}`}</code>
            </div>
            <div
                className="h-3 rounded-sm bg-primary"
                style={{width: widthValue}}
                aria-hidden
            />
            <code className="text-2xs text-text-tertiary">{widthValue}</code>
        </div>
    );
}

export function SpacingScale({steps}: {steps: Step[]}) {
    return (
        <section className="flex flex-col">
            {steps.map(s => <SpacingRow key={s.name} step={s} />)}
        </section>
    );
}

export function SpacingBase() {
    const base = useComputedValue('--spacing');
    return (
        <div className="flex items-baseline gap-3 rounded-md border border-border-default bg-surface-elevated p-4">
            <code className="text-sm font-medium text-text-primary">--spacing</code>
            <span className="text-sm text-text-secondary">→</span>
            <code className="text-sm text-text-primary">{base || '0.4rem'}</code>
            <span className="ml-auto text-2xs text-text-tertiary">Every Tailwind spacing utility multiplies this base. `p-4` = base × 4.</span>
        </div>
    );
}
