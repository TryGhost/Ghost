import {currencySelectGroups} from '@/settings/app/utils/currency';
import {z} from 'zod';

const DEFAULT_DONATIONS_CURRENCY = 'USD';
const DEFAULT_DONATIONS_SUGGESTED_AMOUNT = 500;

const supportedCurrencies = new Set(
    currencySelectGroups().flatMap(group => group.options.map(option => option.value))
);

const donationsCurrencySchema = z.string()
    .refine(currency => supportedCurrencies.has(currency));

const donationsSuggestedAmountNumberSchema = z.number()
    .finite()
    .int()
    .nonnegative()
    .max(Number.MAX_SAFE_INTEGER);

const donationsSuggestedAmountSchema = z.union([
    donationsSuggestedAmountNumberSchema,
    z.string()
        .regex(/^\d+$/)
        .transform(Number)
        .pipe(donationsSuggestedAmountNumberSchema)
]);

export const tipsAndDonationsSettingsSchema = z.object({
    donations_currency: donationsCurrencySchema.default(DEFAULT_DONATIONS_CURRENCY),
    donations_suggested_amount: donationsSuggestedAmountSchema.default(DEFAULT_DONATIONS_SUGGESTED_AMOUNT)
});

export type TipsAndDonationsSettings = z.infer<typeof tipsAndDonationsSettingsSchema>;

export const parseTipsAndDonationsSettings = (settings: unknown): TipsAndDonationsSettings => tipsAndDonationsSettingsSchema.parse(settings);
