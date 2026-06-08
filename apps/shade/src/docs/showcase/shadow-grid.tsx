type Shadow = {name: string; cssVar: string};

function ShadowCard({shadow}: {shadow: Shadow}) {
    return (
        <div className="flex flex-col gap-3">
            <div
                className="flex h-28 items-center justify-center rounded-md bg-surface-elevated text-sm text-text-tertiary"
                style={{boxShadow: `var(${shadow.cssVar})`}}
                aria-hidden
            >
                Card
            </div>
            <div className="flex flex-col gap-0.5">
                <code className="text-sm font-medium text-text-primary">{shadow.name}</code>
                <code className="text-2xs text-text-secondary">{shadow.cssVar}</code>
            </div>
        </div>
    );
}

export function ShadowGrid({shadows}: {shadows: Shadow[]}) {
    return (
        <div className="grid grid-cols-1 gap-8 p-6 sm:grid-cols-2 lg:grid-cols-3">
            {shadows.map(s => <ShadowCard key={s.cssVar} shadow={s} />)}
        </div>
    );
}
