import {SelectOptionGroup} from '@tryghost/admin-x-design-system';

type CurrencyOption = {
    isoCode: string;
    name: string;
};

export const currencies: CurrencyOption[] = [
    {isoCode: 'USD', name: 'United States dollar'},
    {isoCode: 'EUR', name: 'Euro'},
    {isoCode: 'GBP', name: 'Pound sterling'},
    {isoCode: 'AUD', name: 'Australian dollar'},
    {isoCode: 'CAD', name: 'Canadian dollar'},
    {isoCode: 'AED', name: 'United Arab Emirates dirham'},
    {isoCode: 'AFN', name: 'Afghan afghani'},
    {isoCode: 'ALL', name: 'Albanian lek'},
    {isoCode: 'AMD', name: 'Armenian dram'},
    {isoCode: 'ANG', name: 'Netherlands Antillean guilder'},
    {isoCode: 'AOA', name: 'Angolan kwanza'},
    {isoCode: 'ARS', name: 'Argentine peso'},
    {isoCode: 'AWG', name: 'Aruban florin'},
    {isoCode: 'AZN', name: 'Azerbaijani manat'},
    {isoCode: 'BAM', name: 'Bosnia and Herzegovina convertible mark'},
    {isoCode: 'BBD', name: 'Barbados dollar'},
    {isoCode: 'BDT', name: 'Bangladeshi taka'},
    {isoCode: 'BGN', name: 'Bulgarian lev'},
    {isoCode: 'BMD', name: 'Bermudian dollar'},
    {isoCode: 'BND', name: 'Brunei dollar'},
    {isoCode: 'BOB', name: 'Boliviano'},
    {isoCode: 'BRL', name: 'Brazilian real'},
    {isoCode: 'BSD', name: 'Bahamian dollar'},
    {isoCode: 'BWP', name: 'Botswana pula'},
    {isoCode: 'BZD', name: 'Belize dollar'},
    {isoCode: 'CDF', name: 'Congolese franc'},
    {isoCode: 'CHF', name: 'Swiss franc'},
    {isoCode: 'CNY', name: 'Chinese yuan'},
    {isoCode: 'COP', name: 'Colombian peso'},
    {isoCode: 'CRC', name: 'Costa Rican colon'},
    {isoCode: 'CVE', name: 'Cape Verdean escudo'},
    {isoCode: 'CZK', name: 'Czech koruna'},
    {isoCode: 'DKK', name: 'Danish krone'},
    {isoCode: 'DOP', name: 'Dominican peso'},
    {isoCode: 'DZD', name: 'Algerian dinar'},
    {isoCode: 'EGP', name: 'Egyptian pound'},
    {isoCode: 'ETB', name: 'Ethiopian birr'},
    {isoCode: 'FJD', name: 'Fiji dollar'},
    {isoCode: 'FKP', name: 'Falkland Islands pound'},
    {isoCode: 'GEL', name: 'Georgian lari'},
    {isoCode: 'GIP', name: 'Gibraltar pound'},
    {isoCode: 'GMD', name: 'Gambian dalasi'},
    {isoCode: 'GTQ', name: 'Guatemalan queztal'},
    {isoCode: 'GYD', name: 'Guyanese dollar'},
    {isoCode: 'HKD', name: 'Hong Kong dollar'},
    {isoCode: 'HNL', name: 'Honduran lempira'},
    {isoCode: 'HRK', name: 'Croation kuna'},
    {isoCode: 'HTG', name: 'Haitian gourde'},
    {isoCode: 'HUF', name: 'Hungarian forint'},
    {isoCode: 'IDR', name: 'Indonesian rupiah'},
    {isoCode: 'ILS', name: 'Israeli new shekel'},
    {isoCode: 'INR', name: 'Indian rupee'},
    {isoCode: 'ISK', name: 'Icelandic króna'},
    {isoCode: 'JMD', name: 'Jamaican dollar'},
    {isoCode: 'KES', name: 'Kenyan shilling'},
    {isoCode: 'KGS', name: 'Kyrgyzstani som'},
    {isoCode: 'KHR', name: 'Cambodian riel'},
    {isoCode: 'KYD', name: 'Cayman Islands dollar'},
    {isoCode: 'KZT', name: 'Kazakhstani tenge'},
    {isoCode: 'LAK', name: 'Lao kip'},
    {isoCode: 'LBP', name: 'Lebanese pound'},
    {isoCode: 'LKR', name: 'Sri Lankan rupee'},
    {isoCode: 'LRD', name: 'Liberian dollar'},
    {isoCode: 'LSL', name: 'Lesotho loti'},
    {isoCode: 'MAD', name: 'Moroccan dirham'},
    {isoCode: 'MDL', name: 'Moldovan leu'},
    {isoCode: 'MKD', name: 'Macedonian denar'},
    {isoCode: 'MMK', name: 'Myanmar kyat'},
    {isoCode: 'MNT', name: 'Mongolian tögrög'},
    {isoCode: 'MOP', name: 'Macanese pataca'},
    {isoCode: 'MRO', name: 'Mauritanian ouguiya'},
    {isoCode: 'MUR', name: 'Mauritian rupee'},
    {isoCode: 'MVR', name: 'Maldivian rufiyaa'},
    {isoCode: 'MWK', name: 'Malawian kwacha'},
    {isoCode: 'MXN', name: 'Mexican peso'},
    {isoCode: 'MYR', name: 'Malaysian ringgit'},
    {isoCode: 'MZN', name: 'Mozambican metical'},
    {isoCode: 'NAD', name: 'Namibian dollar'},
    {isoCode: 'NGN', name: 'Nigerian naira'},
    {isoCode: 'NIO', name: 'Nicaraguan córdoba'},
    {isoCode: 'NOK', name: 'Norwegian krone'},
    {isoCode: 'NPR', name: 'Nepalese rupee'},
    {isoCode: 'NZD', name: 'New Zealand dollar'},
    {isoCode: 'PAB', name: 'Panamanian balboa'},
    {isoCode: 'PEN', name: 'Peruvian sol'},
    {isoCode: 'PGK', name: 'Papua New Guinean kina'},
    {isoCode: 'PHP', name: 'Philippine peso'},
    {isoCode: 'PKR', name: 'Pakistani rupee'},
    {isoCode: 'PLN', name: 'Polish złoty'},
    {isoCode: 'QAR', name: 'Qatari riyal'},
    {isoCode: 'RON', name: 'Romanian leu'},
    {isoCode: 'RSD', name: 'Serbian dinar'},
    {isoCode: 'RUB', name: 'Russian ruble'},
    {isoCode: 'SAR', name: 'Saudi riyal'},
    {isoCode: 'SBD', name: 'Solomon Islands dollar'},
    {isoCode: 'SCR', name: 'Seychelles rupee'},
    {isoCode: 'SEK', name: 'Swedish krona'},
    {isoCode: 'SGD', name: 'Singapore dollar'},
    {isoCode: 'SHP', name: 'Saint Helena pound'},
    {isoCode: 'SLL', name: 'Sierra Leonean leone'},
    {isoCode: 'SOS', name: 'Somali shilling'},
    {isoCode: 'SRD', name: 'Surinamese dollar'},
    {isoCode: 'STD', name: 'São Tomé and Príncipe dobra'},
    {isoCode: 'SZL', name: 'Salvadoran colón'},
    {isoCode: 'THB', name: 'Thai baht'},
    {isoCode: 'TJS', name: 'Tajikistani somoni'},
    {isoCode: 'TOP', name: 'Tongan paʻanga'},
    {isoCode: 'TRY', name: 'Turkish lira'},
    {isoCode: 'TTD', name: 'Trinidad and Tobago dollar'},
    {isoCode: 'TWD', name: 'New Taiwan dollar'},
    {isoCode: 'TZS', name: 'Tanzanian shilling'},
    {isoCode: 'UAH', name: 'Ukrainian hryvnia'},
    {isoCode: 'UYU', name: 'Uruguayan peso'},
    {isoCode: 'UZS', name: 'Uzbekistan som'},
    {isoCode: 'WST', name: 'Samoan tala'},
    {isoCode: 'XCD', name: 'East Caribbean dollar'},
    {isoCode: 'YER', name: 'Yemeni rial'},
    {isoCode: 'ZAR', name: 'South African rand'},
    {isoCode: 'ZMW', name: 'Zambian kwacha'}
];

