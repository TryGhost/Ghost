type RateLimitState = {
    count: number;
    resetAt: number;
};

export type RateLimitResult = {
    allowed: boolean;
    retryAfterMs: number;
};

export const createRateLimiter = (maxAttempts: number, windowMs: number) => {
    const states = new Map<string, RateLimitState>();

    const check = (key: string): RateLimitResult => {
        const now = Date.now();
        const current = states.get(key);

        if (!current || current.resetAt <= now) {
            states.set(key, {count: 1, resetAt: now + windowMs});
            return {allowed: true, retryAfterMs: 0};
        }

        if (current.count >= maxAttempts) {
            return {allowed: false, retryAfterMs: current.resetAt - now};
        }

        current.count += 1;
        return {allowed: true, retryAfterMs: 0};
    };

    const reset = (key: string) => {
        states.delete(key);
    };

    return {
        check,
        reset
    };
};
