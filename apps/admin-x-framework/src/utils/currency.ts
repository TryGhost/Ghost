/**
 * Currency symbol utility function
 * Converts a currency code to its symbol using Intl.NumberFormat
 */
export function getSymbol(currency: string): string {
    if (!currency) {
        return '';
    }
    return Intl.NumberFormat('en', {currency, style: 'currency'}).format(0).replace(/[\d\s.]/g, '');
} 