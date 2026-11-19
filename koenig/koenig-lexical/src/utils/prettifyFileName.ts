export default function prettifyFileName(filename: string): string {
    if (!filename || typeof filename !== 'string') {
        return '';
    }
    const updatedName = filename.split('.').slice(0, -1).join('.').replace(/[-_]/g,' ').replace(/[^\w\s]+/g,'').replace(/\s\s+/g, ' ');
    return updatedName.charAt(0).toUpperCase() + updatedName.slice(1);
}
