import {Moment} from 'moment-timezone';

export const formatQueryDate = (date: Moment) => {
    return date.format('YYYY-MM-DD');
};

export const formatDisplayDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    const isCurrentYear = date.getFullYear() === today.getFullYear();

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    if (isToday) {
        return `${day} ${month}`;
    }

    return isCurrentYear ? `${day} ${month}` : `${day} ${month} ${year}`;
};

export const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('en-US').format(Math.round(value));
};

export const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    if (hours <= 0) {
        if (minutes <= 0) {
            return `${remainingSeconds}s`;
        }
        return `${minutes}m ${remainingSeconds}s`;
    }

    return `${hours}h ${minutes}m ${remainingSeconds}s`;
};

export const formatPercentage = (value: number) => {
    return `${Math.round(value * 100)}%`;
};