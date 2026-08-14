/* eslint-disable @typescript-eslint/no-explicit-any */
// Copied from ghost/core/core/frontend/helpers/url.js @ 407e032dc7 — transforms: imports→seam
// # URL helper
// Usage: `{{url}}`, `{{url absolute="true"}}`
//
// Returns the URL for the current object scope i.e. If inside a post scope will return post permalink
// `absolute` flag outputs absolute URL, else URL is relative

import * as metaData from '../meta/index.ts';
import {SafeString} from '../seam/handlebars-env.ts';
import {logging} from '../seam/shared.ts';
import errors from '@tryghost/errors';

const {getMetaDataUrl} = metaData;

export default function url(this: any, options: any) {
    const absolute = options && options.hash.absolute && options.hash.absolute !== 'false';
    let outputUrl = getMetaDataUrl(this, absolute);

    try {
        outputUrl = encodeURI(decodeURI(outputUrl)).replace(/%5B/g, '[').replace(/%5D/g, ']');
    } catch (err: any) {
        // Happens when the outputURL contains an invalid URI character like "%%" or "%80"

        // Send the error not to be blind to these
        const error = new errors.IncorrectUsageError({
            message: `The url "${outputUrl}" couldn't be escaped correctly`,
            err: err
        });
        logging.error(error);

        return new SafeString('');
    }

    return new SafeString(outputUrl);
}