export function currencyGroups() {
    return {
        top: currencies.slice(0, 5),
        other: currencies.slice(5)
    };
}

export function currencySelectGroups({showName = false} = {}): SelectOptionGroup[] {
    return Object.values(currencyGroups()).map((group, index) => ({
        label: '—',
        key: index.toString(),
        options: group.map(({isoCode,name}) => ({
            value: isoCode,
            label: showName ? `${isoCode} - ${name}` : isoCode
        }))
    }));
}

export function getSymbol(currency: string): string {
    if (!currency) {
        return '';
    }
    return Intl.NumberFormat('en', {currency, style: 'currency'}).format(0).replace(/[\d\s.]/g, '');
}

// We currently only support decimal currencies
export function currencyToDecimal(integerAmount: number): number {
    return integerAmount / 100;
}

export function currencyFromDecimal(decimalAmount: number): number {
    return decimalAmount * 100;
}

/*
* Returns the minimum charge amount for a given currency,
* based on Stripe's requirements. Values here are double the Stripe limits, to take conversions to the settlement currency into account.
* @see https://stripe.com/docs/currencies#minimum-and-maximum-charge-amounts
*/
export function minimumAmountForCurrency(currency: string) {
    const isoCurrency = currency?.toUpperCase();

    switch (isoCurrency) {
    case 'AED':
        return 4;
    case 'BGN':
        return 2;
    case 'CZK':
        return 30;
    case 'DKK':
        return 5;
    case 'HKD':
        return 8;
    case 'HUF':
        return 250;
    case 'JPY':
        return 100;
    case 'MXN':
        return 20;
    case 'MYR':
        return 4;
    case 'NOK':
        return 6;
    case 'PLN':
        return 4;
    case 'RON':
        return 4;
    case 'SEK':
        return 6;
    case 'THB':
        return 20;
    default:
        return 1;
    }
}

export function validateCurrencyAmount(
    cents: number | undefined,
    currency: string | undefined,
    {allowZero = true, maxAmount}: {allowZero?: boolean; maxAmount?: number} = {}
) {
    if (cents === undefined || !currency) {
        return;
    }

    const symbol = getSymbol(currency);
    const minAmount = minimumAmountForCurrency(currency);

    if (!allowZero && cents === 0) {
        return `Amount must be at least ${symbol}${minAmount}.`;
    }

    if (cents !== 0 && cents < (minAmount * 100)) {
        return `Non-zero amount must be at least ${symbol}${minAmount}.`;
    }

    if (maxAmount && cents !== 0 && cents > (maxAmount * 100)) {
        return `Suggested amount cannot be more than ${symbol}${maxAmount}.`;
    }
}
