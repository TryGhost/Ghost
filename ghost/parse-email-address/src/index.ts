import {parseEmailAddress as upstreamParseEmailAddress} from 'parse-email-address';
import {domainToASCII} from 'node:url';

export const parseEmailAddress = (
    emailAddress: string
): null | { local: string; domain: string } => {
    const upstreamParsed = upstreamParseEmailAddress(emailAddress);
    if (!upstreamParsed) {
        return null;
    }

    const {user: local, domain: rawDomain} = upstreamParsed;

    const domain = domainToASCII(rawDomain);
    if (!domain) {
        return null;
    }

    return {local, domain};
};
