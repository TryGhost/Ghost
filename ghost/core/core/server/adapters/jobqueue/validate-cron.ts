import errors from '@tryghost/errors';

// @breejs/later accepts almost any string ("not a cron" parses to a schedule
// that fires immediately), so field validation has to be ours: a typo in a
// cron expression must throw at boot, not produce a job that fires at the
// wrong time and nothing notices. Covers the subset Ghost uses: `*`, numbers,
// ranges (9-17), lists (8,12) and steps (*/5, 3/5), 6 fields with seconds.
const FIELDS = [
    {name: 'second', min: 0, max: 59},
    {name: 'minute', min: 0, max: 59},
    {name: 'hour', min: 0, max: 23},
    {name: 'dayOfMonth', min: 1, max: 31},
    {name: 'month', min: 1, max: 12},
    {name: 'dayOfWeek', min: 0, max: 7}
];

export function validateCron(expression: string): void {
    const fields = expression.trim().split(/\s+/);

    if (fields.length !== FIELDS.length) {
        throw new errors.IncorrectUsageError({
            message: `Expected a 6-field cron expression, got "${expression}"`
        });
    }

    fields.forEach((field, i) => {
        const {name, min, max} = FIELDS[i];

        for (const part of field.split(',')) {
            const [rangePart, stepPart] = part.split('/');
            const hasStep = stepPart !== undefined;
            const step = hasStep ? Number(stepPart) : 1;

            if (hasStep && (!Number.isInteger(step) || step < 1)) {
                throw new errors.IncorrectUsageError({message: `Invalid step "${part}" in cron ${name} field`});
            }

            let lo;
            let hi;
            if (rangePart === '*') {
                lo = min;
                hi = max;
            } else if (rangePart.includes('-')) {
                const [a, b] = rangePart.split('-').map(Number);
                lo = a;
                hi = b;
            } else {
                lo = Number(rangePart);
                hi = hasStep ? max : lo;
            }

            if (!Number.isInteger(lo) || !Number.isInteger(hi) || lo < min || hi > max || lo > hi) {
                throw new errors.IncorrectUsageError({message: `Invalid value "${part}" in cron ${name} field (expected ${min}-${max})`});
            }
        }
    });
}
