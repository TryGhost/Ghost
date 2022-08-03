export default function prettifyFileName(filename) {
    if (!filename || typeof filename !== 'string') {
        return '';
    }
    let updatedName = filename.split('.').slice(0, -1).join('.').replace(/[-_]/g,' ').replace(/[^\w\s]+/g,'').replace(/\s\s+/g, ' ');
    return updatedName.charAt(0).toUpperCase() + updatedName.slice(1);
}
