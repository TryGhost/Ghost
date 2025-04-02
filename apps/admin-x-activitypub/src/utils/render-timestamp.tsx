import getFormattedTimestamp from './get-formatted-timestamp';
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

export function renderTimestamp(object: ObjectProperties, asLink = true) {
    const date = new Date(object?.published ?? new Date());
    const timestamp = formatTimestamp(date);
    const formattedTimestamp = getFormattedTimestamp(date);

    if (asLink) {
        return (
            <a
                className='whitespace-nowrap text-gray-700 hover:underline'
                href={object.url}
                rel='noreferrer'
                target='_blank'
                title={timestamp}
                onClick={e => e.stopPropagation()}
            >
                {formattedTimestamp}
            </a>
        );
    }

    return (
        <span className='whitespace-nowrap text-gray-700'>
            {formattedTimestamp}
        </span>
    );
}
