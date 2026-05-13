import {useComputedValue} from './use-computed-value';

type Radius = {name: string; cssVar: string};

function RadiusCard({radius}: {radius: Radius}) {
    const computed = useComputedValue(radius.cssVar);
    return (
        <div className="flex flex-col gap-2">
            <div
                className="h-24 w-full border border-border-default bg-surface-elevated"
                style={{borderRadius: `var(${radius.cssVar})`}}
                aria-hidden
            />
            <div className="flex flex-col gap-0.5">
                <code className="text-sm font-medium text-text-primary">{radius.name}</code>
                <code className="text-2xs text-text-secondary">{radius.cssVar}</code>
                <code className="text-2xs text-text-tertiary">{computed || '—'}</code>
            </div>
        </div>
    );
}

export function RadiusGrid({title, description, radii}: {
    title: string;
    description?: string;
    radii: Radius[];
}) {
    return (
        <section className="flex flex-col gap-4">
            <header className="flex flex-col gap-1">
                <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
                {description && <p className="text-sm text-text-secondary">{description}</p>}
            </header>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {radii.map(r => <RadiusCard key={r.cssVar} radius={r} />)}
            </div>
        </section>
    );
}
