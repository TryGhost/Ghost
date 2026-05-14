import {useComputedValue} from './use-computed-value';

type Swatch = {
    name: string;
    cssVar: string;
    /** Optional override label, e.g. "background" instead of "--background". */
    label?: string;
};

export function ColorSwatch({swatch}: {swatch: Swatch}) {
    const computed = useComputedValue(swatch.cssVar);
    return (
        <div className="flex flex-col gap-2">
            <div
                className="h-20 w-full rounded-md border border-border-default"
                style={{background: `var(${swatch.cssVar})`}}
                aria-hidden
            />
            <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-text-primary">{swatch.label ?? swatch.name}</span>
                <code className="text-2xs text-text-secondary">{swatch.cssVar}</code>
                <code className="text-2xs text-text-tertiary">{computed || '—'}</code>
            </div>
        </div>
    );
}

export function ColorPalette({title, description, swatches}: {
    title: string;
    description?: string;
    swatches: Swatch[];
}) {
    return (
        <section className="flex flex-col gap-4">
            <header className="flex flex-col gap-1">
                <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
                {description && <p className="text-sm text-text-secondary">{description}</p>}
            </header>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {swatches.map(s => <ColorSwatch key={s.cssVar} swatch={s} />)}
            </div>
        </section>
    );
}

export function ColorRow({title, swatches}: {title: string; swatches: Swatch[]}) {
    return (
        <section className="flex flex-col gap-3">
            <h4 className="text-sm font-semibold text-text-primary">{title}</h4>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-9">
                {swatches.map(s => (
                    <div key={s.cssVar} className="flex flex-col gap-1.5">
                        <div
                            className="h-14 w-full rounded-sm border border-border-default"
                            style={{background: `var(${s.cssVar})`}}
                            aria-hidden
                        />
                        <code className="text-2xs text-text-secondary">{s.name}</code>
                    </div>
                ))}
            </div>
        </section>
    );
}
