export function CharCountdown({value, max, label = 'Recommended'}: {
    value: string;
    max: number;
    label?: 'Recommended' | 'Maximum';
}) {
    const used = value.length;
    const over = used > max;

    return (
        <p className="mt-1 text-xs text-muted-foreground">
            {label}: <b>{max}</b> characters. You&rsquo;ve used{' '}
            <span className={over ? 'text-red-600' : undefined}>{used}</span>
        </p>
    );
}
