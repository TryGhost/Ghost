import {useState} from 'react';
import {useComputedValue} from './use-computed-value';

type Duration = {name: string; cssVar: string};
type Easing = {name: string; cssVar: string};
type Animation = {name: string; cssVar: string};

function DurationCard({duration}: {duration: Duration}) {
    const value = useComputedValue(duration.cssVar);
    const [on, setOn] = useState(false);
    return (
        <div className="flex flex-col gap-3 rounded-md border border-border-default p-4">
            <div className="flex items-baseline justify-between gap-2">
                <code className="text-sm font-medium text-text-primary">{duration.name}</code>
                <code className="text-2xs text-text-secondary">{value || '—'}</code>
            </div>
            <button
                className="h-2 w-full overflow-hidden rounded-sm bg-muted text-left"
                type="button"
                onClick={() => setOn(v => !v)}
            >
                <span
                    className="block h-full bg-primary"
                    style={{
                        width: on ? '100%' : '0%',
                        transition: `width var(${duration.cssVar}) var(--ease-standard)`
                    }}
                    aria-hidden
                />
            </button>
            <span className="text-2xs text-text-tertiary">Click to toggle</span>
        </div>
    );
}

export function DurationScale({durations}: {durations: Duration[]}) {
    return (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {durations.map(d => <DurationCard key={d.cssVar} duration={d} />)}
        </section>
    );
}

function EasingCard({easing}: {easing: Easing}) {
    const [on, setOn] = useState(false);
    return (
        <div className="flex flex-col gap-3 rounded-md border border-border-default p-4">
            <div className="flex items-baseline justify-between gap-2">
                <code className="text-sm font-medium text-text-primary">{easing.name}</code>
                <code className="text-2xs text-text-secondary">{easing.cssVar}</code>
            </div>
            <button
                className="h-8 w-full overflow-hidden rounded-sm bg-muted text-left"
                type="button"
                onClick={() => setOn(v => !v)}
            >
                <span
                    className="block h-full w-8 rounded-sm bg-primary"
                    style={{
                        transform: on ? 'translateX(calc(100% * 8))' : 'translateX(0)',
                        transition: `transform 800ms var(${easing.cssVar})`
                    }}
                    aria-hidden
                />
            </button>
            <span className="text-2xs text-text-tertiary">Click to toggle</span>
        </div>
    );
}

export function EasingScale({easings}: {easings: Easing[]}) {
    return (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {easings.map(e => <EasingCard key={e.cssVar} easing={e} />)}
        </section>
    );
}

function AnimationCard({animation}: {animation: Animation}) {
    const [key, setKey] = useState(0);
    return (
        <div className="flex flex-col gap-3 rounded-md border border-border-default p-4">
            <div className="flex items-baseline justify-between gap-2">
                <code className="text-sm font-medium text-text-primary">{animation.name}</code>
                <code className="text-2xs text-text-secondary">{animation.cssVar}</code>
            </div>
            <button
                className="flex h-16 items-center justify-center overflow-hidden rounded-sm bg-muted"
                type="button"
                onClick={() => setKey(k => k + 1)}
            >
                <span
                    key={key}
                    className="inline-block rounded-sm bg-primary px-3 py-1.5 text-xs text-primary-foreground"
                    style={{animation: `var(${animation.cssVar})`}}
                    aria-hidden
                >
                    Play
                </span>
            </button>
            <span className="text-2xs text-text-tertiary">Click to replay</span>
        </div>
    );
}

export function AnimationGallery({animations}: {animations: Animation[]}) {
    return (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {animations.map(a => <AnimationCard key={a.cssVar} animation={a} />)}
        </section>
    );
}
