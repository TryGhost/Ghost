export function parseFakeWaitHoursMultiplier(value: unknown): number | null {
    if (typeof value !== 'number' && typeof value !== 'string') {
        return null;
    }

    const multiplier = Number(value);
    if (!Number.isSafeInteger(multiplier) || multiplier <= 0) {
        return null;
    }

    return multiplier;
}
