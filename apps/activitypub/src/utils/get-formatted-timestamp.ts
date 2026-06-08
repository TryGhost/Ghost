export const getFormattedTimestamp = (date: Date): string => {
    const now = new Date();

    // Helper: strip time from a date
    const stripTime = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

    const today = stripTime(now);
    const yesterday = stripTime(new Date(now.getTime() - (24 * 60 * 60 * 1000)));

    const dateWithoutTime = stripTime(date);

    // If the date is today
    if (dateWithoutTime.getTime() === today.getTime()) {
        return getRelative(date);
    }

    // If the date is yesterday
    if (dateWithoutTime.getTime() === yesterday.getTime()) {
        return 'Yesterday';
    }

    // If older than yesterday, show absolute format
    return formatAbsoluteDate(date);
};

const getRelative = (date: Date): string => {
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 1) {
        return `Just now`;
    }
    if (seconds < 60) {
        return `${seconds}s`;
    }

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
        return `${minutes}m`;
    }

    const hours = Math.floor(minutes / 60);
    return `${hours}h`;
};

const formatAbsoluteDate = (date: Date): string => {
    const now = new Date();
    const day = date.getDate();
    const month = date.toLocaleString('default', {month: 'short'}); // e.g., Mar
    const isCurrentYear = date.getFullYear() === now.getFullYear();

    return isCurrentYear ? `${day} ${month}` : `${day} ${month} ${date.getFullYear()}`;
};

export default getFormattedTimestamp;
