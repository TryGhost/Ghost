export const getRelativeTimestamp = (date: Date): string => {
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) {
        return `${interval}y`;
    }
  
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) {
        return `${interval}m`;
    }
  
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) {
        return `${interval}d`;
    }
  
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) {
        return `${interval}h`;
    }
  
    interval = Math.floor(seconds / 60);
    if (interval >= 1) {
        return `${interval}m`;
    }
  
    return `${seconds} seconds`;
};

export default getRelativeTimestamp;