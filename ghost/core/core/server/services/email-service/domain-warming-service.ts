type ConfigService = {
    get: (key: string) => string | undefined;
}

type EmailModel = {
    findPage: (options: {filter: string; order: string; limit: number}) => Promise<{data: EmailRecord[]}>;
};

type EmailRecord = {
    get(field: 'csd_email_count'): number | null | undefined;
    get(field: string): unknown;
};

type WarmupVolumeOptions = {
    start: number;
    end: number;
    totalDays: number;
};

const DefaultWarmupOptions: WarmupVolumeOptions = {
    start: 200,
    end: 200000,
    totalDays: 42
};

export class DomainWarmingService {
    #emailModel: EmailModel;
    #config: ConfigService;
    #warmupConfig: WarmupVolumeOptions;

    constructor(dependencies: {
        models: {Email: EmailModel};
        config: ConfigService;
    }) {
        this.#emailModel = dependencies.models.Email;
        this.#config = dependencies.config;

        this.#warmupConfig = DefaultWarmupOptions;
    }

    /**
     * @returns Whether the domain warming feature is enabled
     */
    isEnabled(): boolean {
        const fallbackDomain = this.#config.get('hostSettings:managedEmail:fallbackDomain');
        const fallbackAddress = this.#config.get('hostSettings:managedEmail:fallbackAddress');

        return Boolean(fallbackDomain && fallbackAddress);
    }

    async #getDaysSinceFirstEmail(): Promise<number> {
        const res = await this.#emailModel.findPage({
            filter: 'csd_email_count:-null',
            order: 'created_at ASC',
            limit: 1
        });

        if (!res.data.length) {
            return 0;
        }

        return Math.floor((Date.now() - new Date(res.data[0].get('created_at') as string).getTime()) / (1000 * 60 * 60 * 24));
    }

    /**
     * Get the maximum amount of emails that should be sent from the warming sending domain in today's newsletter
     * @param emailCount The total number of emails to be sent in this newsletter
     * @returns The number of emails that should be sent from the warming sending domain (remaining emails to be sent from fallback domain)
     */
    async getWarmupLimit(emailCount: number): Promise<number> {
        const day = await this.#getDaysSinceFirstEmail();
        if (day >= this.#warmupConfig.totalDays) {
            return Infinity;
        }

        const limit = Math.round(
            this.#warmupConfig.start *
            Math.pow(
                this.#warmupConfig.end / this.#warmupConfig.start,
                day / (this.#warmupConfig.totalDays - 1)
            )
        );

        return Math.min(emailCount, limit);
    }
}
