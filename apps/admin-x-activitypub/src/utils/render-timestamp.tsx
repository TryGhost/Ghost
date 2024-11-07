import getRelativeTimestamp from './get-relative-timestamp';
import {ObjectProperties} from '@tryghost/admin-x-framework/api/activitypub';

export function formatTimestamp(date: Date): string {
    return new Date(date).toLocaleDateString('default', {
        year: 'numeric', 
        month: 'short', 
        day: '2-digit'
    }) + ', ' + new Date(date).toLocaleTimeString('default', {
        hour: '2-digit', 
        minute: '2-digit'
    });
}

export function renderTimestamp(object: ObjectProperties) {
    const date = new Date(object?.published ?? new Date());
    const timestamp = formatTimestamp(date);
    
    return (
        <a 
            className='whitespace-nowrap text-grey-700 hover:underline' 
            href={object.url} 
            title={timestamp}
        >
            {getRelativeTimestamp(date)}
        </a>
    );
} 