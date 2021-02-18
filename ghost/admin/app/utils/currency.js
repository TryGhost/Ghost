export function getSymbol(currency) {
    switch (currency) {
    case 'usd':
    case 'aud':
    case 'cad':
        return '$';
    case 'eur':
        return '€';
    case 'gbp':
        return '£';
    case 'inr':
        return '₹';
    }
    return null;
}

export function getNonDecimal(amount, currency) {
    switch (currency) {
    case 'usd':
    case 'aud':
    case 'cad':
    case 'eur':
    case 'gbp':
    case 'inr':
        return amount / 100;
    }
    return null;
}
