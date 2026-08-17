type MailgunSendResult = {
    id: string;
};

const isMailgunSendResult = (value: unknown): value is MailgunSendResult => {
    return typeof value === 'object' &&
        value !== null &&
        'id' in value &&
        typeof value.id === 'string';
};

const parseMailgunMessageId = (sendResult: unknown): string | undefined => {
    if (!isMailgunSendResult(sendResult)) {
        return undefined;
    }

    return sendResult.id;
};

export const normalizeMailgunMessageId = (mailgunMessageId: string): string => {
    return mailgunMessageId.trim().replace(/^<|>$/g, '');
};

export const getMailgunMessageId = (sendResult: unknown): string | undefined => {
    const mailgunMessageId = parseMailgunMessageId(sendResult);
    return mailgunMessageId === undefined ? undefined : normalizeMailgunMessageId(mailgunMessageId);
};
