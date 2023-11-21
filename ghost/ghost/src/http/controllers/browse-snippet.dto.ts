import ObjectID from 'bson-objectid';
import {Snippet} from '../../core/snippets/snippet.entity';
import {DateTime} from 'luxon';

const format = (date: Date, timezone: string): string => {
    // @NOTE: this formatting has to be double checked
    const momentISOCompatibleFormat = `yyyy-MM-dd'T'HH:mm:ss'.000Z'`;
    const formatted = DateTime
        .fromJSDate(date)
        .setZone(timezone)
        .toFormat(momentISOCompatibleFormat);

    if (formatted === null) {
        // @NOTE: this should be through through and use ghost/errors if we want an error here
        throw new Error('Failed to format date');
    }

    return formatted;
};

export class BrowseSnippetDTO {
    id: ObjectID;
    name: string;
    lexical?: string|null;
    mobiledoc?: string|null;
    created_at: string;
    updated_at: string|null;

    constructor(data: Snippet, options: {timezone: string, formats?: 'mobiledoc'|'lexical'}) {
        this.id = data.id;
        this.name = data.name;

        if (options.formats === 'lexical') {
            this.lexical = data.lexical;
        } else {
            this.mobiledoc = data.mobiledoc;
        }

        this.created_at = format(data.createdAt, options.timezone);
        this.updated_at = data.updatedAt ? format(data.updatedAt, options.timezone) : null;
    }
}
