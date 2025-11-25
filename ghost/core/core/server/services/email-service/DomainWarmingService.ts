type LabsService = {
    isSet: (flag: string) => boolean;
};

type EmailModel = {
    findPage: (options: {filter: string; order: string; limit: number}) => Promise<{data: EmailRecord[]}>;
};

type EmailRecord = {
    get(field: 'csd_email_count'): number | null | undefined;
    get(field: string): unknown;
};

type WarmupScalingTable = {
    base: {
        limit: number;
        value: number;
    },
    thresholds: {
        limit: number;
        scale: number;
    }[];
    highVolume: {
        threshold: number;
        maxScale: number;
        maxAbsoluteIncrease: number;
    };
}

/**
 * Configuration for domain warming email volume scaling.
 *
 * | Volume Range | Multiplier                                       |
 * |--------------|--------------------------------------------------|
 * | ≤100 (base)  | 200 messages                                     |
 * | 101 – 1k     | 1.25× (conservative early ramp)                  |
 * | 1k – 5k      | 1.5× (moderate increase)                         |
 * | 5k – 100k    | 1.75× (faster ramp after proving deliverability) |
 * | 100k – 400k  | 2×                                               |
 * | 400k+        | min(1.2×, +75k) cap                              |
 */
const WARMUP_SCALING_TABLE: WarmupScalingTable = {
    base: {
        limit: 100,
        value: 200
    },
    thresholds: [{
        limit: 1_000,
        scale: 1.25
    }, {
        limit: 5_000,
        scale: 1.5
    }, {
        limit: 100_000,
        scale: 1.75
    }, {
        limit: 400_000,
        scale: 2
    }],
    highVolume: {
        threshold: 400_000,
        maxScale: 1.2,
        maxAbsoluteIncrease: 75_000
    }
};

export class DomainWarmingService {
    #emailModel: EmailModel;
    #labs: LabsService;

    constructor(dependencies: {
        models: {Email: EmailModel};
        labs: LabsService;
    }) {
        this.#emailModel = dependencies.models.Email;
        this.#labs = dependencies.labs;
    }

    /**
     * @returns Whether the domain warming feature is enabled
     */
    isEnabled(): boolean {
        return this.#labs.isSet('domainWarmup');
    }

    /**
     * Get the maximum amount of emails that should be sent from the warming sending domain in today's newsletter
     * @param emailCount The total number of emails to be sent in this newsletter
     * @returns The number of emails that should be sent from the warming sending domain (remaining emails to be sent from fallback domain)
     */
    async getWarmupLimit(emailCount: number): Promise<number> {
        const lastCount = await this.#getHighestCount();

        return Math.min(emailCount, this.#getTargetLimit(lastCount));
    }

    /**
     * @returns The highest number of messages sent from the CSD in a single email (excluding today)
     */
    async #getHighestCount(): Promise<number> {
        const result = await this.#emailModel.findPage({
            filter: `created_at:<${new Date().toISOString().split('T')[0]}`,
            order: 'csd_email_count DESC',
            limit: 1
        });

        if (!result.data.length) {
            return 0;
        }

        const count = result.data[0].get('csd_email_count');
        return count || 0;
    }

    /**
     * @param lastCount Highest number of messages sent from the CSD in a single email
     * @returns The limit for sending from the warming sending domain for the next email
     */
    #getTargetLimit(lastCount: number): number {
        if (lastCount <= WARMUP_SCALING_TABLE.base.limit) {
            return WARMUP_SCALING_TABLE.base.value;
        }

        // For high volume senders (400k+), cap the increase at 20% or 75k absolute
        if (lastCount > WARMUP_SCALING_TABLE.highVolume.threshold) {
            const scaledIncrease = Math.ceil(lastCount * WARMUP_SCALING_TABLE.highVolume.maxScale);
            const absoluteIncrease = lastCount + WARMUP_SCALING_TABLE.highVolume.maxAbsoluteIncrease;
            return Math.min(scaledIncrease, absoluteIncrease);
        }

        for (const threshold of WARMUP_SCALING_TABLE.thresholds.sort((a, b) => a.limit - b.limit)) {
            if (lastCount <= threshold.limit) {
                return Math.ceil(lastCount * threshold.scale);
            }
        }

        // This should not be reached given the thresholds cover all cases up to highVolume.threshold
        return Math.ceil(lastCount * WARMUP_SCALING_TABLE.highVolume.maxScale);
    }
}
