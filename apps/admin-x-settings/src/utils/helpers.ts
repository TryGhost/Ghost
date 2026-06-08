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

export function getInitials(name: string = '') {
    let rgx = new RegExp(/([A-Za-z\u00C0-\u017F]{1})[A-Za-z\u00C0-\u017F]+/, 'g');
    let rgxInitials = [...name.matchAll(rgx)];

    const initials = (
        (rgxInitials.shift()?.[1] || '') + (rgxInitials.pop()?.[1] || '')
    ).toUpperCase();

    return initials;
}

export function generateAvatarColor(name: string) {
    const s = 70;
    const l = 40;
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    const h = hash % 360;
    return 'hsl(' + h + ', ' + s + '%, ' + l + '%)';
}

export function numberWithCommas(x: number) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function isObjectId(value: string) {
    return /^[a-z0-9]{24}$/.test(value);
}
