export function resolveAsset(assetPath: string, relativeTo: string) {
    if (assetPath.match(/^(?:[a-z]+:)?\/\//i)) {
        return assetPath;
    }

    return `${relativeTo}${assetPath}`;
}

export function getLocalTime(timeZone: string) {
    const date = new Date();
    const options = {timeZone: timeZone};
    const userLocale = navigator.language.startsWith('en') ? navigator.language : 'en-US';
    const localTime = date.toLocaleString(userLocale, options);
    return localTime;
}

export function getOptionLabel(
    options: {value: string; label: string}[], value: string
): string | undefined {
    return options?.find(option => option.value === value)?.label;
}

export function numberWithCommas(x: number) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function isObjectId(value: string) {
    return /^[a-z0-9]{24}$/.test(value);
}
