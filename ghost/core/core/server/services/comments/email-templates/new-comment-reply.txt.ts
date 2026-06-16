import type {ReadonlyDeep} from 'type-fest';

type Translate = (key: string, options?: ReadonlyDeep<Record<string, unknown>>) => string;

type NewCommentReplyTextData = ReadonlyDeep<{
    postTitle: string;
    postUrl: string;
    siteDomain: string;
    toEmail: string;
    profileUrl: string;
}>;

export function renderText(data: NewCommentReplyTextData, t: Translate): string {
    // Be careful when you indent the email, because whitespaces are visible in emails!
    return `${t('Hey there,')}

${t('Someone just replied to your comment on {postTitle}.', {postTitle: data.postTitle, interpolation: {escapeValue: false}})}

${data.postUrl}

---

${t('This message was sent from {siteDomain} to {email}.', {email: data.toEmail, siteDomain: data.siteDomain, interpolation: {escapeValue: false}})}
${t('You can unsubscribe from these notifications at {profileUrl}.', {profileUrl: data.profileUrl, interpolation: {escapeValue: false}})}`;
}
