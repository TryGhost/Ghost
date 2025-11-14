type LabsService = {
    isSet: (flag: string) => boolean;
};

type EmailModel = {
    findOne: (options: {filter: string; order: string}) => Promise<EmailRecord | null>;
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
    defaultScale: number;
}

const WARMUP_SCALING_TABLE: WarmupScalingTable = {
    base: {
        limit: 100,
        value: 200
    },
    thresholds: [{
        limit: 100_000,
        scale: 2
    }, {
        limit: 400_000,
        scale: 1.5
    }],
    defaultScale: 1.25
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
        const email = await this.#emailModel.findOne({
            filter: `created_at:<${new Date().toISOString().split('T')[0]}`,
            order: 'csd_email_count DESC'
        });

        if (!email) {
            return 0;
        }

        const count = email.get('csd_email_count');
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

        for (const threshold of WARMUP_SCALING_TABLE.thresholds.sort((a, b) => a.limit - b.limit)) {
            if (lastCount <= threshold.limit) {
                return Math.ceil(lastCount * threshold.scale);
            }
        }

        return Math.ceil(lastCount * WARMUP_SCALING_TABLE.defaultScale);
    }
}
