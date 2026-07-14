export const formatWait = (hours: number): string => {
    if (hours <= 0) {
        throw new Error('Wait time must be a positive number of hours.');
    }
    if (hours % 24 === 0) {
        const days = hours / 24;
        return days === 1 ? '1 day' : `${days} days`;
    }
    return hours === 1 ? '1 hour' : `${hours} hours`;
};
