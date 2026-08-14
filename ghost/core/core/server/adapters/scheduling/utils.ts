import jwt, {type SignOptions} from 'jsonwebtoken'
import moment from 'moment'
import type {InternalApiKey} from '../../services/internal-keys'

type GetSignedAdminTokenOptions = {
    publishedAt: string
    apiUrl: string
    key: InternalApiKey
}

export function getSignedAdminToken({publishedAt, apiUrl, key}: GetSignedAdminTokenOptions): string {
    const opts: SignOptions = {
        keyid: key.id,
        algorithm: 'HS256',
        audience: apiUrl,
        noTimestamp: true
    };

    // Default token expiry is till 6 hours after scheduled time
    // or if published_at is in past then till 6 hours after blog start
    // to allow for retries in case of network issues
    // and never before 10 mins to publish time
    let tokenExpiry = moment(publishedAt).add(6, 'h');
    if (tokenExpiry.isBefore(moment())) {
        tokenExpiry = moment().add(6, 'h');
    }

    return jwt.sign(
        {
            exp: tokenExpiry.unix(),
            nbf: moment(publishedAt).subtract(10, 'm').unix(),
        },
        Buffer.from(key.secret, 'hex'),
        opts
    );
}
