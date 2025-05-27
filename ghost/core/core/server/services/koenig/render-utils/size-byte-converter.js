export function sizeToBytes(size) {
    if (!size) {
        return 0;
    }
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const sizeParts = size.split(' ');
    const sizeNumber = parseFloat(sizeParts[0]);
    const sizeUnit = sizeParts[1];
    const sizeUnitIndex = sizes.indexOf(sizeUnit);
    if (sizeUnitIndex === -1) {
        return 0;
    }
    return Math.round(sizeNumber * Math.pow(1024, sizeUnitIndex));
}

export function bytesToSize(bytes) {
    if (!bytes) {
        return '0 Byte';
    }
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) {
        return '0 Byte';
    }
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round((bytes / Math.pow(1024, i))) + ' ' + sizes[i];
}