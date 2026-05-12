import {useComputedValue} from './use-computed-value';

type Breakpoint = {name: string; cssVar: string};

function BreakpointRow({breakpoint}: {breakpoint: Breakpoint}) {
    const value = useComputedValue(breakpoint.cssVar);
    return (
        <tr className="border-b border-border-subtle last:border-b-0">
            <td className="py-2 pr-6"><code className="text-sm font-medium text-text-primary">{breakpoint.name}</code></td>
            <td className="py-2 pr-6"><code className="text-2xs text-text-secondary">{breakpoint.cssVar}</code></td>
            <td className="py-2"><code className="text-2xs text-text-tertiary">{value || '—'}</code></td>
        </tr>
    );
}

export function BreakpointTable({breakpoints}: {breakpoints: Breakpoint[]}) {
    return (
        <table className="w-full text-left">
            <thead>
                <tr className="border-b border-border-default">
                    <th className="py-2 pr-6 text-xs font-semibold text-text-secondary">Name</th>
                    <th className="py-2 pr-6 text-xs font-semibold text-text-secondary">Variable</th>
                    <th className="py-2 text-xs font-semibold text-text-secondary">Value</th>
                </tr>
            </thead>
            <tbody>
                {breakpoints.map(b => <BreakpointRow key={b.cssVar} breakpoint={b} />)}
            </tbody>
        </table>
    );
}
