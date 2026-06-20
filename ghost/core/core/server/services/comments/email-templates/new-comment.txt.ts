import type {ReadonlyDeep} from 'type-fest';

type NewCommentTextData = ReadonlyDeep<{
    postTitle: string;
    postUrl: string;
    siteDomain: string;
    toEmail: string;
    staffUrl: string;
}>;

export function renderText(data: NewCommentTextData): string {
    // Be careful when you indent the email, because whitespaces are visible in emails!
    return `
Hey there,

Someone just posted a comment on your post "${data.postTitle}"

${data.postUrl}

---

Sent to ${data.toEmail} from ${data.siteDomain}.
You can manage your notification preferences at ${data.staffUrl}.
    `;
}
